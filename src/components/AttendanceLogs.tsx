import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  Trash2, 
  User, 
  Clock, 
  SmilePlus,
  ArrowUpDown,
  History
} from 'lucide-react';
import { AttendanceRecord } from '../types';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';

export default function AttendanceLogs() {
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/attendance');
      const data = await res.json();
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch logs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleClearLogs = async () => {
  if (window.confirm('CRITICAL: Are you sure? This is permanent.')) {
    try {
      const res = await fetch('/api/attendance', { method: 'DELETE' });
      if (res.ok) {
        // 1. Clear local state immediately
        setLogs([]); 
        // 2. Optional: Force a re-fetch to be 100% sure
        await fetchLogs(); 
        alert('Database wiped and UI synced.');
      }
    } catch (error) {
      alert('Failed to clear logs.');
    }
  }
};

  const filteredLogs = logs.filter(log => 
    log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredLogs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Records');
    XLSX.writeFile(wb, `Attendance_Manifest_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // Helper for emotion styling
  const getEmotionStyle = (emotion?: string) => {
    const e = emotion?.toLowerCase();
    if (e === 'happy') return 'bg-amber-100 text-amber-600 border-amber-200';
    if (e === 'sad') return 'bg-blue-100 text-blue-600 border-blue-200';
    if (e === 'angry') return 'bg-rose-100 text-rose-600 border-rose-200';
    return 'bg-zinc-100 text-zinc-600 border-zinc-200';
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 space-y-4">
      <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      <p className="text-xs font-black uppercase tracking-[0.2em] opacity-40">Decrypting Logs...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      
      {/* 1. TOP HEADER BAR */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white dark:bg-zinc-900/50 p-6 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-black/5 backdrop-blur-xl">
        <div className="relative w-full md:w-[450px] group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 group-focus-within:text-emerald-500 transition-all" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student identity or name..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500/50 transition-all font-medium text-sm"
          />
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={handleClearLogs}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-rose-500/10 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-95"
          >
            <Trash2 size={16} />
            Wipe Database
          </button>
          
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all">
            <Filter size={16} />
            Filter
          </button>
          
          <button 
            onClick={exportToExcel}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
          >
            <Download size={16} />
            Manifest Export
          </button>
        </div>
      </div>

      {/* 2. DATA TABLE SECTION */}
      <div className="bg-white dark:bg-zinc-900/50 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-black/5 overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                <th className="px-10 py-7">Student Identity</th>
                <th className="px-8 py-7">Academic Dept</th>
                <th className="px-8 py-7">Log Timestamp</th>
                <th className="px-8 py-7">Status</th>
                <th className="px-8 py-7 text-right">Biometric Mood</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {filteredLogs.map((log, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  key={i} 
                  className="hover:bg-emerald-500/[0.02] transition-all group"
                >
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-black group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 shadow-sm">
                        {log.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black tracking-tight">{log.name}</span>
                        <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-widest">{log.studentId}</span>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Class {log.className || 'N/A'}</span>
                      <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">Section {log.section || '-'}</span>
                    </div>
                  </td>
                  
                  <td className="px-8 py-6">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                        <Calendar size={12} className="opacity-40" />
                        {log.date ? format(new Date(log.date), 'MMM dd, yyyy') : 'N/A'}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold opacity-30 uppercase">
                        <Clock size={12} />
                        {log.time}
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-1.5 text-[9px] font-black px-4 py-1.5 rounded-full border shadow-sm ${
                      log.status === 'PRESENT' 
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${log.status === 'PRESENT' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`} />
                      {log.status}
                    </span>
                  </td>
                  
                  <td className="px-8 py-6 text-right">
                    <span className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${getEmotionStyle(log.emotion)}`}>
                      <SmilePlus size={12} />
                      {log.emotion || 'Neutral'}
                    </span>
                  </td>
                </motion.tr>
              ))}
              
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-10 py-32 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <History size={48} className="mb-4" />
                      <p className="text-sm font-black uppercase tracking-widest">No matching records found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}