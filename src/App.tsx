import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './components/Landing';
import AdminDashboard from './components/AdminDashboard';
import StudentRegistration from './components/StudentRegistration';
import AttendanceMode from './components/AttendanceMode';
import AttendanceLogs from './components/AttendanceLogs';
import StudentDashboard from './components/StudentDashboard';
import { User, AuthState } from './types';

export default function App() {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('smart_attendance_auth');
    return saved ? JSON.parse(saved) : { user: null, isAuthenticated: false };
  });
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('smart_attendance_theme');
    return saved === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('smart_attendance_auth', JSON.stringify(auth));
  }, [auth]);

  useEffect(() => {
    localStorage.setItem('smart_attendance_theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogin = (user: User) => {
    setAuth({ user, isAuthenticated: true });
  };

  const handleLogout = () => {
    setAuth({ user: null, isAuthenticated: false });
  };

  if (!auth.isAuthenticated) {
    return <Landing onLogin={handleLogin} darkMode={darkMode} />;
  }

  return (
    <Router>
      <Layout 
        user={auth.user} 
        onLogout={handleLogout} 
        darkMode={darkMode} 
        setDarkMode={setDarkMode}
      >
        <Routes>
          {auth.user?.role === 'admin' ? (
            <>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/register" element={<StudentRegistration />} />
              <Route path="/admin/attendance" element={<AttendanceMode />} />
              <Route path="/admin/logs" element={<AttendanceLogs />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </>
          ) : (
            <>
              <Route path="/student" element={<StudentDashboard user={auth.user!} />} />
              <Route path="*" element={<Navigate to="/student" replace />} />
            </>
          )}
        </Routes>
      </Layout>
    </Router>
  );
}

