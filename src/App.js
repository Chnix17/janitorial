import './App.css';

import React, { useEffect } from 'react';
import { message } from 'antd';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/Admin/AdminDashboard';
import StudentDashboard from './pages/Student/StudentDashboard';
import ProtectedRoute from './utils/ProtectedRoute';
import NotFound from './components/NotFound';
import UsersManagement from './pages/Admin/UsersManagement';
// import RoomsBuildingsManagement from './pages/Admin/RoomsBuildingsManagement';
import AdminBuildings from './pages/Admin/AdminBuildings';
import AdminRooms from './pages/Admin/AdminRooms';
import AdminFloors from './pages/Admin/AdminFloors';
import AdminFloorNames from './pages/Admin/AdminFloorNames';
import AdminAssignments from './pages/Admin/AdminAssignments';
import AdminRoomChecklists from './pages/Admin/AdminRoomChecklists';
import AdminActivity from './pages/Admin/AdminActivity';
import StudentAssignments from './pages/Student/StudentAssignments';
import Activity from './pages/Student/Activity';
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
    message.config({
      top: 16,
      duration: 3,
      maxCount: 3
    });
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter basename="/gsd/janitorial">
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
            <Route path="buildings" element={<AdminBuildings />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="checklists" element={<AdminRoomChecklists />} />
            <Route path="floors" element={<AdminFloors />} />
            <Route path="floor-names" element={<AdminFloorNames />} />
            <Route path="assignments" element={<AdminAssignments />} />
            <Route path="inspections" element={<div>Inspections (coming soon)</div>} />
            <Route path="activity" element={<AdminActivity />} />
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
            <Route path="Activity" element={<Activity />} />
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
            <Route path="buildings" element={<AdminBuildings />} />
            <Route path="rooms" element={<AdminRooms />} />
            <Route path="checklists" element={<AdminRoomChecklists />} />
            <Route path="floors" element={<AdminFloors />} />
            <Route path="floor-names" element={<AdminFloorNames />} />
            <Route path="assignments" element={<AdminAssignments />} />
            <Route path="inspections" element={<div>Inspections (coming soon)</div>} />
            <Route path="activity" element={<AdminActivity />} />
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
            <Route path="assignments" element={<StudentAssignments />} />
            <Route path="inspection" element={<StudentAssignments />} />
            <Route path="activity" element={<Activity />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;