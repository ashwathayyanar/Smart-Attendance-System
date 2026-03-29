import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UserPlus, 
  Camera, 
  LogOut, 
  History, 
  Moon, 
  Sun,
  ShieldCheck,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserType } from '../types';

interface LayoutProps {
  user: UserType | null;
  onLogout: () => void;
  children: React.ReactNode;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export default function Layout({ user, onLogout, children, darkMode, setDarkMode }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = user?.role === 'admin' ? [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { name: 'Register Student', icon: UserPlus, path: '/admin/register' },
    { name: 'Attendance Mode', icon: Camera, path: '/admin/attendance' },
    { name: 'Attendance Logs', icon: History, path: '/admin/logs' },
  ] : [
    { name: 'My Attendance', icon: History, path: '/student' },
  ];

  return (
    <div className={`min-h-screen flex font-sans transition-colors duration-500 ${darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-md"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-72 transform transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${darkMode ? 'bg-zinc-900/50 border-zinc-800/50' : 'bg-white border-zinc-200'} 
        border-r backdrop-blur-xl flex flex-col
      `}>
        {/* Sidebar Header / Logo */}
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/student')}>
            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 transform group-hover:rotate-6 transition-transform">
              <ShieldCheck size={28} />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tighter leading-none">AI<span className="text-emerald-500">ATTEND</span></span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Precision v2.1</span>
            </div>
          </div>
          <button 
            className="md:hidden p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-6 py-4 space-y-2 overflow-y-auto">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-4 ml-4">Main Menu</p>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all relative overflow-hidden ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20'
                    : `hover:${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`
                }`}
              >
                <div className="flex items-center gap-3 z-10">
                  <item.icon size={20} className={isActive ? 'text-white' : 'text-emerald-500'} />
                  <span className="font-bold text-sm tracking-tight">{item.name}</span>
                </div>
                {isActive && (
                  <motion.div layoutId="activeNav" className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-400" />
                )}
                <ChevronRight size={14} className={`z-10 transition-transform ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`} />
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer / User Profile */}
        <div className="p-6">
          <div className={`p-4 rounded-3xl border ${darkMode ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-black text-sm shadow-inner">
                {user?.name.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-black truncate leading-none mb-1">{user?.name}</p>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white font-bold text-xs transition-all uppercase tracking-widest active:scale-95"
            >
              <LogOut size={16} />
              Logout System
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header */}
        <header className={`h-20 border-b flex items-center justify-between px-6 md:px-10 sticky top-0 z-30 transition-colors duration-300 ${
          darkMode ? 'border-zinc-800/50 bg-zinc-950/80' : 'border-zinc-200/50 bg-zinc-50/80'
        } backdrop-blur-xl`}>
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="flex flex-col">
              <h2 className="font-black text-xl tracking-tighter">
                {navItems.find(i => i.path === location.pathname)?.name || 'Command Center'}
              </h2>
              <div className="flex items-center gap-2 opacity-40 text-[10px] font-bold uppercase tracking-widest">
                <span>Network Active</span>
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                <span>Singapore Node</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-12 h-12 flex items-center justify-center rounded-2xl border transition-all ${
                darkMode 
                ? 'bg-zinc-900 border-zinc-800 text-amber-400 hover:border-amber-400/50 hover:shadow-lg hover:shadow-amber-400/10' 
                : 'bg-white border-zinc-200 text-zinc-500 hover:border-emerald-500/50 hover:text-emerald-500 shadow-sm'
              }`}
            >
              {darkMode ? <Sun size={22} fill="currentColor" /> : <Moon size={22} />}
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}