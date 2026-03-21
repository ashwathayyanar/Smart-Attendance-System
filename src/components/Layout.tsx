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
  User,
  Menu,
  X
} from 'lucide-react';
import { motion } from 'motion/react';
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
    <div className={`min-h-screen flex ${darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 w-64 border-r transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${darkMode ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'} 
        flex flex-col
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
              <ShieldCheck size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight">Smart Attendance</span>
          </div>
          <button 
            className="md:hidden p-2 -mr-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                location.pathname === item.path
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : `hover:${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs opacity-50 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-500 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className={`h-16 border-b flex items-center justify-between px-4 md:px-6 ${darkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-zinc-200 bg-white/50'} backdrop-blur-md sticky top-0 z-10`}>
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="font-semibold text-lg">
              {navItems.find(i => i.path === location.pathname)?.name || 'Welcome'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'}`}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
