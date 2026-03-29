import React, { useState } from 'react';
import { ShieldCheck, User, Lock, Camera, ArrowLeft, Fingerprint, Activity } from 'lucide-react';
import { User as UserType } from '../types';
import StudentRegistration from './StudentRegistration';
import { motion, AnimatePresence } from 'framer-motion';

interface LandingProps {
  onLogin: (user: UserType) => void;
  darkMode: boolean;
}

type ViewState = 'landing' | 'admin-login' | 'student-choice' | 'student-login' | 'student-register';

// --- FIX: Component defined OUTSIDE to prevent losing focus while typing ---
const AuthInput = ({ icon: Icon, label, darkMode, ...props }: any) => (
  <div className="space-y-1.5 group">
    <label className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ml-1">
      {label}
    </label>
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 group-focus-within:text-emerald-500 transition-all duration-300">
        <Icon size={18} />
      </div>
      <input
        {...props}
        className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border transition-all outline-none text-sm font-bold ${
          darkMode 
            ? 'bg-zinc-800/40 border-zinc-700/50 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 focus:bg-zinc-800' 
            : 'bg-zinc-50 border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 focus:bg-white'
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
      setError('Invalid system credentials');
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
          setError('Access Denied: Record not found');
        }
      } catch (err) {
        setError('Network Synchronization Error');
      }
    } else {
      setError('Please provide all credentials');
    }
  };

  if (view === 'student-register') {
    return (
      <div className={`min-h-screen p-6 transition-colors duration-700 ${darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
        <div className="max-w-5xl mx-auto">
          <button 
            onClick={() => setView('student-choice')}
            className="flex items-center gap-2 mb-8 px-6 py-3 rounded-2xl bg-zinc-200 dark:bg-zinc-800 hover:scale-105 active:scale-95 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm"
          >
            <ArrowLeft size={16} />
            Back to Portal
          </button>
          
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 bg-emerald-500 rounded-[2.5rem] flex items-center justify-center text-white mb-6 shadow-2xl shadow-emerald-500/40 transform rotate-3">
              <Camera size={40} />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-center leading-none">Biometric <br/><span className="text-emerald-500">Onboarding</span></h1>
            <p className="opacity-40 text-xs mt-3 font-bold uppercase tracking-[0.2em]">Secure Cloud Registration Active</p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-10 rounded-[3.5rem] border shadow-2xl backdrop-blur-3xl ${darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-zinc-200'}`}
          >
             <StudentRegistration onRegisterSuccess={() => setView('student-login')} />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-1000 ${darkMode ? 'bg-zinc-950' : 'bg-zinc-100'}`}>
      
      {/* Dynamic Background Blurs */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/10 blur-[160px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-600/5 blur-[160px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className={`w-full max-w-md p-12 rounded-[4rem] shadow-2xl relative z-10 border transition-all duration-500 ${
        darkMode ? 'bg-zinc-900/60 border-zinc-800/50 backdrop-blur-2xl' : 'bg-white/80 border-white/50 backdrop-blur-2xl'
      }`}>
        
        {/* Header Branding Section */}
        <div className="flex flex-col items-center mb-12">
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative w-24 h-24 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl border border-emerald-300/20 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">
              <ShieldCheck size={44} strokeWidth={2.5} />
            </div>
          </div>
          
          <h1 className="text-3xl font-black tracking-tighter mb-2 text-center leading-none">
            Smart Attendance <span className="text-emerald-500 block italic">System</span>
          </h1>

          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner">
             <Activity size={12} className="animate-pulse" />
             <span className="text-[9px] font-black uppercase tracking-[0.25em]">Verified System Active</span>
          </div>
        </div>

        {/* Dynamic View Switcher */}
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <button
                onClick={() => setView('student-choice')}
                className="w-full flex items-center justify-between gap-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 px-8 rounded-[2rem] transition-all shadow-xl shadow-emerald-500/20 active:scale-95 group"
              >
                <div className="flex items-center gap-4">
                  <User size={24} strokeWidth={2.5} />
                  <span className="text-lg tracking-tight">Student Portal</span>
                </div>
                <ArrowLeft size={20} className="rotate-180 opacity-40 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => setView('admin-login')}
                className={`w-full flex items-center gap-4 font-black py-5 px-8 rounded-[2rem] transition-all active:scale-95 border ${
                  darkMode ? 'bg-zinc-800/50 hover:bg-zinc-700/50 border-zinc-700' : 'bg-white hover:bg-zinc-50 border-zinc-200'
                }`}
              >
                <ShieldCheck size={24} className="text-emerald-500" strokeWidth={2.5} />
                <span className="text-lg tracking-tight">Administrator</span>
              </button>
            </motion.div>
          )}

          {view === 'student-choice' && (
            <motion.div 
              key="choice"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <button onClick={() => setView('landing')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all mb-6">
                <ArrowLeft size={14} strokeWidth={3} /> Change User Type
              </button>
              <button
                onClick={() => setView('student-login')}
                className="w-full flex items-center gap-5 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 px-8 rounded-[2rem] transition-all active:scale-95"
              >
                <Fingerprint size={26} strokeWidth={2.5} />
                <span className="text-lg tracking-tight">Identify with ID</span>
              </button>
              <button
                onClick={() => setView('student-register')}
                className={`w-full flex items-center gap-5 font-black py-5 px-8 rounded-[2rem] border transition-all active:scale-95 ${
                  darkMode ? 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-700' : 'bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm'
                }`}
              >
                <Camera size={26} className="text-emerald-500" strokeWidth={2.5} />
                <span className="text-lg tracking-tight">New Registration</span>
              </button>
            </motion.div>
          )}

          {(view === 'admin-login' || view === 'student-login') && (
            <motion.form 
              key="auth-form"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              onSubmit={view === 'admin-login' ? handleAdminLogin : handleStudentLogin} 
              className="space-y-6"
            >
              <button type="button" onClick={() => setView(view === 'admin-login' ? 'landing' : 'student-choice')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all mb-4">
                <ArrowLeft size={14} strokeWidth={3} /> Return Back
              </button>

              <AuthInput 
                icon={User} 
                label={view === 'admin-login' ? "System Admin ID" : "University Student ID"}
                type="text"
                value={id}
                darkMode={darkMode}
                onChange={(e: any) => setId(e.target.value)}
                placeholder="Unique Identifier"
                required
              />

              <AuthInput 
                icon={view === 'admin-login' ? Lock : User} 
                label={view === 'admin-login' ? "Security Password" : "Full Registered Name"}
                type={view === 'admin-login' ? "password" : "text"}
                value={view === 'admin-login' ? password : name}
                darkMode={darkMode}
                onChange={(e: any) => view === 'admin-login' ? setPassword(e.target.value) : setName(e.target.value)}
                placeholder={view === 'admin-login' ? "••••••••" : "Full legal name"}
                required
              />

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <Activity size={14} /> {error}
                </motion.div>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 rounded-[2rem] transition-all shadow-xl shadow-emerald-500/30 active:scale-95 text-xs uppercase tracking-[0.2em]"
              >
                Authenticate & Access
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-14 pt-8 border-t border-zinc-800/40 text-center">
          <p className="text-[9px] font-black text-zinc-500 dark:text-zinc-600 uppercase tracking-[0.3em]">
            Precision Smart Attendance System v2.1
          </p>
        </div>
      </motion.div>
    </div>
  );
}