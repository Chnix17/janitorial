import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import { SecureStorage } from '../utils/encryption';
import { getApiBaseUrl } from '../utils/apiConfig';
import './login.css';

export default function Login() {
  const { user, login: authLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [captchaA, setCaptchaA] = useState(0);
  const [captchaB, setCaptchaB] = useState(0);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState(false);

  const from = useMemo(() => location.state?.from?.pathname, [location.state]);

  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    setCaptchaA(a);
    setCaptchaB(b);
    setCaptchaInput('');
    setCaptchaError(false);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const getRedirectPath = (roleName) => {
    switch (roleName) {
      case 'Admin':
        return '/Admin';
      case 'Student':
        return '/Student/Dashboard';
      default:
        return '/login';
    }
  };

  if (user) {
    const normalizedRole = typeof user.role === 'string' ? user.role : '';
    const roleTitle = normalizedRole ? (normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)) : '';
    const target = from || getRedirectPath(roleTitle);
    return <Navigate to={target} replace />;
  }

  const getBaseUrl = () => {
    const storedUrl = SecureStorage.getLocalItem('janitorial_url');
    return storedUrl || getApiBaseUrl();
  };

  const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

  const storeUserData = (userData) => {
    if (!userData) return;

    SecureStorage.setLocalItem('janitorial_loggedIn', 'true');
    if (userData.user_id !== undefined) SecureStorage.setLocalItem('janitorial_user_id', userData.user_id);
    if (userData.full_name !== undefined) SecureStorage.setLocalItem('janitorial_full_name', userData.full_name);
    if (userData.username !== undefined) SecureStorage.setLocalItem('janitorial_username', userData.username);
    if (userData.role_id !== undefined) SecureStorage.setLocalItem('janitorial_user_level_id', userData.role_id);
    if (userData.is_active !== undefined) SecureStorage.setLocalItem('janitorial_is_active', userData.is_active);
    if (userData.created_at !== undefined) SecureStorage.setLocalItem('janitorial_created_at', userData.created_at);

    if (userData.user_level_name !== undefined) {
      SecureStorage.setLocalItem('janitorial_user_level', userData.user_level_name);
    }
  };

 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const captchaAnswer = captchaA + captchaB;
    const numericInput = parseInt(captchaInput, 10);
    if (Number.isNaN(numericInput) || numericInput !== captchaAnswer) {
      setCaptchaError(true);
      setError('Invalid CAPTCHA. Please solve the math problem correctly.');
      generateCaptcha();
      return;
    }

    setSubmitting(true);

    localStorage.removeItem('forcedLogout');
    localStorage.removeItem('logoutReason');

    try {
      if (!username || !password) {
        setError('Please fill in all fields.');
        generateCaptcha();
        return;
      }

      const baseUrl = withSlash(getBaseUrl());
      const loginData = {
        operation: 'login',
        json: {
          username: username.trim(),
          password
        }
      };

      const response = await axios.post(`${baseUrl}login.php`, loginData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const res = response.data;
      if (res && (res.status === 'success' || res.success === true)) {
        const userData = res.data || res.user;
        if (userData) {
          storeUserData(userData);
          authLogin(userData);

          SecureStorage.setLocalItem('janitorial_userData', userData);
          SecureStorage.setSessionItem('janitorial_userData', userData);
        }

        const roleName = (userData?.user_level_name) || (() => {
          const roleMap = { 1: 'Admin', 2: 'Student' };
          return roleMap[userData?.role_id] || '';
        })();
        const role = roleName.toString().toLowerCase();

        // clear any residual error text (e.g., from prior attempts)
        setError('');

        if (role.includes('admin')) {
          navigate('/admin');
        } else if (role.includes('student')) {
          navigate('/student/dashboard');
        } else {
          navigate('/login');
        }
      } else {
        setError(res?.message || 'Login failed');
        generateCaptcha();
      }
    } catch (err) {
      console.error('Login error:', err);

      if (err?.response) {
        const errorMessage = err.response.data?.message || 'Invalid credentials';
        setError(errorMessage);
      } else if (err?.request) {
        setError('Network error. Please check your connection.');
      } else {
        setError('An unexpected error occurred');
      }
      generateCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cc-login-wrap">
      <div className="cc-login-card">
        <img className="cc-login-card-logo" src={`${process.env.PUBLIC_URL}/phinma.png`} alt="PHINMA" />

        <div className="cc-login-header">
          <div className="cc-login-title">CleanCheck PH</div>
          <div className="cc-login-sub">School Facility Monitoring</div>
        </div>

        <form className="cc-login-form" onSubmit={handleSubmit}>
          <label className="cc-label">
            Username
            <input
              className="cc-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="cc-label">
            Password
            <input
              className="cc-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          <label className="cc-label">
            CAPTCHA: {captchaA} + {captchaB} = ?
            <input
              className="cc-input"
              value={captchaInput}
              onChange={(e) => {
                setCaptchaInput(e.target.value);
                setCaptchaError(false);
              }}
              inputMode="numeric"
              autoComplete="off"
            />
          </label>

          {error ? <div className="cc-error">{error}</div> : null}

          <button
            className="cc-btn cc-btn-primary"
            type="submit"
            disabled={submitting || !username || !password}
          >
            {submitting ? 'Signing in…' : 'Login'}
          </button>

          <div className="cc-login-note">
            Accounts are created by admins only.
          </div>
        </form>
      </div>
    </div>
  );
}
