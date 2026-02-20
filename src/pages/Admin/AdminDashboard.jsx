import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import axios from 'axios';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { toast } from '../../utils/toast';

// --- Icons Component ---
const Icon = ({ name, className = '' }) => {
  const icons = {
    users: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M20 8v6M23 11h-6" />
      </svg>
    ),
    building: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 21h18M5 21V7l8-4 8 4v14M8 21v-4a2 2 0 0 1 4 0v4" />
      </svg>
    ),
    door: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 21h18M5 21V7l8-4 8 4v14M8 21v-4a2 2 0 0 1 4 0v4" />
        <rect x="14" y="10" width="4" height="4" rx="1" />
      </svg>
    ),
    clipboardCheck: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="2" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    pulse: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    activity: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    arrowRight: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    ),
    loader: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${className} animate-spin`}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    ),
    empty: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0h-2.586a1 1 0 0 0-.707.293l-2.414 2.414a1 1 0 0 1-.707.293h-3.172a1 1 0 0 1-.707-.293l-2.414-2.414A1 1 0 0 0 6.586 13H4" />
      </svg>
    ),
  };
  return icons[name] || null;
};

// --- Skeleton Loader Component ---
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
);

// --- Stat Card Component ---
const StatCard = ({ to, title, value, loading, icon, variant = 'default' }) => {
  const variants = {
    default: 'bg-white border-slate-200 hover:border-emerald-300',
    emerald: 'bg-gradient-to-br from-emerald-600 to-emerald-500 text-white border-transparent',
    amber: 'bg-gradient-to-br from-amber-500 to-orange-500 text-slate-900 border-transparent',
  };

  const iconBgVariants = {
    default: 'bg-emerald-50 text-emerald-600',
    emerald: 'bg-white/20 text-white',
    amber: 'bg-black/10 text-slate-900',
  };

  const titleColorVariants = {
    default: 'text-slate-500',
    emerald: 'text-emerald-100',
    amber: 'text-slate-900/70',
  };

  return (
    <NavLink
      to={to}
      className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${variants[variant]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className={`text-xs font-semibold uppercase tracking-wider ${titleColorVariants[variant]}`}>
            {title}
          </div>
          <div className="mt-2">
            {loading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <div className={`text-3xl font-bold tracking-tight ${variant === 'default' ? 'text-slate-900' : ''}`}>
                {value}
              </div>
            )}
          </div>
        </div>
        <div className={`flex-shrink-0 grid h-11 w-11 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${iconBgVariants[variant]}`}>
          <Icon name={icon} className="w-5 h-5" />
        </div>
      </div>
    </NavLink>
  );
};

// --- Panel Component ---
const Panel = ({ title, to, children, actionLabel = 'View All' }) => (
  <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
    <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <NavLink
        to={to}
        className="group inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
      >
        {actionLabel}
        <Icon name="arrowRight" className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </NavLink>
    </div>
    <div className="flex-1 p-6">
      {children}
    </div>
  </div>
);

// --- Empty State Component ---
const EmptyState = ({ message, icon = 'empty' }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className="mb-3 text-slate-300">
      <Icon name={icon} className="w-12 h-12" />
    </div>
    <p className="text-sm text-slate-500">{message}</p>
  </div>
);

// --- Loading State Component ---
const LoadingState = () => (
  <div className="flex items-center justify-center py-10">
    <Icon name="loader" className="w-6 h-6 text-emerald-600" />
  </div>
);

// --- Main Dashboard Component ---
export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [studentsCount, setStudentsCount] = useState(0);
  const [buildingsCount, setBuildingsCount] = useState(0);
  const [roomsCount, setRoomsCount] = useState(0);

  const [todayActivityLoading, setTodayActivityLoading] = useState(true);
  const [todayActivity, setTodayActivity] = useState([]);

  const [recentInspectionsLoading, setRecentInspectionsLoading] = useState(true);
  const [recentInspections, setRecentInspections] = useState([]);

  const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

  const baseUrl = useMemo(() => {
    const storedUrl = SecureStorage.getLocalItem('janitorial_url');
    return withSlash(storedUrl || getApiBaseUrl());
  }, []);

  const todayYmd = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const fmtShortDate = (val) => {
    if (!val) return '';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const initials = (name) => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '—';
    const a = parts[0]?.[0] || '';
    const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] || '') : '';
    return (a + b).toUpperCase();
  };

  const loadCounts = async () => {
    setLoading(true);
    try {
      const [studentsRes, buildingsRes, roomsRes] = await Promise.all([
        axios.post(`${baseUrl}admin.php`, { operation: 'getStudents', json: {} }, { headers: { 'Content-Type': 'application/json' } }),
        axios.post(`${baseUrl}admin.php`, { operation: 'getBuildings', json: {} }, { headers: { 'Content-Type': 'application/json' } }),
        axios.post(`${baseUrl}admin.php`, { operation: 'getRooms', json: {} }, { headers: { 'Content-Type': 'application/json' } }),
      ]);

      setStudentsCount(studentsRes?.data?.success ? (Array.isArray(studentsRes.data.data) ? studentsRes.data.data.length : 0) : 0);
      setBuildingsCount(buildingsRes?.data?.success ? (Array.isArray(buildingsRes.data.data) ? buildingsRes.data.data.length : 0) : 0);
      setRoomsCount(roomsRes?.data?.success ? (Array.isArray(roomsRes.data.data) ? roomsRes.data.data.length : 0) : 0);
    } catch (e) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadTodayActivity = async () => {
    setTodayActivityLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation: 'getStudentActivitySummaryByDate', json: { date: todayYmd } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        setTodayActivity(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        setTodayActivity([]);
        toast.error(res?.data?.message || 'Failed to load today activity.');
      }
    } catch (e) {
      setTodayActivity([]);
      toast.error('Network error. Please try again.');
    } finally {
      setTodayActivityLoading(false);
    }
  };

  const loadRecentInspections = async () => {
    setRecentInspectionsLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation: 'getRecentInspections', json: { limit: 6 } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        setRecentInspections(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        setRecentInspections([]);
        toast.error(res?.data?.message || 'Failed to load recent inspections.');
      }
    } catch (e) {
      setRecentInspections([]);
      toast.error('Network error. Please try again.');
    } finally {
      setRecentInspectionsLoading(false);
    }
  };

  useEffect(() => {
    loadCounts();
    loadTodayActivity();
    loadRecentInspections();
    
  }, []);

  const activeToday = useMemo(() => (todayActivity || []).filter((r) => !!r.is_active_on_date).length, [todayActivity]);
  const roomsInspectedToday = useMemo(() => (todayActivity || []).reduce((s, r) => s + (Number(r.rooms_inspected) || 0), 0), [todayActivity]);

  const getStatusBadge = (status) => {
    const statusMap = {
      excellent: { class: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Excellent' },
      good: { class: 'bg-sky-100 text-sky-700 border-sky-200', label: 'Good' },
      fair: { class: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Fair' },
      poor: { class: 'bg-rose-100 text-rose-700 border-rose-200', label: 'Poor' },
    };
    const normalized = String(status || '').toLowerCase().trim();
    const config = statusMap[normalized] || { class: 'bg-slate-100 text-slate-700 border-slate-200', label: status || 'Done' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.class}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Overview of your school's facility monitoring</p>
        </div>
        <div className="text-sm text-slate-400">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Grid */}
      <section aria-label="Dashboard stats">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            to="/admin/users"
            title="Total Students"
            value={studentsCount}
            loading={loading}
            icon="users"
          />
          <StatCard
            to="/admin/buildings"
            title="Buildings"
            value={buildingsCount}
            loading={loading}
            icon="building"
          />
          <StatCard
            to="/admin/rooms"
            title="Rooms"
            value={roomsCount}
            loading={loading}
            icon="door"
          />
          <StatCard
            to="/admin/activity"
            title="Inspections Today"
            value={roomsInspectedToday}
            loading={todayActivityLoading}
            icon="clipboardCheck"
            variant="emerald"
          />
          <StatCard
            to="/admin/activity"
            title="Active Today"
            value={`${activeToday}/${studentsCount || 0}`}
            loading={todayActivityLoading}
            icon="pulse"
            variant="amber"
          />
        </div>
      </section>

      {/* Main Content Grid */}
      <section className="grid gap-6 lg:grid-cols-2" aria-label="Dashboard panels">
        {/* Recent Inspections Panel */}
        <Panel title="Recent Inspections" to="/admin/activity">
          {recentInspectionsLoading ? (
            <LoadingState />
          ) : recentInspections.length === 0 ? (
            <EmptyState message="No inspections found. Inspections will appear here once students complete their tasks." />
          ) : (
            <div className="space-y-3">
              {recentInspections.slice(0, 5).map((r) => (
                <div
                  key={r.assigned_status_id}
                  className="group flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 grid h-10 w-10 place-items-center rounded-lg bg-white text-emerald-600 shadow-sm">
                      <Icon name="clipboardCheck" className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">
                        Room {r.room_number}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {r.full_name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {getStatusBadge(r.assigned_status)}
                    <span className="text-xs text-slate-400 font-medium">
                      {fmtShortDate(r.completion_date || r.assigned_updated_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Today's Activity Panel */}
        <Panel title="Today's Activity" to="/admin/activity">
          {todayActivityLoading ? (
            <LoadingState />
          ) : todayActivity.length === 0 ? (
            <EmptyState message="No activity yet today. Student activity will appear here once they start working." />
          ) : (
            <div className="space-y-3">
              {todayActivity.slice(0, 5).map((u) => {
                const isActive = !!u.is_active_on_date;
                return (
                  <div
                    key={u.user_id}
                    className="group flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex-shrink-0 grid h-10 w-10 place-items-center rounded-full text-xs font-bold ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {initials(u.full_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {u.full_name}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          @{u.username}
                        </div>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isActive ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </section>

   
    </div>
  );
}
