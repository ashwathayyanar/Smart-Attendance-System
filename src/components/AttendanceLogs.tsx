import React, { useEffect, useState } from 'react';
import { History, Search, Filter, Download, Calendar } from 'lucide-react';
import { AttendanceRecord } from '../types';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export default function AttendanceLogs() {
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredLogs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Logs');
    XLSX.writeFile(wb, `Attendance_Logs_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading logs...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl text-sm font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all">
            <Filter size={18} />
            Filter
          </button>
          <button 
            onClick={exportToExcel}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] font-bold uppercase tracking-widest opacity-50">
                <th className="px-8 py-5">Student</th>
                <th className="px-8 py-5">ID</th>
                <th className="px-8 py-5">Class</th>
                <th className="px-8 py-5">Section</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Time</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Emotion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredLogs.map((log, i) => (
                <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        {log.name.charAt(0)}
                      </div>
                      <span className="text-sm font-bold">{log.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-mono opacity-50">{log.studentId}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs opacity-70">{log.className || '-'}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs opacity-70">{log.section || '-'}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={14} className="opacity-30" />
                      {format(new Date(log.date), 'MMM dd, yyyy')}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm opacity-70">
                    {log.time}
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                      log.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs capitalize px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                      {log.emotion || 'Neutral'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center opacity-30 italic">
                    No logs found matching your search
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
