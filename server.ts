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
   * MANUAL SMS ALERT ROUTE
   * Switched back to 'route=q' for standard text messaging
   */
  app.post('/api/manual-sms', async (req, res) => {
    const { studentId } = req.body;
    console.log(`[SMS] Attempting alert for ID: ${studentId}`);
    
    try {
      // Find the student in the database
      const student = await prisma.student.findFirst({
        where: {
          studentId: String(studentId)
        }
      });

      if (!student) {
        console.error(`[SMS] Blocked: ID ${studentId} not found.`);
        return res.status(404).json({ error: 'Student not registered' });
      }

      // Safety: Format for Fast2SMS (10 digits)
      const rawMobile = student.mobile || "";
      const phone = rawMobile.replace(/\D/g, '').slice(-10);

      if (phone.length !== 10) {
        return res.status(400).json({ error: 'Invalid mobile number' });
      }

      // Quick SMS (route=q) allows full descriptive messages
      const message = `Attendance Alert :Dear Parents Student ${student.fullName} (ID: ${student.studentId}) was recorded ABSENT today.`;
      
      // Using 'route=q' and 'message' parameter instead of variables_values
      const smsUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${process.env.SMS_API_KEY}&route=q&message=${encodeURIComponent(message)}&numbers=${phone}`;      
      
      console.log(`[SMS] Dispatching Quick SMS to: ${phone}`);

      const smsResponse = await fetch(smsUrl);
      const smsResult = await smsResponse.json();

      if (smsResult.return === true) {
        console.log(`✅ [SMS] Success: Request accepted for ${student.fullName}`);
        res.json({ success: true, message: 'Alert dispatched' });
      } else {
        console.error("[SMS] Gateway Refused:", smsResult);
        // We send the specific gateway error back to the frontend so you can see it
        res.status(500).json({ error: 'Gateway failed', details: smsResult.message || 'Check balance/route' });
      }
    } catch (error: any) {
      console.error("--- CRITICAL SMS ROUTE ERROR ---");
      console.error(error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  app.get('/api/automation/daily-check', async (req, res) => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday

  // Lock 2: Manual Weekend Skip
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    console.log("🛑 Weekend detected. Automation standby.");
    return res.json({ message: "System idle: Weekends excluded." });
  }

  console.log("🚀 Weekday detected. Starting 10:00 AM Absentee Sweep...");

  try {
    const today = now.toISOString().split('T')[0];

    // 1. Fetch All Students and Daily Attendance
    const [allStudents, presentToday] = await Promise.all([
      prisma.student.findMany(),
      prisma.attendance.findMany({ where: { date: today, status: 'Present' } })
    ]);

    const presentIds = presentToday.map(p => p.studentId);
    const absentees = allStudents.filter(s => !presentIds.includes(s.studentId));

    // 2. Dispatch Alerts
    for (const student of absentees) {
      const phone = (student.mobile || "").replace(/\D/g, '').slice(-10);
      
      if (phone.length === 10) {
        // Professional SMS Body
        const message = `ATTENDANCE ALERT: Dear Parents ${student.fullName} (ID:${student.studentId}) is recorded ABSENT today.`;
        
        const smsUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${process.env.SMS_API_KEY}&route=q&message=${encodeURIComponent(message)}&numbers=${phone}`;
        
        await fetch(smsUrl);
        console.log(`✅ Automated alert sent: ${student.fullName}`);
      }
    }

    res.json({ 
      status: "Success", 
      absenteesNotified: absentees.length,
      timestamp: now.toLocaleString() 
    });

  } catch (error) {
    console.error("Critical Automation Error:", error);
    res.status(500).json({ error: "System failure during daily sweep." });
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
          if (Array.isArray(parsed)) {
            numericDescriptors = parsed.map(Number);
          } else if (parsed && parsed.descriptors) {
            numericDescriptors = Array.from(parsed.descriptors[0]).map(Number);
          }
        } catch (e) {
          console.error("Parse error for:", student.studentId);
        }
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

  // GET all attendance
  app.get('/api/attendance', async (req, res) => {
    try {
      const records = await prisma.attendance.findMany({ orderBy: { createdAt: 'desc' } });
      res.json(records);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read attendance' });
    }
  });

  // POST a new attendance record
  app.post('/api/attendance', async (req, res) => {
    try {
      const { studentId, name, date, time, status } = req.body;
      const now = new Date();
      const attendanceDate = date || now.toISOString().split('T')[0];
      
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
            status: status || "Present" 
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
    console.log(`🚀 Smart System Online on port ${PORT}`);
  });
}

startServer();