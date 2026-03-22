import React, { useEffect, useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Trash2 // Added for Delete feature
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
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

  // --- FEATURE: DELETE STUDENT LOGIC ---
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (window.confirm(`Are you sure you want to delete ${studentName}? This will permanently remove their registration and face data.`)) {
      try {
        const res = await fetch(`/api/students/${studentId}`, { method: 'DELETE' });
        if (res.ok) {
          // Instantly remove from the UI list
          setStudents(students.filter(s => (s.id || (s as any).studentId) !== studentId));
        } else {
          alert('Failed to delete student from database.');
        }
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  // --- FEATURE: CLEAR ATTENDANCE LOGIC ---
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

  const presentTrendText = totalStudents === 0 ? "No data" : (presentToday >= avgPresent ? "Above average" : "Below average");
  const presentTrendUp = presentToday >= avgPresent;

  const absentTrendText = totalStudents === 0 ? "No data" : (absentToday > 0 ? "Check notifications" : "All present");
  const absentTrendUp = absentToday === 0;

  const rateTrendText = totalStudents === 0 ? "No data" : `${rateDiff >= 0 ? '+' : ''}${rateDiff}% from yesterday`;
  const rateTrendUp = rateDiff >= 0;
  
  const studentTrendText = totalStudents === 0 ? "No data" : `+${newStudentsThisWeek} this week`;
  const studentTrendUp = newStudentsThisWeek > 0;

  const getWeeklyData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = days.map(day => ({ name: day, present: 0, absent: 0 }));
    
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

  if (loading) return <div className="flex items-center justify-center h-64">Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Students" value={totalStudents.toString()} icon={Users} color="bg-blue-500" trend={studentTrendText} trendUp={studentTrendUp} />
        <StatCard title="Present Today" value={presentToday.toString()} icon={CheckCircle2} color="bg-emerald-500" trend={presentTrendText} trendUp={presentTrendUp} />
        <StatCard title="Absent Today" value={absentToday.toString()} icon={XCircle} color="bg-rose-500" trend={absentTrendText} trendUp={absentTrendUp} />
        <StatCard title="Attendance Rate" value={`${attendanceRate}%`} icon={TrendingUp} color="bg-amber-500" trend={rateTrendText} trendUp={rateTrendUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg">Weekly Overview</h3>
              <p className="text-sm opacity-50">Attendance trends for the current week</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden md:flex items-center gap-4 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span>Present</span>
                </div>
              </div>
              {/* CLEAR LOGS BUTTON */}
              <button 
                onClick={handleResetAttendance}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl text-xs font-bold hover:bg-rose-500 hover:text-white transition-all"
              >
                <Trash2 size={14} />
                Clear Records
              </button>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                <Area type="monotone" dataKey="present" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Recent Activity</h3>
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all">
              <Download size={16} />
              Export
            </button>
          </div>
          <div className="space-y-4">
            {attendance.slice(-6).reverse().map((record, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${record.status === 'PRESENT' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                  {record.status === 'PRESENT' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold truncate">{record.name}</p>
                  <p className="text-xs opacity-50">{record.time} • {record.date}</p>
                </div>
              </div>
            ))}
            {attendance.length === 0 && <p className="text-center opacity-50 py-12 italic text-sm">No activity yet.</p>}
          </div>
        </div>
      </div>

      {/* Registered Students List with DELETE ACTION */}
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
          <Users className="text-blue-500" size={20} />
          Registered Students
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-xs font-bold uppercase tracking-wider opacity-50">
                <th className="px-6 py-4">Student ID</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Section</th>
                <th className="px-6 py-4">Mobile</th>
                <th className="px-6 py-4">Registration Date</th>
                <th className="px-6 py-4 text-right">Action</th> {/* New Column */}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {students.map((student, i) => {
                const sId = student.id || (student as any).studentId || "";
                const sName = student.name || (student as any).fullName || "";
                return (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all group">
                    <td className="px-6 py-4 font-mono text-sm">{sId}</td>
                    <td className="px-6 py-4 font-medium">{sName}</td>
                    <td className="px-6 py-4 text-sm opacity-70">{student.className || '-'}</td>
                    <td className="px-6 py-4 text-sm opacity-70">{student.section || '-'}</td>
                    <td className="px-6 py-4 text-sm opacity-70">{student.mobile}</td>
                    <td className="px-6 py-4 text-sm opacity-70">
                      {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {/* DELETE STUDENT BUTTON */}
                      <button 
                        onClick={() => handleDeleteStudent(sId, sName)}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Student"
                      >
                        <Trash2 size={18} />
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

function StatCard({ title, value, icon: Icon, color, trend, trendUp, neutral }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
          <Icon size={24} />
        </div>
        {trend !== "No data" && (
          <div className={`flex items-center gap-1 text-xs font-bold ${neutral ? 'text-zinc-500' : (trendUp ? 'text-emerald-500' : 'text-rose-500')}`}>
            {!neutral && (trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />)}
            {trend}
          </div>
        )}
      </div>
      <h4 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">{title}</h4>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}