import React, { useEffect, useState } from 'react';
import { 
  History, 
  Calendar, 
  Clock, 
  Smile, 
  CheckCircle2, 
  XCircle, 
  Percent, 
  User as UserIcon,
  Activity
} from 'lucide-react';
import { AttendanceRecord, User } from '../types';
import { format } from 'date-fns';

interface StudentDashboardProps {
  user: User;
}

export default function StudentDashboard({ user }: StudentDashboardProps) {
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/attendance');
        const data = await res.json();
        // Filter for this student by ID
        const studentHistory = data.filter((r: AttendanceRecord) => r.studentId === user.id);
        setHistory(studentHistory);
      } catch (error) {
        console.error('Failed to fetch history', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user.id]);

  const today = new Date().toISOString().split('T')[0];
  const todayRecord = history.find(r => r.date === today);
  const isPresentToday = todayRecord?.status === 'PRESENT';

  // Stats Logic
  const totalClasses = history.length;
  const presentCount = history.filter(r => r.status === 'PRESENT').length;
  const attendancePercentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 space-y-4">
      <Activity className="text-blue-500 animate-spin" size={32} />
      <p className="text-sm font-medium text-zinc-500">Retrieving your identity logs...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-700">
      
      {/* 1. WELCOME HEADER (Google Style) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/20">
              {user.name.charAt(0)}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white dark:border-zinc-900 ${isPresentToday ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
              Welcome back, {user.name.split(' ')[0]}
            </h1>
            <p className="text-sm font-medium text-zinc-500">
              Identity ID: <span className="font-mono text-blue-500">{user.id}</span> • {user.className} {user.section}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-2xl border border-zinc-100 dark:border-zinc-800">
          <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${isPresentToday ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
            {isPresentToday ? 'Currently Present' : 'Currently Absent'}
          </div>
        </div>
      </div>

      {/* 2. STATS BENTO GRID (Zoho Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Attendance Rate" value={`${attendancePercentage}%`} icon={Percent} color="text-blue-500" bg="bg-blue-500/5" />
        <MetricCard title="Total Days" value={totalClasses.toString()} icon={Calendar} color="text-zinc-500" bg="bg-zinc-500/5" />
        <MetricCard title="Present" value={presentCount.toString()} icon={CheckCircle2} color="text-emerald-500" bg="bg-emerald-500/5" />
        <MetricCard title="Absent" value={(totalClasses - presentCount).toString()} icon={XCircle} color="text-rose-500" bg="bg-rose-500/5" />
      </div>

      {/* 3. HISTORY TABLE (Corporate Clean Style) */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-black/5 overflow-hidden">
        <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="font-black text-lg tracking-tight flex items-center gap-2 text-zinc-800 dark:text-zinc-100">
            <History className="text-blue-500" size={20} />
            Attendance Timeline
          </h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Last 30 Logs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
                <th className="px-8 py-5">Timestamp</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Mood Analytics</th>
                <th className="px-8 py-5 text-right">Confidence Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {history.map((record, i) => (
                <tr key={i} className="hover:bg-blue-500/[0.02] transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                        {format(new Date(record.date), 'EEEE, MMM dd')}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                        <Clock size={10} /> {record.time}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider ${
                      record.status === 'PRESENT' 
                        ? 'bg-emerald-500/10 text-emerald-600' 
                        : 'bg-rose-500/10 text-rose-600'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                        <Smile size={14} />
                      </div>
                      <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 capitalize">
                        {record.emotion || 'Neutral'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-end gap-3">
                      <div className="w-24 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-1000" 
                          style={{ width: `${record.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-zinc-400">
                        {Math.round(record.confidence * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <Activity size={48} />
                      <p className="text-sm font-bold uppercase tracking-tighter mt-4">No records found in database</p>
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

// Sub-component for the Metric Cards
function MetricCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all">
      <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center mb-4`}>
        <Icon size={20} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">{title}</p>
      <p className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{value}</p>
    </div>
  );
}