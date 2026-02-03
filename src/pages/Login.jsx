import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import { SecureStorage } from '../utils/encryption';
import { getApiBaseUrl } from '../utils/apiConfig';
import { toast } from '../utils/toast';

export default function Login() {
  const { user, login: authLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [captchaText, setCaptchaText] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const captchaCanvasRef = useRef(null);

  const from = useMemo(() => location.state?.from?.pathname, [location.state]);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let next = '';
    for (let i = 0; i < 6; i++) {
      next += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(next);
    setCaptchaInput('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  useEffect(() => {
    const canvas = captchaCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#eef2ff');
    bg.addColorStop(1, '#ecfeff');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const r = Math.random() * 1.5 + 0.3;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(2, 6, 23, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * w, Math.random() * h);
      ctx.bezierCurveTo(
        Math.random() * w,
        Math.random() * h,
        Math.random() * w,
        Math.random() * h,
        Math.random() * w,
        Math.random() * h
      );
      ctx.stroke();
    }

    const text = (captchaText || '').toUpperCase();
    const charWidth = w / (text.length + 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const x = charWidth * (i + 1);
      const y = h / 2 + (Math.random() * 10 - 5);
      const angle = (Math.random() * 0.55 - 0.275);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      const hue = 200 + Math.floor(Math.random() * 90);
      ctx.fillStyle = `hsl(${hue}, 70%, 28%)`;
      ctx.shadowColor = 'rgba(2, 6, 23, 0.18)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      ctx.fillText(ch, 0, 0);

      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }, [captchaText]);

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

    const normalizedInput = captchaInput.trim().toUpperCase();
    if (!normalizedInput || normalizedInput !== captchaText) {
      toast.error('Invalid CAPTCHA. Please enter the letters correctly.');
      generateCaptcha();
      return;
    }

    setSubmitting(true);

    localStorage.removeItem('forcedLogout');
    localStorage.removeItem('logoutReason');

    try {
      if (!username || !password) {
        toast.error('Please fill in all fields.');
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
        toast.success('Login successful.');

        if (role.includes('admin')) {
          navigate('/admin');
        } else if (role.includes('student')) {
          navigate('/student/dashboard');
        } else {
          navigate('/login');
        }
      } else {
        toast.error(res?.message || 'Login failed');
        generateCaptcha();
      }
    } catch (err) {
      console.error('Login error:', err);

      if (err?.response) {
        const errorMessage = err.response.data?.message || 'Invalid credentials';
        toast.error(errorMessage);
      } else if (err?.request) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error('An unexpected error occurred');
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
          <div className="cc-login-title">GSD Janitorial</div>
          <div className="cc-login-sub">School Facility Monitoring</div>
        </div>

        <form className="cc-login-form" onSubmit={handleSubmit} noValidate>
          <label className="cc-label">
            Username
            <input
              className="cc-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoFocus
              autoComplete="username"
            />
          </label>

          <label className="cc-label">
            Password
            <div className="cc-input-group">
              <input
                className="cc-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                aria-label="Password"
              />
              <button
                type="button"
                className="cc-input-action"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <label className="cc-label">
            <span className="cc-label-row">
              <span>CAPTCHA</span>
              <button
                type="button"
                className="cc-btn cc-btn-ghost cc-btn-sm"
                onClick={generateCaptcha}
                aria-label="Refresh CAPTCHA"
              >
                Refresh
              </button>
            </span>
            <canvas
              ref={captchaCanvasRef}
              width={240}
              height={60}
              style={{ width: '100%', height: 60, borderRadius: 10, display: 'block' }}
            />
            <input
              className="cc-input"
              value={captchaInput}
              onChange={(e) => {
                setCaptchaInput(e.target.value);
              }}
              autoComplete="off"
              placeholder="Enter the letters"
            />
          </label>

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
