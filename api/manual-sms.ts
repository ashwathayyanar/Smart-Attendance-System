import { PrismaClient } from '@prisma/client';
import { sendManualAlert } from '../src/services/smsService';

const prisma = new PrismaClient();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();
  const { studentId } = req.body;

  try {
    // 1. REGISTRATION CHECK (The Gatekeeper)
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { id: studentId },
          { studentId: studentId }
        ]
      }
    });

    // If student is NOT in your database, STOP HERE.
    if (!student) {
      console.log(`🚫 Security Block: ID ${studentId} is not a registered student.`);
      return res.status(404).json({ message: 'Student not registered in the system.' });
    }

    // 2. Only if registered, we proceed to SMS
    console.log(`✅ Student Found: ${student.fullName}. Calling SMS Gateway...`);
    const success = await sendManualAlert(student);

    if (success) {
      return res.status(200).json({ message: 'Alert Dispatched' });
    } else {
      return res.status(500).json({ message: 'SMS Gateway Error (Check Balance)' });
    }
  } catch (err) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}