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
  // Database & Logic Labels
  id: string;
  studentId?: string; 
  name: string;
  fullName?: string;
  
  // Department Details
  className: string;
  section: string;
  mobile: string;
  parentMobile?: string;

  // AI & Face Recognition Data
  faceDescriptor?: number[] | any;
  faceData?: any; // <--- THIS FIXES THE RED ERRORS
  descriptors?: number[][];
  
  createdAt?: string;
}

export interface AttendanceRecord {
  studentId: string;
  name: string;
  className?: string;
  section?: string;
  date: string;
  time: string;
  status: 'PRESENT' | 'ABSENT';
  confidence: number;
  emotion?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}