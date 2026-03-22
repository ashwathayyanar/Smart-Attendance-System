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
  studentId?: string;    // Added for backend compatibility
  name: string;
  fullName?: string;     // Added for backend compatibility
  className: string;
  section: string;
  mobile: string;
  parentMobile?: string; // Made optional for safety
  faceDescriptor: number[] | any; // Allows for parsed JSON from database
  descriptors?: number[][]; // Added for AI FaceMatcher compatibility
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