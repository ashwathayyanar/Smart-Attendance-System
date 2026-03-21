import React, { useState } from 'react';
import { ShieldCheck, User, Lock, Phone, Camera, ArrowLeft } from 'lucide-react';
import { Role, User as UserType } from '../types';
import StudentRegistration from './StudentRegistration';

interface LandingProps {
  onLogin: (user: UserType) => void;
  darkMode: boolean;
}

type ViewState = 'landing' | 'admin-login' | 'student-choice' | 'student-login' | 'student-register';

export default function Landing({ onLogin, darkMode }: LandingProps) {
  const [view, setView] = useState<ViewState>('landing');
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (id === 'admin' && password === '1234') {
      onLogin({ id: 'admin', name: 'Admin', role: 'admin' });
    } else {
      setError('Invalid admin credentials');
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (id && name) {
      try {
        const res = await fetch('/api/students');
        const students = await res.json();
        const student = students.find((s: any) => s.id.trim() === id.trim() && s.name.trim().toLowerCase() === name.trim().toLowerCase());
        if (student) {
          onLogin({ id: student.id, name: student.name, role: 'student', mobile: student.mobile, className: student.className, section: student.section });
        } else {
          setError('Student not found. Please check ID and Name.');
        }
      } catch (err) {
        setError('Failed to verify student');
      }
    } else {
      setError('Please enter Student ID and Name');
    }
  };

  if (view === 'student-register') {
    return (
      <div className={`min-h-screen p-4 md:p-8 ${darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
        <button 
          onClick={() => setView('student-choice')}
          className="flex items-center gap-2 mb-6 px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all font-medium"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mb-4 shadow-xl shadow-emerald-500/20">
              <Camera size={32} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Student Registration</h1>
            <p className="opacity-50 text-sm mt-2">Capture your face to register for smart attendance</p>
          </div>
          <StudentRegistration onRegisterSuccess={() => setView('student-login')} />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      <div className={`w-full max-w-md p-8 rounded-3xl shadow-2xl ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-zinc-200'}`}>
        <div className="flex flex-col items-center mb-8">
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 rounded-full"></div>
            <div className="relative w-20 h-20 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-emerald-500/30 border border-emerald-300/30 transform rotate-3 hover:rotate-0 transition-all duration-300">
              <ShieldCheck size={40} className="absolute opacity-40" />
              <User size={24} className="relative z-10" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500">Smart Attendance</h1>
          <p className="opacity-60 text-sm mt-2 font-medium">Secure real-time face recognition system</p>
        </div>

        {view === 'landing' && (
          <div className="space-y-4">
            <button
              onClick={() => setView('student-choice')}
              className="w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              <User size={24} />
              Student Portal
            </button>
            <button
              onClick={() => setView('admin-login')}
              className="w-full flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-zinc-800/20 active:scale-[0.98]"
            >
              <ShieldCheck size={24} />
              Admin Portal
            </button>
          </div>
        )}

        {view === 'student-choice' && (
          <div className="space-y-4">
            <button
              onClick={() => setView('landing')}
              className="mb-4 flex items-center gap-2 text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={() => setView('student-login')}
              className="w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              <User size={24} />
              Login
            </button>
            <button
              onClick={() => setView('student-register')}
              className="w-full flex items-center justify-center gap-3 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 font-bold py-4 rounded-xl transition-all active:scale-[0.98]"
            >
              <Camera size={24} />
              Register
            </button>
          </div>
        )}

        {view === 'admin-login' && (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <button
              type="button"
              onClick={() => setView('landing')}
              className="mb-4 flex items-center gap-2 text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <label className="block text-sm font-medium mb-1.5 opacity-70">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    darkMode ? 'bg-zinc-800 border-zinc-700 focus:border-emerald-500' : 'bg-zinc-50 border-zinc-200 focus:border-emerald-500'
                  }`}
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 opacity-70">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    darkMode ? 'bg-zinc-800 border-zinc-700 focus:border-emerald-500' : 'bg-zinc-50 border-zinc-200 focus:border-emerald-500'
                  }`}
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              Sign In as Admin
            </button>
          </form>
        )}

        {view === 'student-login' && (
          <form onSubmit={handleStudentLogin} className="space-y-4">
            <button
              type="button"
              onClick={() => setView('student-choice')}
              className="mb-4 flex items-center gap-2 text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <label className="block text-sm font-medium mb-1.5 opacity-70">Student ID</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    darkMode ? 'bg-zinc-800 border-zinc-700 focus:border-emerald-500' : 'bg-zinc-50 border-zinc-200 focus:border-emerald-500'
                  }`}
                  placeholder="Enter Student ID"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 opacity-70">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-all outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                    darkMode ? 'bg-zinc-800 border-zinc-700 focus:border-emerald-500' : 'bg-zinc-50 border-zinc-200 focus:border-emerald-500'
                  }`}
                  placeholder="Enter Full Name"
                  required
                />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              Sign In as Student
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-zinc-800 text-center opacity-40 text-xs">
          <p>© 2026 Smart Attendance System</p>
          <p>Production Ready • Secure • Real-time</p>
        </div>
      </div>
    </div>
  );
}
