import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Initialize files if they don't exist
if (!fs.existsSync(STUDENTS_FILE)) {
  fs.writeFileSync(STUDENTS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(ATTENDANCE_FILE)) {
  fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify([]));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
  });

  // API Routes
  app.get('/api/students', (req, res) => {
    try {
      const students = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf-8'));
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read students' });
    }
  });

  app.post('/api/students', (req, res) => {
    console.log("Received POST /api/students", req.body);
    try {
      const students = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf-8'));
      const newStudent = req.body;
      students.push(newStudent);
      fs.writeFileSync(STUDENTS_FILE, JSON.stringify(students, null, 2));
      res.json(newStudent);
    } catch (error) {
      console.error("Error saving student:", error);
      res.status(500).json({ error: 'Failed to save student' });
    }
  });

  app.get('/api/attendance', (req, res) => {
    try {
      const attendance = JSON.parse(fs.readFileSync(ATTENDANCE_FILE, 'utf-8'));
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to read attendance' });
    }
  });

  app.post('/api/attendance', (req, res) => {
    try {
      const attendance = JSON.parse(fs.readFileSync(ATTENDANCE_FILE, 'utf-8'));
      const newRecord = req.body;
      
      // Prevent duplicates for same student on same day (unless specific logic needed)
      const today = new Date().toISOString().split('T')[0];
      const exists = attendance.some((r: any) => r.studentId === newRecord.studentId && r.name === newRecord.name && r.date === today);
      
      if (!exists) {
        attendance.push(newRecord);
        fs.writeFileSync(ATTENDANCE_FILE, JSON.stringify(attendance, null, 2));
      }
      res.json(newRecord);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save attendance' });
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
