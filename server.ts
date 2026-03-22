import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// NOTICE: We completely removed the Vite import from the top of the file!

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Prisma
// Initialize Prisma
// Initialize Prisma 7 with the PostgreSQL Adapter
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
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

  // --- API Routes using Prisma Database ---

  // GET all students
  app.get('/api/students', async (req, res) => {
    try {
      const students = await prisma.student.findMany();
      res.json(students);
    } catch (error) {
      console.error("Error reading students from database:", error);
      res.status(500).json({ error: 'Failed to read students' });
    }
  });

  // POST a new student
  // POST a new student
  app.post('/api/students', async (req, res) => {
    // This will print EXACTLY what the frontend sends into your Vercel logs
    console.log("Received POST /api/students. Frontend sent:", req.body); 
    
    try {
      // Look for the data using multiple common names your frontend might be using
      const studentId = req.body.studentId || req.body.id || req.body.student_id;
      const fullName = req.body.fullName || req.body.name || req.body.studentName;
      const className = req.body.class || req.body.className || req.body.course || "N/A";
      const section = req.body.section || "N/A";
      const mobile = req.body.mobile || req.body.phone || "N/A";
      const faceData = req.body.faceData || req.body.image || req.body.photo || req.body.faceDescriptor;

      // Make sure we at least have the absolute necessities
      if (!studentId || !fullName || !faceData) {
        console.error("Missing critical data! We extracted:", { studentId, fullName, faceData });
        return res.status(400).json({ error: 'Frontend is missing required fields.' });
      }

      // Save to the real database using Prisma
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
      console.error("Error saving student to database:", error);
      res.status(500).json({ error: 'Failed to save student' });
    }
  });

  // GET all attendance records
  app.get('/api/attendance', async (req, res) => {
    try {
      const records = await prisma.attendance.findMany();
      res.json(records);
    } catch (error) {
      console.error("Error reading attendance from database:", error);
      res.status(500).json({ error: 'Failed to read attendance' });
    }
  });

  // POST a new attendance record
  app.post('/api/attendance', async (req, res) => {
    console.log("Received POST /api/attendance");
    try {
      const { studentId, name, date, time, status } = req.body;
      
      const existingRecord = await prisma.attendance.findFirst({
        where: {
          studentId: studentId,
          date: date
        }
      });
      
      if (!existingRecord) {
        const newRecord = await prisma.attendance.create({
          data: { studentId, name, date, time, status }
        });
        res.json(newRecord);
      } else {
        res.json(existingRecord);
      }
    } catch (error) {
      console.error("Error saving attendance to database:", error);
      res.status(500).json({ error: 'Failed to save attendance' });
    }
  });

  // --- Vite / Frontend Rendering ---
  if (process.env.NODE_ENV !== 'production') {
    // We use a "Dynamic Import" trick here so Vercel ignores this entirely
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