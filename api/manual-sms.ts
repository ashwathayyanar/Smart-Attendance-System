// api/manual-sms.ts
import { PrismaClient } from '@prisma/client';
import { sendManualAlert } from '../src/services/smsService';

const prisma = new PrismaClient();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();
  const { studentId } = req.body;

  try {
    // Try to find by 'id' OR 'studentId' just in case
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: studentId },
          { studentId: studentId }
        ]
      }
    });

    if (!student) {
      console.error("DEBUG: Student not found for ID:", studentId);
      return res.status(404).json({ message: 'Student not found in DB' });
    }

    const success = await sendManualAlert(student);
    if (success) return res.status(200).json({ message: 'Sent' });
    
    return res.status(500).json({ message: 'Gateway logic failed' });
  } catch (err) {
    console.error("CRITICAL ERROR:", err);
    return res.status(500).json({ message: 'Server crash' });
  }
}