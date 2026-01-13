import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SecureStorage } from '../utils/encryption';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const loggedIn = SecureStorage.getLocalItem('janitorial_loggedIn') ?? SecureStorage.getLocalItem('loggedIn');
      const isLoggedIn = loggedIn === 'true' || loggedIn === true;
      if (isLoggedIn) {
        const roleName = SecureStorage.getLocalItem('janitorial_user_level') ?? SecureStorage.getLocalItem('user_level');
        const userData = {
          user_id: SecureStorage.getLocalItem('janitorial_user_id') ?? SecureStorage.getLocalItem('user_id'),
          full_name: SecureStorage.getLocalItem('janitorial_full_name') ?? SecureStorage.getLocalItem('full_name'),
          username: SecureStorage.getLocalItem('janitorial_username') ?? SecureStorage.getLocalItem('username'),
          role: typeof roleName === 'string' ? roleName.toLowerCase() : roleName,
          role_id: SecureStorage.getLocalItem('janitorial_user_level_id') ?? SecureStorage.getLocalItem('user_level_id'),
          is_active: SecureStorage.getLocalItem('janitorial_is_active') ?? SecureStorage.getLocalItem('is_active'),
          created_at: SecureStorage.getLocalItem('janitorial_created_at') ?? SecureStorage.getLocalItem('created_at')
        };

        // If stored data is incomplete/corrupt, treat as logged out.
        if (userData.user_id && userData.username && userData.role) {
          setUser(userData);
        } else {
          setUser(null);
          localStorage.removeItem('janitorial_loggedIn');
          localStorage.removeItem('loggedIn');
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const getRoleName = (roleId) => {
    const roleMap = {
      1: 'Admin',
      2: 'Student',
      3: 'Teacher',
      4: 'Staff'
    };
    return roleMap[roleId] || 'User';
  };

  const login = useCallback((userData) => {
    const roleName = getRoleName(userData.role_id);
    
    SecureStorage.setLocalItem('janitorial_loggedIn', 'true');
    SecureStorage.setLocalItem('janitorial_user_id', userData.user_id);
    SecureStorage.setLocalItem('janitorial_full_name', userData.full_name);
    SecureStorage.setLocalItem('janitorial_username', userData.username);
    SecureStorage.setLocalItem('janitorial_user_level', roleName);
    SecureStorage.setLocalItem('janitorial_user_level_id', userData.role_id);
    SecureStorage.setLocalItem('janitorial_is_active', userData.is_active);
    SecureStorage.setLocalItem('janitorial_created_at', userData.created_at);

    // Set cookie for session management
    document.cookie = `user_session=${userData.user_id}; path=/; max-age=86400; SameSite=Strict; ${window.location.protocol === 'https:' ? 'Secure;' : ''}`;

    const userWithRole = {
      ...userData,
      role: roleName.toLowerCase() // Convert to lowercase for existing logic
    };
    
    setUser(userWithRole);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    
    localStorage.removeItem('janitorial_loggedIn');
    localStorage.removeItem('janitorial_user_id');
    localStorage.removeItem('janitorial_full_name');
    localStorage.removeItem('janitorial_username');
    localStorage.removeItem('janitorial_user_level');
    localStorage.removeItem('janitorial_user_level_id');
    localStorage.removeItem('janitorial_is_active');
    localStorage.removeItem('janitorial_created_at');
    localStorage.removeItem('janitorial_userData');

    localStorage.removeItem('loggedIn');
    localStorage.removeItem('user_id');
    localStorage.removeItem('full_name');
    localStorage.removeItem('username');
    localStorage.removeItem('user_level');
    localStorage.removeItem('user_level_id');
    localStorage.removeItem('is_active');
    localStorage.removeItem('created_at');
    
    // Clear cookie
    document.cookie = 'user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, isAuthenticated: !!user }),
    [user, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
