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
      
      const frontendReadyStudents = students.map(student => {
        // We convert the faceData string back into an object/array if it was stored that way
        let parsedFaceData = student.faceData;
        try {
          parsedFaceData = JSON.parse(student.faceData);
        } catch (e) {
          // If it's not JSON, keep it as a string
        }

        return {
          ...student,
          id: student.studentId,
          studentId: student.studentId,
          name: student.fullName,
          fullName: student.fullName,
          // We provide the face data under every possible name the AI model might look for
          faceData: parsedFaceData,
          faceDescriptor: parsedFaceData,
          descriptors: parsedFaceData ? [parsedFaceData] : [],
          class: student.className,
          className: student.className
        };
      });

      res.json(frontendReadyStudents);
    } catch (error) {
      console.error("Error reading students:", error);
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
    // DEBUG: This will show us the EXACT labels the frontend is using in Vercel Logs
    console.log("ATTENDANCE DEBUG - Full Request Body:", JSON.stringify(req.body, null, 2));

    try {
      // 1. Extract the ID using every possible label
      const studentId = req.body.studentId || req.body.id || req.body.uid || req.body.rollNo;
      
      // 2. Extract the Name using every possible label
      const name = req.body.name || req.body.fullName || req.body.studentName || req.body.label || "Unknown Student";
      
      // 3. Handle Date and Time automatically if missing
      const now = new Date();
      const date = req.body.date || now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const time = req.body.time || now.toTimeString().split(' ')[0]; // Format: HH:MM:SS
      const status = req.body.status || "Present";

      // Validation check
      if (!studentId) {
        console.error("ATTENDANCE ERROR: No student identifier found in the request.");
        return res.status(400).json({ error: 'Backend could not find a Student ID in the request.' });
      }

      // Convert to String to match Prisma Schema exactly
      const sId = String(studentId);
      const sName = String(name);

      // 4. Check if attendance already exists for this student today
      const existingRecord = await prisma.attendance.findFirst({
        where: {
          studentId: sId,
          date: date
        }
      });
      
      if (!existingRecord) {
        // Create the new record
        const newRecord = await prisma.attendance.create({
          data: { 
            studentId: sId, 
            name: sName, 
            date: date, 
            time: time, 
            status: status 
          }
        });
        console.log(`✅ Success: Attendance marked for ${sName} (${sId})`);
        res.json(newRecord);
      } else {
        console.log(`ℹ️ Info: ${sName} already marked present for today.`);
        res.json(existingRecord); 
      }
    } catch (error) {
      console.error("❌ CRITICAL ATTENDANCE ERROR:", error);
      res.status(500).json({ error: 'Database failed to save attendance record.' });
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