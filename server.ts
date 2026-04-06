import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. SMART DATABASE INITIALIZATION ---
let dbUrl = process.env.DATABASE_URL || "";

if (dbUrl && !dbUrl.includes('sslmode=')) {
  const separator = dbUrl.includes('?') ? '&' : '?';
  dbUrl += `${separator}sslmode=verify-full`;
}

const pool = new pg.Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool as any); 
const prisma = new PrismaClient({ adapter });

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  // Request Logger
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
  });

  // --- 2. API ROUTES ---

  /**
   * DAILY MAINTENANCE CRON (10:00 AM IST)
   * Timezone-Aware: Logic forced to Asia/Kolkata
   */
  app.get('/api/automation/daily-maintenance', async (req, res) => {
    // FORCE IST DATE (YYYY-MM-DD)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const dayOfWeek = new Date().getDay(); // Local day check

    if (dayOfWeek === 0 || dayOfWeek === 6) return res.json({ message: "Weekend skip" });

    try {
      console.log(`🧹 Step 1: Purging logs that are NOT ${today}...`);
      
      // Atomic Cleanup: Deletes everything from "yesterday"
      const deleted = await prisma.attendance.deleteMany({
        where: {
          date: { not: today }
        }
      });

      console.log(`🚀 Step 2: Running 10:00 AM Absentee Sweep for ${today}...`);
      const [allStudents, presentToday] = await Promise.all([
        prisma.student.findMany(),
        prisma.attendance.findMany({ where: { date: today, status: 'Present' } })
      ]);

      const presentIds = presentToday.map(p => p.studentId);
      const absentees = allStudents.filter(s => !presentIds.includes(s.studentId));

      for (const student of absentees) {
        const phone = (student.mobile || "").replace(/\D/g, '').slice(-10);
        if (phone.length === 10) {
          const message = `Attendance Alert: Dear Parents, Student ${student.fullName} (ID: ${student.studentId}) was recorded ABSENT today.`;
          const smsUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${process.env.SMS_API_KEY}&route=q&message=${encodeURIComponent(message)}&numbers=${phone}`;
          await fetch(smsUrl);
        }
      }

      res.json({ 
        success: true, 
        timezone: "Asia/Kolkata",
        todayString: today,
        oldLogsCleared: deleted.count,
        smsDispatched: absentees.length 
      });

    } catch (error) {
      console.error("Maintenance Error:", error);
      res.status(500).json({ error: "System maintenance failed" });
    }
  });

  /**
   * MANUAL SMS ALERT ROUTE
   */
  app.post('/api/manual-sms', async (req, res) => {
    const { studentId } = req.body;
    try {
      const student = await prisma.student.findFirst({ where: { studentId: String(studentId) } });
      if (!student) return res.status(404).json({ error: 'Identity not found' });

      const phone = (student.mobile || "").replace(/\D/g, '').slice(-10);
      const message = `Attendance Alert: Dear Parents, Student ${student.fullName} (ID: ${student.studentId}) was recorded ABSENT today.`;
      const smsUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${process.env.SMS_API_KEY}&route=q&message=${encodeURIComponent(message)}&numbers=${phone}`;

      const smsResponse = await fetch(smsUrl);
      const smsResult = await smsResponse.json();

      if (smsResult.return === true) res.json({ success: true });
      else res.status(500).json({ error: 'Gateway failed', details: smsResult.message });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET all students
  app.get('/api/students', async (req, res) => {
    try {
      const students = await prisma.student.findMany();
      const frontendReadyStudents = students.map(student => {
        let numericDescriptors: number[] = []; 
        try {
          const parsed = JSON.parse(student.faceData);
          if (Array.isArray(parsed)) numericDescriptors = parsed.map(Number);
          else if (parsed && parsed.descriptors) numericDescriptors = Array.from(parsed.descriptors[0]).map(Number);
        } catch (e) {}
        return {
          ...student,
          id: student.studentId,
          name: student.fullName,
          descriptors: numericDescriptors.length > 0 ? [numericDescriptors] : [],
          faceDescriptor: numericDescriptors,
          faceData: numericDescriptors
        };
      });
      res.json(frontendReadyStudents);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read students' });
    }
  });

  // POST a new student
  app.post('/api/students', async (req, res) => {
    try {
      const { studentId, fullName, className, section, mobile, faceData } = req.body;
      const newStudent = await prisma.student.create({
        data: {
          studentId: String(studentId || req.body.id),
          fullName: String(fullName || req.body.name),
          className: String(className || "N/A"),
          section: String(section || "N/A"),
          mobile: String(mobile || "N/A"),
          faceData: String(faceData) 
        }
      });
      res.json(newStudent);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save student' });
    }
  });

  /**
   * SMART GET: ENRICHED ATTENDANCE
   */
  app.get('/api/attendance', async (req, res) => {
    try {
      const [records, students] = await Promise.all([
        prisma.attendance.findMany({ orderBy: { createdAt: 'desc' } }),
        prisma.student.findMany()
      ]);

      const enrichedRecords = records.map(record => {
        const studentData = students.find(s => s.studentId === record.studentId);
        return {
          ...record,
          className: studentData?.className || "N/A",
          section: studentData?.section || "-"
        };
      });
      res.json(enrichedRecords);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read logs' });
    }
  });

  // POST a new attendance record
  app.post('/api/attendance', async (req, res) => {
    try {
      const { studentId, name, date, time, status, emotion, confidence } = req.body;
      const now = new Date();
      // Use IST for default date if not provided
      const istDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const attendanceDate = date || istDate;
      
      const existingRecord = await prisma.attendance.findFirst({
        where: { studentId: String(studentId), date: attendanceDate }
      });
      
      if (!existingRecord) {
        const newRecord = await prisma.attendance.create({
          data: { 
            studentId: String(studentId), 
            name: String(name), 
            date: attendanceDate, 
            time: time || now.toTimeString().split(' ')[0], 
            status: status || "Present",
            emotion: emotion || "Neutral",
            confidence: confidence || 1
          }
        });
        res.json(newRecord);
      } else {
        res.json(existingRecord); 
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to save attendance' });
    }
  });

  // DELETE routes
  app.delete('/api/attendance', async (req, res) => {
    try {
      await prisma.attendance.deleteMany();
      res.json({ message: 'Cleared' });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  app.delete('/api/students/:id', async (req, res) => {
    try {
      await prisma.student.delete({ where: { studentId: req.params.id } });
      res.json({ message: 'Deleted' });
    } catch (e) {
      res.status(500).json({ error: 'Failed' });
    }
  });

  // --- 3. FRONTEND SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await import('vite');
    const viteServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Smart System Online (IST-Aware) on port ${PORT}`);
  });
}

startServer();