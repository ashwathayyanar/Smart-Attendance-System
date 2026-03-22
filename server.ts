import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Prisma
// It will automatically connect using the DATABASE_URL in Vercel's Environment Variables
const prisma = new PrismaClient();

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
  app.post('/api/students', async (req, res) => {
    console.log("Received POST /api/students");
    try {
      // We map 'class' from req.body to 'className' because 'class' is a reserved word
      const { studentId, fullName, class: className, section, mobile, faceData } = req.body;

      // Save to the real database using Prisma
      const newStudent = await prisma.student.create({
        data: {
          studentId,
          fullName,
          className,
          section,
          mobile,
          faceData 
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
      
      // Prevent duplicates: Check if attendance already exists for this student today
      const existingRecord = await prisma.attendance.findFirst({
        where: {
          studentId: studentId,
          date: date
        }
      });
      
      if (!existingRecord) {
        // Create new record in database
        const newRecord = await prisma.attendance.create({
          data: { studentId, name, date, time, status }
        });
        res.json(newRecord);
      } else {
        // Return existing record if already marked present today
        res.json(existingRecord);
      }
    } catch (error) {
      console.error("Error saving attendance to database:", error);
      res.status(500).json({ error: 'Failed to save attendance' });
    }
  });

  // --- Vite / Frontend Rendering ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
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