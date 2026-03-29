import React, { useState } from 'react';
import { ShieldCheck, User, Lock, Camera, ArrowLeft, Fingerprint, Activity, ChevronRight } from 'lucide-react';
import { User as UserType } from '../types';
import StudentRegistration from './StudentRegistration';
import { motion, AnimatePresence } from 'framer-motion';

interface LandingProps {
  onLogin: (user: UserType) => void;
  darkMode: boolean;
}

type ViewState = 'landing' | 'admin-login' | 'student-choice' | 'student-login' | 'student-register';

// High-End Input Component
const AuthInput = ({ icon: Icon, label, darkMode, ...props }: any) => (
  <div className="space-y-2 group">
    <label className="block text-[10px] font-black uppercase tracking-[0.25em] opacity-40 ml-1">
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
      setError('Credential verification failed');
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
          setError('No record found for this Identity');
        }
      } catch (err) {
        setError('System Synchronization Error');
      }
    } else {
      setError('Please provide complete credentials');
    }
  };

  if (view === 'student-register') {
    return (
      <div className={`min-h-screen p-6 transition-colors duration-1000 ${darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
        <div className="max-w-5xl mx-auto">
          <button 
            onClick={() => setView('student-choice')}
            className="flex items-center gap-2 mb-12 px-6 py-3 rounded-2xl bg-zinc-200/50 dark:bg-zinc-900 hover:scale-105 active:scale-95 transition-all font-black text-[10px] uppercase tracking-widest shadow-sm border border-zinc-200 dark:border-zinc-800"
          >
            <ArrowLeft size={16} />
            Back to Portal
          </button>
          
          <div className="flex flex-col items-center mb-12">
            <div className="w-28 h-28 bg-emerald-500 rounded-[3rem] flex items-center justify-center text-white mb-8 shadow-2xl shadow-emerald-500/40 relative overflow-hidden">
              <Camera size={44} strokeWidth={1.5} />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-center leading-[0.9]">Secure<br/><span className="text-emerald-500 italic">Onboarding</span></h1>
            <p className="opacity-40 text-xs mt-4 font-bold uppercase tracking-[0.3em]">Precision Enrollment Protocol Active</p>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-12 rounded-[4rem] border shadow-2xl backdrop-blur-3xl transition-all duration-700 ${darkMode ? 'bg-zinc-900/40 border-zinc-800/50' : 'bg-white/80 border-zinc-100'}`}
          >
             <StudentRegistration onRegisterSuccess={() => setView('student-login')} />
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-1000 ${darkMode ? 'bg-zinc-950' : 'bg-zinc-100'}`}>
      
      {/* Refined Background Elements */}
      <div className="absolute top-[-15%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 blur-[140px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/5 blur-[140px] rounded-full animate-pulse" style={{ animationDelay: '3s' }}></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className={`w-full max-w-lg p-14 rounded-[5rem] shadow-2xl relative z-10 border transition-all duration-700 ${
        darkMode ? 'bg-zinc-900/40 border-zinc-800/50 backdrop-blur-3xl' : 'bg-white/90 border-zinc-200/50 backdrop-blur-3xl shadow-zinc-200/50'
      }`}>
        
        {/* Corporate Header Section */}
        <div className="flex flex-col items-center mb-16">
          <div className="relative mb-10 group">
            <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-10 group-hover:opacity-30 transition-opacity duration-1000"></div>
            <div className="relative w-28 h-28 bg-gradient-to-br from-zinc-800 to-zinc-950 dark:from-zinc-900 dark:to-black rounded-[3rem] flex items-center justify-center text-white shadow-2xl border border-white/5 transform group-hover:scale-105 transition-all duration-700">
              <ShieldCheck size={48} strokeWidth={1} className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
            </div>
          </div>
          
          <h1 className="text-3xl font-black tracking-tighter mb-3 text-center leading-none uppercase">
            Smart Attendance <span className="text-emerald-500 block normal-case italic">System</span>
          </h1>

          <div className="flex items-center gap-2.5 px-5 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 shadow-inner">
             <Activity size={10} className="animate-pulse text-emerald-500" />
             <span className="text-[9px] font-black uppercase tracking-[0.3em]">Verified System Online</span>
          </div>
        </div>

        {/* Action Center */}
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <button
                onClick={() => setView('student-choice')}
                className="w-full flex items-center justify-between gap-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-6 px-10 rounded-[2.5rem] transition-all shadow-2xl shadow-emerald-500/20 active:scale-[0.97] group"
              >
                <div className="flex items-center gap-5">
                  <User size={24} strokeWidth={2} />
                  <span className="text-lg tracking-tight">Student Portal</span>
                </div>
                <ChevronRight size={22} className="opacity-40 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => setView('admin-login')}
                className={`w-full flex items-center gap-5 font-black py-6 px-10 rounded-[2.5rem] transition-all active:scale-[0.97] border ${
                  darkMode ? 'bg-zinc-800/20 hover:bg-zinc-800/80 border-zinc-700/50' : 'bg-white hover:bg-zinc-50 border-zinc-200'
                }`}
              >
                <ShieldCheck size={24} className="text-emerald-500" strokeWidth={2} />
                <span className="text-lg tracking-tight">Administrator</span>
              </button>
            </motion.div>
          )}

          {view === 'student-choice' && (
            <motion.div 
              key="choice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <button onClick={() => setView('landing')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-all mb-8">
                <ArrowLeft size={14} strokeWidth={3} /> Change Authorization
              </button>
              <button
                onClick={() => setView('student-login')}
                className="w-full flex items-center gap-6 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-6 px-10 rounded-[2.5rem] transition-all active:scale-0.97"
              >
                <Fingerprint size={28} strokeWidth={1.5} />
                <span className="text-lg tracking-tight">Access with ID</span>
              </button>
              <button
                onClick={() => setView('student-register')}
                className={`w-full flex items-center gap-6 font-black py-6 px-10 rounded-[2.5rem] border transition-all active:scale-0.97 shadow-sm ${
                  darkMode ? 'bg-zinc-800/20 border-zinc-700/50 hover:bg-zinc-800/80' : 'bg-white border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <Camera size={28} className="text-emerald-500" strokeWidth={1.5} />
                <span className="text-lg tracking-tight">Identity Registration</span>
              </button>
            </motion.div>
          )}

          {(view === 'admin-login' || view === 'student-login') && (
            <motion.form 
              key="auth-form"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              onSubmit={view === 'admin-login' ? handleAdminLogin : handleStudentLogin} 
              className="space-y-8"
            >
              <button type="button" onClick={() => setView(view === 'admin-login' ? 'landing' : 'student-choice')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 transition-all mb-6">
                <ArrowLeft size={14} strokeWidth={3} /> Choose User Type
              </button>

              <AuthInput 
                icon={User} 
                label={view === 'admin-login' ? "Access Key ID" : "University Identity ID"}
                type="text"
                value={id}
                darkMode={darkMode}
                onChange={(e: any) => setId(e.target.value)}
                placeholder="ID Identifier"
                required
              />

              <AuthInput 
                icon={view === 'admin-login' ? Lock : User} 
                label={view === 'admin-login' ? "Secure Passcode" : "Full Name Verification"}
                type={view === 'admin-login' ? "password" : "text"}
                value={view === 'admin-login' ? password : name}
                darkMode={darkMode}
                onChange={(e: any) => view === 'admin-login' ? setPassword(e.target.value) : setName(e.target.value)}
                placeholder={view === 'admin-login' ? "••••••••" : "Full legal name"}
                required
              />

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-rose-500/5 border border-rose-500/10 text-rose-600 dark:text-rose-400 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3"
                >
                  <Activity size={14} /> {error}
                </motion.div>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-6 rounded-[2.5rem] transition-all shadow-2xl shadow-emerald-500/30 active:scale-95 text-xs uppercase tracking-[0.3em]"
              >
                Sign In & Authorize
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-20 pt-10 border-t border-zinc-800/10 dark:border-zinc-800/50 text-center">
          <p className="text-[9px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.4em]">
            Precision System v2.10.4
          </p>
        </div>
      </motion.div>
    </div>
  );
}