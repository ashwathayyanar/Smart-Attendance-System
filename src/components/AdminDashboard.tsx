import React, { useEffect, useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Trash2,
  Calendar,
  Activity,
  UserCheck,
  BellRing 
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Student, AttendanceRecord } from '../types';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [sRes, aRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/attendance')
      ]);
      const sData = await sRes.json();
      const aData = await aRes.json();
      setStudents(sData);
      setAttendance(aData);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- LOGIC: MANUAL SMS ALERT (Synced with server.ts) ---
  const triggerAlert = async (id: string, name: string) => {
    const confirmSend = window.confirm(`Send urgent Security Alert SMS to ${name}?`);
    if (!confirmSend) return;

    try {
      const res = await fetch('/api/manual-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id }) // This matches server.ts
      });

      const data = await res.json();

      if (res.ok) {
        alert(`✅ Success: Alert dispatched to ${name}.`);
      } else {
        // This will show if the student isn't registered or gateway fails
        alert(`❌ Error: ${data.error || 'Failed to send alert'}`);
      }
    } catch (error) {
      console.error("SMS Error:", error);
      alert('⚠️ Critical: Could not connect to the server.');
    }
  };

  // --- LOGIC: DELETE STUDENT ---
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (window.confirm(`Are you sure you want to delete ${studentName}?`)) {
      try {
        const res = await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
        if (res.ok) {
          setStudents(students.filter(s => (s.id || (s as any).studentId) !== studentId));
        }
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  // --- LOGIC: CLEAR ATTENDANCE ---
  const handleResetAttendance = async () => {
    if (window.confirm('Clear all attendance records?')) {
      try {
        const res = await fetch('/api/attendance', { method: 'DELETE' });
        if (res.ok) setAttendance([]); 
      } catch (err) {
        console.error('Reset error:', err);
      }
    }
  };

  // Stats Logic
  const today = new Date().toISOString().split('T')[0];
  const presentToday = attendance.filter(a => a.date === today && a.status === 'PRESENT').length;
  const totalStudents = students.length;
  const absentToday = totalStudents > 0 ? totalStudents - presentToday : 0;
  const attendanceRate = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0;

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(attendance);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `Attendance_Report_${today}.xlsx`);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 space-y-4">
      <Activity className="text-emerald-500 animate-spin" size={40} />
      <p className="text-sm font-bold uppercase tracking-widest opacity-40">Syncing System...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      
      {/* 1. TOP STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Registered" value={totalStudents.toString()} icon={Users} color="bg-blue-500" />
        <StatCard title="Present Today" value={presentToday.toString()} icon={UserCheck} color="bg-emerald-500" />
        <StatCard title="Absent" value={absentToday.toString()} icon={XCircle} color="bg-rose-500" />
        <StatCard title="Success Rate" value={`${attendanceRate}%`} icon={TrendingUp} color="bg-amber-500" />
      </div>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Feed (Right Side) */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-black/5 flex flex-col backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-xl tracking-tight">Recent Activity</h3>
            <button onClick={exportToExcel} className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:text-emerald-500 transition-colors">
              <Download size={20} />
            </button>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {attendance.slice(-6).reverse().map((record, i) => (
              <div key={i} className="group flex items-center gap-4 p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-800/30 border border-transparent hover:border-emerald-500/30 transition-all">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${record.status === 'PRESENT' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                  {record.status === 'PRESENT' ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate">{record.name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{record.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Directory (Table) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900/50 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-black/5 overflow-hidden backdrop-blur-xl">
          <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                   <Users size={20} />
                </div>
                <h3 className="font-black text-xl tracking-tight">Student Directory</h3>
             </div>
             <button onClick={handleResetAttendance} className="text-[10px] font-black uppercase text-rose-500 hover:underline">Reset Logs</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  <th className="px-8 py-6">ID</th>
                  <th className="px-8 py-6">Name</th>
                  <th className="px-8 py-6">Status</th>
                  <th className="px-8 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {students.map((student, i) => {
                  const sId = student.id || (student as any).studentId || "";
                  const sName = student.name || (student as any).fullName || "";
                  
                  // Logic to check if student is present today
                  const isPresent = attendance.some(a => a.studentId === sId && a.date === today);

                  return (
                    <tr key={i} className="hover:bg-emerald-500/[0.02] transition-colors group">
                      <td className="px-8 py-5 font-mono text-xs font-bold text-emerald-600">{sId}</td>
                      <td className="px-8 py-5 text-sm font-bold">{sName}</td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${isPresent ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {isPresent ? 'Present' : 'Absent'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                        {/* THE ALERT BUTTON */}
                        {!isPresent && (
                          <button
                            onClick={() => triggerAlert(sId, sName)}
                            className="relative group p-2.5 bg-orange-500/10 text-orange-600 hover:bg-orange-600 hover:text-white rounded-xl transition-all"
                            title="Send Absent SMS"
                          >
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                            </span>
                            <BellRing size={16} />
                          </button>
                        )}

                        <button 
                          onClick={() => handleDeleteStudent(sId, sName)}
                          className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900/50 p-7 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-lg backdrop-blur-xl">
      <div className={`w-14 h-14 ${color} rounded-[1.25rem] flex items-center justify-center text-white mb-5 shadow-lg shadow-inherit`}>
        <Icon size={28} />
      </div>
      <h4 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">{title}</h4>
      <p className="text-4xl font-black tracking-tighter leading-none">{value}</p>
    </div>
  );
}