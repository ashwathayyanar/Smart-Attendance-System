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
  BellRing // Added for the alert icon
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

  // --- 1. LOGIC: MANUAL SMS ALERT (The New Feature) ---
  const triggerAlert = async (id: string, name: string) => {
    const confirm = window.confirm(`Send urgent Security Alert SMS to ${name}?`);
    if (!confirm) return;

    try {
      const res = await fetch('/api/manual-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id })
      });

      const result = await res.json();

      if (res.ok) {
        alert(`✅ Alert successfully dispatched to ${name}.`);
      } else {
        alert(`❌ Failed: ${result.error || 'Gateway error'}. Check Fast2SMS balance.`);
      }
    } catch (error) {
      console.error("SMS Error:", error);
      alert('⚠️ Critical system error while sending SMS.');
    }
  };

  // --- 2. LOGIC: DELETE STUDENT ---
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

  // --- 3. LOGIC: CLEAR ATTENDANCE ---
  const handleResetAttendance = async () => {
    if (window.confirm('WARNING: This will clear all attendance records. Are you sure?')) {
      try {
        const res = await fetch('/api/attendance', { method: 'DELETE' });
        if (res.ok) setAttendance([]); 
      } catch (err) {
        console.error('Reset error:', err);
      }
    }
  };

  // --- CALCULATIONS FOR UI ---
  const todayDate = new Date();
  const today = todayDate.toISOString().split('T')[0];
  const presentToday = attendance.filter(a => a.date === today && a.status === 'PRESENT').length;
  const totalStudents = students.length;
  const absentToday = totalStudents > 0 ? totalStudents - presentToday : 0;
  const attendanceRate = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0;

  // Weekly Chart Data Logic
  const getWeeklyData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = days.map(day => ({ name: day, present: 0 }));
    attendance.forEach(record => {
      const recordDate = new Date(record.date);
      const dayIndex = (recordDate.getDay() || 7) - 1;
      if (record.status === 'PRESENT') data[dayIndex].present += 1;
    });
    return data;
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(attendance);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `Attendance_Report_${today}.xlsx`);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 space-y-4">
      <Activity className="text-emerald-500 animate-spin" size={40} />
      <p className="text-sm font-bold uppercase tracking-widest opacity-40">Syncing Command Center...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      
      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Registered" value={totalStudents.toString()} icon={Users} color="bg-blue-500" />
        <StatCard title="Present Today" value={presentToday.toString()} icon={UserCheck} color="bg-emerald-500" />
        <StatCard title="Absent Today" value={absentToday.toString()} icon={XCircle} color="bg-rose-500" />
        <StatCard title="Success Rate" value={`${attendanceRate}%`} icon={TrendingUp} color="bg-amber-500" />
      </div>

      {/* CENTER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Weekly Overview */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-xl tracking-tight">Weekly Overview</h3>
            <button onClick={handleResetAttendance} className="px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">
              Reset Logs
            </button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getWeeklyData()}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '20px', backgroundColor: '#18181b', border: 'none' }} />
                <Area type="monotone" dataKey="present" stroke="#10b981" strokeWidth={4} fill="url(#colorPresent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-xl tracking-tight">Recent Activity</h3>
            <button onClick={exportToExcel} className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:text-emerald-500">
              <Download size={20} />
            </button>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[350px]">
            {attendance.slice(-6).reverse().map((record, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-800/30">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${record.status === 'PRESENT' ? 'bg-emerald-500' : 'bg-rose-500'} text-white`}>
                  {record.status === 'PRESENT' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black truncate">{record.name}</p>
                  <p className="text-[10px] font-bold opacity-40">{record.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STUDENT DIRECTORY */}
      <div className="bg-white dark:bg-zinc-900/50 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden backdrop-blur-xl">
        <div className="p-8 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="font-black text-xl tracking-tight">Student Directory</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest opacity-40">
                <th className="px-8 py-6">ID</th>
                <th className="px-8 py-6">Name</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6">Mobile</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {students.map((student, i) => {
                const sId = student.id || (student as any).studentId || "";
                const sName = student.name || (student as any).fullName || "";
                const isAbsent = !attendance.some(a => a.studentId === sId && a.date === today);

                return (
                  <tr key={i} className="group hover:bg-emerald-500/[0.02] transition-colors">
                    <td className="px-8 py-5 font-mono text-xs font-bold text-emerald-600">{sId}</td>
                    <td className="px-8 py-5 text-sm font-bold">{sName}</td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${!isAbsent ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        {!isAbsent ? 'Present Today' : 'Absent'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-xs opacity-50">{student.mobile}</td>
                    <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                      
                      {/* --- THE BELL ALERT BUTTON (Only for absentees) --- */}
                      {isAbsent && (
                        <button
                          onClick={() => triggerAlert(sId, sName)}
                          className="relative p-2.5 bg-orange-500/10 text-orange-600 hover:bg-orange-600 hover:text-white rounded-xl transition-all"
                        >
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative h-3 w-3 rounded-full bg-orange-500"></span>
                          </span>
                          <BellRing size={16} />
                        </button>
                      )}

                      <button onClick={() => handleDeleteStudent(sId, sName)} className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
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
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900/50 p-7 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-lg group backdrop-blur-xl">
      <div className={`w-14 h-14 ${color} rounded-[1.25rem] flex items-center justify-center text-white mb-5 shadow-lg shadow-inherit transition-transform group-hover:scale-110`}>
        <Icon size={28} />
      </div>
      <h4 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">{title}</h4>
      <p className="text-4xl font-black tracking-tighter leading-none">{value}</p>
    </div>
  );
}