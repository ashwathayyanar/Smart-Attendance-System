import { PrismaClient } from '@prisma/client';
import { sendManualAlert } from '../src/services/smsService';

const prisma = new PrismaClient();

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { studentId } = req.body;

  try {
    // 1. Get the latest data for this specific student
    const student = await prisma.student.findUnique({
      where: { studentId: studentId }
    });

    if (!student) return res.status(404).json({ message: 'Student not found' });

    // 2. Trigger the SMS
    const success = await sendManualAlert(student);

    if (success) {
      return res.status(200).json({ message: 'Alert sent successfully' });
    } else {
      return res.status(500).json({ message: 'SMS Gateway failed' });
    }
  } catch (err) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}