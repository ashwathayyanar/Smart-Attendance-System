import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');

try {
  const data = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf-8'));
  console.log("Read success:", data);
  data.push({ test: true });
  fs.writeFileSync(STUDENTS_FILE, JSON.stringify(data, null, 2));
  console.log("Write success");
} catch (e) {
  console.error("Error:", e);
}
