export type Role = 'admin' | 'student';

export interface User {
  id: string;
  name: string;
  role: Role;
  mobile?: string;
  className?: string;
  section?: string;
}

export interface Student {
  id: string;
  studentId?: string; 
  name: string;
  fullName?: string;
  className: string;
  section: string;
  mobile: string;
  parentMobile?: string;
  faceDescriptor?: number[]; 
  faceData?: any; // <--- ADD THIS LINE TO FIX THE ERROR
  createdAt?: string;
}

export interface AttendanceRecord {
  studentId: string;
  name: string;
  date: string;
  time: string;
  status: 'PRESENT' | 'ABSENT';
  confidence: number;
  emotion?: string;
}