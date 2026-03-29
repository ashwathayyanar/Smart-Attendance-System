import React, { useState } from 'react';
import { User, Lock, Camera, ArrowLeft, Fingerprint, Activity, ChevronRight, ShieldCheck } from 'lucide-react';
import { User as UserType } from '../types';
import StudentRegistration from './StudentRegistration';
import { motion, AnimatePresence } from 'framer-motion';

interface LandingProps {
  onLogin: (user: UserType) => void;
  darkMode: boolean;
}

type ViewState = 'landing' | 'admin-login' | 'student-choice' | 'student-login' | 'student-register';

// --- SUB-COMPONENT: AuthInput (Defined outside for focus stability) ---
const AuthInput = ({ icon: Icon, label, darkMode, ...props }: any) => (
  <div className="space-y-2 group">
    <label className="block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500 ml-1">
      {label}
    </label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-25 group-focus-within:opacity-100 group-focus-within:text-emerald-500 transition-all duration-500">
        <Icon size={18} strokeWidth={2} />
      </div>
      <input
        {...props}
        className={`w-full pl-12 pr-4 py-4 rounded-2xl border transition-all outline-none text-sm font-semibold tracking-tight ${
          darkMode 
            ? 'bg-zinc-800/30 border-zinc-700/50 focus:border-emerald-500/50 focus:ring-8 focus:ring-emerald-500/5 focus:bg-zinc-800/80' 
            : 'bg-zinc-50 border-zinc-200 focus:border-emerald-500 focus:ring-8 focus:ring-emerald-500/5 focus:bg-white shadow-sm'
        }`}
      />
    </div>
  </div>
);

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
      setError('Invalid Cryptographic Credentials');
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (id && name) {
      try {
        const res = await fetch('/api/students');
        const students = await res.json();
        const student = students.find((s: any) => 
          s.id.trim() === id.trim() && 
          s.name.trim().toLowerCase() === name.trim().toLowerCase()
        );
        if (student) {
          onLogin({ 
            id: student.id, 
            name: student.name, 
            role: 'student', 
            mobile: student.mobile, 
            className: student.className, 
            section: student.section 
          });
        } else {
          setError('Identity Record Not Verified');
        }
      } catch (err) {
        setError('Relay Synchronization Error');
      }
    } else {
      setError('Authentication Data Incomplete');
    }
  };

  if (view === 'student-register') {
    return (
      <div className={`min-h-screen p-6 transition-colors duration-1000 ${darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
        <div className="max-w-5xl mx-auto">
          <button 
            onClick={() => setView('student-choice')}
            className="flex items-center gap-2 mb-12 px-6 py-3 rounded-full bg-white dark:bg-zinc-900 hover:scale-105 active:scale-95 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl border border-zinc-100 dark:border-zinc-800"
          >
            <ArrowLeft size={16} />
            Back to Portal
          </button>
          
          <div className="flex flex-col items-center mb-12">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-32 h-32 mb-8">
              <img src="/logo.png" alt="Company Logo" className="w-full h-full object-contain drop-shadow-2xl" />
            </motion.div>
            <h1 className="text-5xl font-black tracking-tighter text-center leading-none">Biometric<br/><span className="text-emerald-500 italic">Enrollment</span></h1>
          </div>
          
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className={`p-12 rounded-[4rem] border shadow-2xl backdrop-blur-3xl transition-all duration-700 ${darkMode ? 'bg-zinc-900/40 border-zinc-800/50' : 'bg-white/80 border-zinc-100'}`}>
             <StudentRegistration onRegisterSuccess={() => setView('student-login')} />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-1000 ${darkMode ? 'bg-zinc-950' : 'bg-zinc-100'}`}>
      
      {/* Precision Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/5 blur-[160px] rounded-full"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/5 blur-[160px] rounded-full"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full max-w-lg p-14 rounded-[5rem] shadow-2xl relative z-10 border transition-all duration-700 ${
        darkMode ? 'bg-zinc-900/40 border-zinc-800/50 backdrop-blur-3xl' : 'bg-white/90 border-zinc-200/50 backdrop-blur-3xl shadow-zinc-200/30'
      }`}>
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-16">
          <motion.div whileHover={{ scale: 1.02 }} className="relative mb-10 group">
            <div className="absolute inset-0 bg-emerald-400 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-1000"></div>
            <img src="/logo.png" alt="Company Logo" className="relative w-32 h-32 object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.1)]" />
          </motion.div>
          
          <h1 className="text-3xl font-black tracking-tighter mb-3 text-center leading-none uppercase text-zinc-800 dark:text-white">
            Smart Attendance <span className="text-emerald-500 block normal-case italic">System</span>
          </h1>

          <div className="flex items-center gap-2.5 px-5 py-2 rounded-full bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
             <Activity size={10} className="animate-pulse" />
             <span className="text-[9px] font-black uppercase tracking-[0.3em]">Verified System Active</span>
          </div>
        </div>

        {/* View Switcher */}
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <button
                onClick={() => setView('student-choice')}
                className="w-full flex items-center justify-between gap-3 bg-zinc-900 dark:bg-white text-white dark:text-black font-black py-6 px-10 rounded-[2.5rem] transition-all shadow-2xl active:scale-[0.98] group"
              >
                <div className="flex items-center gap-5">
                  <User size={22} strokeWidth={2.5} />
                  <span className="text-lg tracking-tight">Student Portal</span>
                </div>
                <ChevronRight size={22} className="opacity-30 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => setView('admin-login')}
                className={`w-full flex items-center gap-5 font-black py-6 px-10 rounded-[2.5rem] transition-all active:scale-[0.98] border ${
                  darkMode ? 'bg-zinc-800/20 hover:bg-zinc-800/60 border-zinc-700/50' : 'bg-white hover:bg-zinc-50 border-zinc-200'
                }`}
              >
                <ShieldCheck size={22} className="text-emerald-500" strokeWidth={2.5} />
                <span className="text-lg tracking-tight">Management</span>
              </button>
            </motion.div>
          )}

          {view === 'student-choice' && (
            <motion.div key="choice" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <button onClick={() => setView('landing')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-all mb-8 ml-2">
                <ArrowLeft size={14} strokeWidth={3} /> Change Authorization
              </button>
              <button
                onClick={() => setView('student-login')}
                className="w-full flex items-center gap-6 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-6 px-10 rounded-[2.5rem] transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98]"
              >
                <Fingerprint size={28} strokeWidth={2} />
                <span className="text-lg tracking-tight">Identify with ID</span>
              </button>
              <button
                onClick={() => setView('student-register')}
                className={`w-full flex items-center gap-6 font-black py-6 px-10 rounded-[2.5rem] border transition-all active:scale-[0.98] ${
                  darkMode ? 'bg-zinc-800/20 border-zinc-700/50 hover:bg-zinc-800/80' : 'bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm'
                }`}
              >
                <Camera size={28} className="text-emerald-500" strokeWidth={2} />
                <span className="text-lg tracking-tight">New Enrollment</span>
              </button>
            </motion.div>
          )}

          {(view === 'admin-login' || view === 'student-login') && (
            <motion.form key="auth-form" initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} onSubmit={view === 'admin-login' ? handleAdminLogin : handleStudentLogin} className="space-y-8">
              <button type="button" onClick={() => setView(view === 'admin-login' ? 'landing' : 'student-choice')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-all mb-6 ml-2">
                <ArrowLeft size={14} strokeWidth={3} /> Switch Access
              </button>

              <AuthInput 
                icon={User} 
                label={view === 'admin-login' ? "Administrator ID" : "Registry Identity ID"}
                type="text"
                value={id}
                darkMode={darkMode}
                onChange={(e: any) => setId(e.target.value)}
                placeholder="Secure ID"
                required
              />

              <AuthInput 
                icon={view === 'admin-login' ? Lock : User} 
                label={view === 'admin-login' ? "System Passcode" : "Legal Registration Name"}
                type={view === 'admin-login' ? "password" : "text"}
                value={view === 'admin-login' ? password : name}
                darkMode={darkMode}
                onChange={(e: any) => view === 'admin-login' ? setPassword(e.target.value) : setName(e.target.value)}
                placeholder={view === 'admin-login' ? "••••••••" : "Full Name"}
                required
              />

              {error && (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="bg-rose-500/5 border border-rose-500/10 text-rose-600 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                  <Activity size={14} /> {error}
                </motion.div>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-6 rounded-[2.5rem] transition-all shadow-2xl shadow-emerald-500/20 active:scale-95 text-xs uppercase tracking-[0.3em]"
              >
                Authorize & Access
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-20 pt-10 border-t border-zinc-800/10 dark:border-zinc-800/40 text-center">
          <p className="text-[9px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.5em]">
            Precision Infrastructure v2.10.4
          </p>
        </div>
      </motion.div>
    </div>
  );
}