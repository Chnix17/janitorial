import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import RequireAuth from './auth/RequireAuth';
import { useAuth } from './auth/AuthContext';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';

const roleHomePath = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'student') return '/student';
  if (role === 'teacher') return '/teacher';
  if (role === 'staff') return '/staff';
  return '/login';
};

function IndexRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={roleHomePath(user.role)} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<IndexRedirect />} />
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth allowedRoles={['admin']} />}>
        <Route element={<AppShell title="Administrator" homePath="/admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<div>Users (coming soon)</div>} />
          <Route path="/admin/assignments" element={<div>Assignments (coming soon)</div>} />
          <Route path="/admin/reports" element={<div>Reports (coming soon)</div>} />
        </Route>
      </Route>

      <Route element={<RequireAuth allowedRoles={['student']} />}>
        <Route element={<AppShell title="Student" homePath="/student" />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/assignments" element={<div>My Assignments (coming soon)</div>} />
          <Route path="/student/inspection" element={<div>Submit Inspection (coming soon)</div>} />
          <Route path="/student/activity" element={<div>My Activity (coming soon)</div>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
