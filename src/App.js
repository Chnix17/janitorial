import './App.css';

import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/Admin/AdminDashboard';
import StudentDashboard from './pages/Student/StudentDashboard';
import ProtectedRoute from './utils/ProtectedRoute';
import NotFound from './components/NotFound';
import UsersManagement from './pages/Admin/UsersManagement';
import { getApiBaseUrl } from './utils/apiConfig';
import { SecureStorage } from './utils/encryption';
import AppShell from './components/AppShell';

function App() {
  const initializeApiUrl = () => {
    const defaultUrl = getApiBaseUrl();
    const storedUrl = SecureStorage.getLocalItem('janitorial_url') ?? SecureStorage.getLocalItem('url');

    if (!storedUrl || storedUrl !== defaultUrl) {
      SecureStorage.setLocalItem('janitorial_url', defaultUrl);
    }
  };

  useEffect(() => {
    initializeApiUrl();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/Admin"
            element={(
              <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                <AppShell title="Administrator" homePath="/Admin" />
              </ProtectedRoute>
            )}
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UsersManagement />} />
          </Route>

          <Route
            path="/Student"
            element={(
              <ProtectedRoute allowedRoles={['Student']}>
                <AppShell title="Student" homePath="/Student/Dashboard" />
              </ProtectedRoute>
            )}
          >
            <Route path="Dashboard" element={<StudentDashboard />} />
          </Route>

          {/* Lowercase aliases to support navigation/link variations */}
          <Route
            path="/admin"
            element={(
              <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                <AppShell title="Administrator" homePath="/admin" />
              </ProtectedRoute>
            )}
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UsersManagement />} />
          </Route>

          <Route
            path="/student"
            element={(
              <ProtectedRoute allowedRoles={['Student']}>
                <AppShell title="Student" homePath="/student/dashboard" />
              </ProtectedRoute>
            )}
          >
            <Route path="dashboard" element={<StudentDashboard />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;