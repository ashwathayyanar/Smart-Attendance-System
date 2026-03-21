import React, { useEffect, useState } from 'react';
import { History, Calendar, Clock, Smile, CheckCircle2, XCircle } from 'lucide-react';
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
        // Filter for this student
        const studentHistory = data.filter((r: AttendanceRecord) => r.studentId === user.id && r.name === user.name);
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

  const stats = {
    total: history.length,
    present: history.filter(r => r.status === 'PRESENT').length,
    absent: history.filter(r => r.status === 'ABSENT').length,
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading your history...</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center text-white text-3xl font-bold">
              {user.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{user.name}</h2>
              <p className="opacity-50">Student ID: {user.id}</p>
              {(user.className || user.section) && (
                <p className="opacity-50 text-sm mt-1">
                  Class: {user.className || '-'} | Section: {user.section || '-'}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs font-bold px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full">
                  {stats.present} Total Present
                </span>
                <span className="text-xs font-bold px-3 py-1 bg-rose-500/10 text-rose-500 rounded-full">
                  {stats.absent} Total Absent
                </span>
              </div>
            </div>
          </div>
          <div className="text-center p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
            <p className="text-sm font-medium opacity-50 mb-1">Today's Status</p>
            {isPresentToday ? (
              <div className="flex items-center gap-2 text-emerald-500 font-bold">
                <CheckCircle2 size={24} />
                <span>Present</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-rose-500 font-bold">
                <XCircle size={24} />
                <span>Absent</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <History className="text-emerald-500" size={20} />
            Attendance History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-xs font-bold uppercase tracking-wider opacity-50">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Emotion</th>
                <th className="px-6 py-4">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {history.map((record, i) => (
                <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="opacity-30" />
                      <span className="text-sm font-medium">{format(new Date(record.date), 'MMM dd, yyyy')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="opacity-30" />
                      <span className="text-sm">{record.time}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      record.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Smile size={14} className="opacity-30" />
                      <span className="text-sm capitalize">{record.emotion || 'Neutral'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-24 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${record.confidence * 100}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center opacity-30 italic">
                    No attendance records found
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
