import React, { useState } from 'react';
import { ShieldCheck, User, Lock, Camera, ArrowLeft, Fingerprint, Activity } from 'lucide-react';
import { User as UserType } from '../types';
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
          setError('Student records not found. Verify ID & Name.');
        }
      } catch (err) {
        setError('Database connection failed.');
      }
    } else {
      setError('Please fill all fields');
    }
  };

  // Professional Input Component to reuse
  const AuthInput = ({ icon: Icon, label, ...props }: any) => (
    <div className="space-y-1.5 group">
      <label className="block text-xs font-bold uppercase tracking-widest opacity-40 ml-1">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 group-focus-within:text-emerald-500 transition-all">
          <Icon size={18} />
        </div>
        <input
          {...props}
          className={`w-full pl-11 pr-4 py-3.5 rounded-2xl border transition-all outline-none text-sm font-medium ${
            darkMode 
              ? 'bg-zinc-800/50 border-zinc-700/50 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 focus:bg-zinc-800' 
              : 'bg-zinc-50 border-zinc-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 focus:bg-white'
          }`}
        />
      </div>
    </div>
  );

  if (view === 'student-register') {
    return (
      <div className={`min-h-screen p-6 transition-colors duration-500 ${darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
        <div className="max-w-5xl mx-auto">
          <button 
            onClick={() => setView('student-choice')}
            className="flex items-center gap-2 mb-8 px-5 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:scale-105 active:scale-95 transition-all font-bold text-sm shadow-sm"
          >
            <ArrowLeft size={18} />
            Return to Portal
          </button>
          
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white mb-4 shadow-2xl shadow-emerald-500/30">
              <Camera size={36} />
            </div>
            <h1 className="text-4xl font-black tracking-tighter">Biometric Registration</h1>
            <p className="opacity-50 text-sm mt-2 font-medium tracking-wide">Secure your identity in the Singapore Cloud Database</p>
          </div>
          
          <div className={`p-8 rounded-[2.5rem] border shadow-2xl ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
             <StudentRegistration onRegisterSuccess={() => setView('student-login')} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-500 ${darkMode ? 'bg-zinc-950' : 'bg-zinc-100'}`}>
      
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full"></div>

      <div className={`w-full max-w-md p-10 rounded-[3rem] shadow-2xl relative z-10 transition-all duration-300 ${
        darkMode ? 'bg-zinc-900/80 border border-zinc-800 backdrop-blur-xl' : 'bg-white border border-zinc-200'
      }`}>
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative w-20 h-20 bg-gradient-to-tr from-emerald-600 to-teal-400 rounded-[2rem] flex items-center justify-center text-white shadow-2xl border border-emerald-300/20 transform hover:scale-110 transition-transform duration-500">
              <ShieldCheck size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-1">
            AI<span className="text-emerald-500">ATTEND</span>
          </h1>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
             <Activity size={12} className="animate-pulse" />
             <span className="text-[10px] font-bold uppercase tracking-widest">System Active</span>
          </div>
        </div>

        {/* View Switcher Logic */}
        {view === 'landing' && (
          <div className="space-y-4">
            <button
              onClick={() => setView('student-choice')}
              className="w-full flex items-center justify-between gap-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-5 px-6 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.98] group"
            >
              <div className="flex items-center gap-4">
                <User size={24} />
                <span className="text-lg tracking-tight">Student Portal</span>
              </div>
              <ArrowLeft size={20} className="rotate-180 opacity-50 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => setView('admin-login')}
              className={`w-full flex items-center gap-4 font-bold py-5 px-6 rounded-2xl transition-all active:scale-[0.98] border ${
                darkMode ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700' : 'bg-white hover:bg-zinc-50 border-zinc-200 shadow-sm'
              }`}
            >
              <ShieldCheck size={24} className="text-emerald-500" />
              <span className="text-lg tracking-tight">Administrator</span>
            </button>
          </div>
        )}

        {view === 'student-choice' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <button onClick={() => setView('landing')} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all mb-6">
              <ArrowLeft size={14} /> Back to Start
            </button>
            <button
              onClick={() => setView('student-login')}
              className="w-full flex items-center gap-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-6 rounded-2xl transition-all"
            >
              <Fingerprint size={24} />
              Login with ID
            </button>
            <button
              onClick={() => setView('student-register')}
              className={`w-full flex items-center gap-4 font-bold py-4 px-6 rounded-2xl border transition-all ${
                darkMode ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700' : 'bg-white border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <Camera size={24} className="text-emerald-500" />
              New Registration
            </button>
          </div>
        )}

        {(view === 'admin-login' || view === 'student-login') && (
          <form onSubmit={view === 'admin-login' ? handleAdminLogin : handleStudentLogin} className="space-y-5 animate-in zoom-in-95 duration-300">
            <button type="button" onClick={() => setView(view === 'admin-login' ? 'landing' : 'student-choice')} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all mb-4">
              <ArrowLeft size={14} /> Change Method
            </button>

            <AuthInput 
              icon={User} 
              label={view === 'admin-login' ? "Admin ID" : "Student ID"}
              type="text"
              value={id}
              onChange={(e: any) => setId(e.target.value)}
              placeholder="e.g. 2024CS001"
              required
            />

            <AuthInput 
              icon={view === 'admin-login' ? Lock : User} 
              label={view === 'admin-login' ? "Password" : "Full Name"}
              type={view === 'admin-login' ? "password" : "text"}
              value={view === 'admin-login' ? password : name}
              onChange={(e: any) => view === 'admin-login' ? setPassword(e.target.value) : setName(e.target.value)}
              placeholder={view === 'admin-login' ? "••••••••" : "e.g. John Doe"}
              required
            />

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <ShieldCheck size={14} /> {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 text-sm uppercase tracking-widest"
            >
              Authorize Access
            </button>
          </form>
        )}

        <div className="mt-10 pt-6 border-t border-zinc-800/50 text-center">
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
            Precision Biometric System v2.1
          </p>
        </div>
      </div>
    </div>
  );
}