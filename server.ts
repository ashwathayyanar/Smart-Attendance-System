import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg'; // Added for the connection pool

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. SMART DATABASE INITIALIZATION ---

// Get the URL from Vercel's environment
let dbUrl = process.env.DATABASE_URL || "";

// Automatically attach the SSL fix if it's missing (bypasses Vercel lock)
if (dbUrl && !dbUrl.includes('sslmode=')) {
  const separator = dbUrl.includes('?') ? '&' : '?';
  dbUrl += `${separator}sslmode=verify-full`;
}
// Initialize the connection pool and Prisma 7 adapter
const pool = new pg.Pool({ connectionString: dbUrl });

// We use 'as any' here to bypass a minor TypeScript version mismatch 
// between the 'pg' library and the Prisma adapter.
const adapter = new PrismaPg(pool as any); 

const prisma = new PrismaClient({ adapter });

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Allow large payloads for Base64 face data images
  app.use(express.json({ limit: '50mb' }));

  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
  });

  // --- 2. API ROUTES ---

  // GET all students (Formatted for AI Face Matching)
  app.get('/api/students', async (req, res) => {
    try {
      const students = await prisma.student.findMany();
      
      const frontendReadyStudents = students.map(student => {
        let numericDescriptors = [];
        
        try {
          // Convert the text data from the database back into numbers for the AI
          const parsed = JSON.parse(student.faceData);
          if (Array.isArray(parsed)) {
            numericDescriptors = parsed.map(Number);
          } else if (parsed && parsed.descriptors) {
            numericDescriptors = Array.from(parsed.descriptors[0]).map(Number);
          }
        } catch (e) {
          console.error("Could not parse face data for student:", student.studentId);
        }

        return {
          ...student,
          id: student.studentId,
          name: student.fullName,
          // We provide the data in every format the AI library might look for
          descriptors: numericDescriptors.length > 0 ? [numericDescriptors] : [],
          faceDescriptor: numericDescriptors,
          faceData: numericDescriptors
        };
      });

      res.json(frontendReadyStudents);
    } catch (error) {
      console.error("Error reading students:", error);
      res.status(500).json({ error: 'Failed to read students' });
    }
  });

  // POST a new student (Registration)
  app.post('/api/students', async (req, res) => {
    console.log("Received POST /api/students. Frontend sent:", req.body); 
    try {
      const studentId = req.body.studentId || req.body.id || req.body.student_id;
      const fullName = req.body.fullName || req.body.name || req.body.studentName;
      const className = req.body.class || req.body.className || req.body.course || "N/A";
      const section = req.body.section || "N/A";
      const mobile = req.body.mobile || req.body.phone || "N/A";
      const faceData = req.body.faceData || req.body.image || req.body.photo || req.body.faceDescriptor;

      if (!studentId || !fullName || !faceData) {
        return res.status(400).json({ error: 'Missing critical data!' });
      }

      const newStudent = await prisma.student.create({
        data: {
          studentId: String(studentId),
          fullName: String(fullName),
          className: String(className),
          section: String(section),
          mobile: String(mobile),
          faceData: String(faceData) 
        }
      });

      res.json(newStudent);
    } catch (error) {
      console.error("Error saving student:", error);
      res.status(500).json({ error: 'Failed to save student' });
    }
  });

  // GET all attendance records
  app.get('/api/attendance', async (req, res) => {
    try {
      const records = await prisma.attendance.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(records);
    } catch (error) {
      console.error("Error reading attendance:", error);
      res.status(500).json({ error: 'Failed to read attendance' });
    }
  });

  // POST a new attendance record (Capture)
  app.post('/api/attendance', async (req, res) => {
    console.log("ATTENDANCE DEBUG - Full Request Body:", JSON.stringify(req.body, null, 2));
    try {
      const studentId = String(req.body.studentId || req.body.id || req.body.uid || "");
      const name = String(req.body.name || req.body.fullName || req.body.studentName || req.body.label || "Unknown Student");
      
      const now = new Date();
      const date = req.body.date || now.toISOString().split('T')[0];
      const time = req.body.time || now.toTimeString().split(' ')[0];
      const status = req.body.status || "Present";

      if (!studentId) {
        return res.status(400).json({ error: 'No Student ID found in request' });
      }

      const existingRecord = await prisma.attendance.findFirst({
        where: { studentId: String(studentId), date: date }
      });
      
      if (!existingRecord) {
        const newRecord = await prisma.attendance.create({
          data: { studentId: String(studentId), name: String(name), date, time, status }
        });
        console.log(`✅ Success: Attendance marked for ${name}`);
        res.json(newRecord);
      } else {
        res.json(existingRecord); 
      }
    } catch (error) {
      console.error("❌ ATTENDANCE ERROR:", error);
      res.status(500).json({ error: 'Failed to save attendance' });
    }
  });

  // DELETE all attendance records (Wipe for next day)
app.delete('/api/attendance', async (req, res) => {
  try {
    await prisma.attendance.deleteMany();
    res.json({ message: 'Attendance logs cleared successfully' });
  } catch (error) {
    console.error("Error clearing attendance:", error);
    res.status(500).json({ error: 'Failed to clear attendance' });
  }
});

  // --- 3. FRONTEND SERVING / VITE ---
  if (process.env.NODE_ENV !== 'production') {
    const vitePkg = 'vite';
    const vite = await import(vitePkg);
    const viteServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();