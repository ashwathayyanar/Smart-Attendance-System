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
  name: string;
  className: string;
  section: string;
  mobile: string;
  parentMobile: string;
  faceDescriptor: number[]; // 128 values
  createdAt: string;
}

export interface AttendanceRecord {
  studentId: string;
  name: string;
  className?: string;
  section?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  status: 'PRESENT' | 'ABSENT';
  confidence: number;
  emotion?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
