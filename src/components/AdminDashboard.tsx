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

  // --- LOGIC: MANUAL SMS ALERT ---
  const triggerAlert = async (id: string, name: string) => {
    const confirm = window.confirm(`Send urgent Security Alert SMS to ${name}?`);
    if (!confirm) return;

    try {
      const res = await fetch('/api/manual-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id })
      });

      if (res.ok) {
        alert(`✅ Alert successfully dispatched to ${name}.`);
      } else {
        alert('❌ Failed to reach SMS Gateway. Check API logs.');
      }
    } catch (error) {
      console.error("SMS Error:", error);
      alert('⚠️ Critical system error while sending SMS.');
    }
  };

  // --- LOGIC: DELETE STUDENT ---
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (window.confirm(`Are you sure you want to delete ${studentName}? This will permanently remove their registration and face data.`)) {
      try {
        const res = await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
        if (res.ok) {
          setStudents(students.filter(s => (s.id || (s as any).studentId) !== studentId));
        } else {
          alert('Failed to delete student from database.');
        }
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  // --- LOGIC: CLEAR ATTENDANCE ---
  const handleResetAttendance = async () => {
    if (window.confirm('WARNING: This will clear all attendance records. Are you sure you want to start fresh for the next day?')) {
      try {
        const res = await fetch('/api/attendance', { method: 'DELETE' });
        if (res.ok) {
          setAttendance([]); 
        }
      } catch (err) {
        console.error('Failed to reset attendance:', err);
      }
    }
  };

  const todayDate = new Date();
  const today = todayDate.toISOString().split('T')[0];
  
  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split('T')[0];

  const presentToday = attendance.filter(a => a.date === today && a.status === 'PRESENT').length;
  const totalStudents = students.length;
  const absentToday = totalStudents > 0 ? totalStudents - presentToday : 0;
  const attendanceRate = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0;

  // Dynamic trends logic
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const newStudentsThisWeek = students.filter(s => s.createdAt && new Date(s.createdAt) >= oneWeekAgo).length;

  const presentYesterday = attendance.filter(a => a.date === yesterday && a.status === 'PRESENT').length;
  const attendanceRateYesterday = totalStudents > 0 ? Math.round((presentYesterday / totalStudents) * 100) : 0;
  const rateDiff = attendanceRate - attendanceRateYesterday;

  const uniqueDates = [...new Set(attendance.map(a => a.date))];
  const totalPresentAllTime = attendance.filter(a => a.status === 'PRESENT').length;
  const avgPresent = uniqueDates.length > 0 ? totalPresentAllTime / uniqueDates.length : 0;

  const presentTrendText = totalStudents === 0 ? "No data" : (presentToday >= avgPresent ? "Above avg" : "Below avg");
  const presentTrendUp = presentToday >= avgPresent;

  const absentTrendText = totalStudents === 0 ? "No data" : (absentToday > 0 ? "Outstanding" : "Perfect");
  const absentTrendUp = absentToday === 0;

  const rateTrendText = totalStudents === 0 ? "No data" : `${rateDiff >= 0 ? '+' : ''}${rateDiff}% vs yesterday`;
  const rateTrendUp = rateDiff >= 0;
  
  const studentTrendText = totalStudents === 0 ? "No data" : `+${newStudentsThisWeek} new`;
  const studentTrendUp = newStudentsThisWeek > 0;

  const getWeeklyData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = days.map(day => ({ name: day, present: 0 }));
    if (totalStudents === 0) return data;
    const currentDayOfWeek = todayDate.getDay() || 7; 
    attendance.forEach(record => {
      const recordDate = new Date(record.date);
      const dayIndex = (recordDate.getDay() || 7) - 1; 
      const diffTime = todayDate.getTime() - recordDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7 && diffDays >= 0 && dayIndex <= currentDayOfWeek - 1) {
        if (record.status === 'PRESENT') {
          data[dayIndex].present += 1;
        }
      }
    });
    return data;
  };

  const weeklyData = getWeeklyData();

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
      
      {/* 1. TOP STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Registered" value={totalStudents.toString()} icon={Users} color="bg-blue-500" trend={studentTrendText} trendUp={studentTrendUp} />
        <StatCard title="Present Today" value={presentToday.toString()} icon={UserCheck} color="bg-emerald-500" trend={presentTrendText} trendUp={presentTrendUp} />
        <StatCard title="Absent" value={absentToday.toString()} icon={XCircle} color="bg-rose-500" trend={absentTrendText} trendUp={absentTrendUp} />
        <StatCard title="Success Rate" value={`${attendanceRate}%`} icon={TrendingUp} color="bg-amber-500" trend={rateTrendText} trendUp={rateTrendUp} />
      </div>

      {/* 2. BENTO CENTER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weekly Chart Card */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-black/5 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="font-black text-xl tracking-tight">Weekly Overview</h3>
                <p className="text-xs font-bold uppercase tracking-widest opacity-40">Attendance Velocity</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleResetAttendance}
                className="group flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 text-rose-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95"
              >
                <Trash2 size={14} className="group-hover:rotate-12 transition-transform" />
                Reset Logs
              </button>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#71717a' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#71717a' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', backgroundColor: '#18181b', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="present" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorPresent)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white dark:bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-black/5 flex flex-col backdrop-blur-xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-xl tracking-tight">Activity</h3>
            <button onClick={exportToExcel} className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:text-emerald-500 transition-colors">
              <Download size={20} />
            </button>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {attendance.slice(-6).reverse().map((record, i) => (
              <div key={i} className="group flex items-center gap-4 p-4 rounded-3xl bg-zinc-50 dark:bg-zinc-800/30 border border-transparent hover:border-emerald-500/30 transition-all">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${record.status === 'PRESENT' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                  {record.status === 'PRESENT' ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate">{record.name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{record.time}</p>
                </div>
                <div className="text-right">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </div>
            ))}
            {attendance.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                <Activity size={48} />
                <p className="text-xs font-bold uppercase tracking-widest mt-4">Waiting for logs...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. PROFESSIONAL STUDENT DIRECTORY */}
      <div className="bg-white dark:bg-zinc-900/50 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-black/5 overflow-hidden backdrop-blur-xl">
        <div className="p-8 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Users size={20} />
             </div>
             <h3 className="font-black text-xl tracking-tight">Student Directory</h3>
          </div>
          <span className="px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black uppercase tracking-widest opacity-50">
            {totalStudents} Identities Encrypted
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                <th className="px-8 py-6">Identity ID</th>
                <th className="px-8 py-6">Full Name</th>
                <th className="px-8 py-6">Department</th>
                <th className="px-8 py-6">Mobile</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {students.map((student, i) => {
                const sId = student.id || (student as any).studentId || "";
                const sName = student.name || (student as any).fullName || "";
                return (
                  <tr key={i} className="hover:bg-emerald-500/[0.02] transition-colors group">
                    <td className="px-8 py-5 font-mono text-xs font-bold text-emerald-600">{sId}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black">
                          {sName.charAt(0)}
                        </div>
                        <span className="text-sm font-bold tracking-tight">{sName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-bold opacity-60">{student.className || '-'} • {student.section || '-'}</span>
                    </td>
                    <td className="px-8 py-5 text-xs font-medium opacity-50">{student.mobile}</td>
                    <td className="px-8 py-5 text-right flex items-center justify-end gap-2">
                      {/* --- NEW: MANUAL SMS ALERT BUTTON --- */}
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

                      {/* DELETE BUTTON */}
                      <button 
                        onClick={() => handleDeleteStudent(sId, sName)}
                        className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Student"
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
  );
}

// Polished Stat Card Component
function StatCard({ title, value, icon: Icon, color, trend, trendUp }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900/50 p-7 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-lg shadow-black/5 hover:shadow-emerald-500/5 transition-all group backdrop-blur-xl">
      <div className="flex items-start justify-between mb-5">
        <div className={`w-14 h-14 ${color} rounded-[1.25rem] flex items-center justify-center text-white shadow-2xl shadow-inherit transition-transform group-hover:scale-110 duration-500`}>
          <Icon size={28} />
        </div>
        {trend !== "No data" && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${trendUp ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {trendUp ? <ArrowUpRight size={12} strokeWidth={3} /> : <ArrowDownRight size={12} strokeWidth={3} />}
            {trend}
          </div>
        )}
      </div>
      <h4 className="text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{title}</h4>
      <p className="text-4xl font-black tracking-tighter leading-none">{value}</p>
    </div>
  );
}