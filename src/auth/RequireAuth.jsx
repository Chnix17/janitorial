import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const roleHomePath = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'student') return '/student';
  if (role === 'teacher') return '/teacher';
  if (role === 'staff') return '/staff';
  return '/login';
};

export default function RequireAuth({ allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to={roleHomePath(user.role)} replace />;
    }
  }

  return <Outlet />;
}
