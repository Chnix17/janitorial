import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useAuth } from '../../auth/AuthContext';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { toast } from '../../utils/toast';
import './activity.css';

const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

// Icons as components for cleaner code
const Icons = {
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  ),
  List: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
  ),
  CheckCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  ),
  Clock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  ChevronDown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  ),
  ChevronUp: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  ),
  Building: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M9 21v-6h6v6"/></svg>
  ),
  TrendingUp: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
  ),
  Award: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
  ),
  Activity: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  ),
  Target: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
  ),
  Briefcase: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
  ),
  CalendarRange: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
  ),
  Play: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
  ),
  Flag: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
  ),
  AlertCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  ),
  CheckSquare: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  ),
  LayoutGrid: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  )
};

export default function Activity() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listMode, setListMode] = useState('daily');
  const [expandedKey, setExpandedKey] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(null);
  const [modalInspections, setModalInspections] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'calendar' | 'list'
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [expandedChecklist, setExpandedChecklist] = useState(null);

  const baseUrl = useMemo(() => {
    const storedUrl = SecureStorage.getLocalItem('janitorial_url');
    return withSlash(storedUrl || getApiBaseUrl());
  }, []);

  const userId = useMemo(() => {
    const id = user?.user_id;
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [user]);

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load inspection history (which includes assignments)
        const historyRes = await axios.post(
          `${baseUrl}student.php`,
          { operation: 'getInspectionHistory', json: { user_id: userId } },
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (historyRes?.data?.success) {
          // Set inspection history
          setHistory(Array.isArray(historyRes.data.data) ? historyRes.data.data : []);
          
          // Set assignments from the same response
          const assignmentData = Array.isArray(historyRes.data.assignments) 
            ? historyRes.data.assignments 
            : [];
          setAssignments(assignmentData);
          
          // Select the most recent assignment by default
          if (assignmentData.length > 0) {
            const nowYmd = ymd(new Date());
            const active = assignmentData.find((a) => nowYmd >= normalizeYmd(a?.assigned_start_date) && nowYmd <= normalizeYmd(a?.assigned_end_date));
            const started = assignmentData.find((a) => nowYmd >= normalizeYmd(a?.assigned_start_date));
            const chosen = active || started || null;
            setSelectedAssignment(chosen);
          }
        }
      } catch (e) {
        toast.error('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, baseUrl]);

  const today = new Date();
  const todayYmdNow = useMemo(() => ymd(new Date()), []);
  const todayYmd = useMemo(() => ymd(new Date()), []);

  // Create a lookup map for quick date access
  const historyMap = useMemo(() => {
    const map = new Map();
    history.forEach((item) => {
      map.set(item.date, Number(item.count) || 0);
    });
    return map;
  }, [history]);

  // Calculate assignment progress
  const assignmentProgress = useMemo(() => {
    if (!selectedAssignment) return null;
    
    const startDate = new Date(selectedAssignment.assigned_start_date);
    const endDate = new Date(selectedAssignment.assigned_end_date);
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const daysElapsed = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    const progressPercent = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
    
    // Count inspections within assignment period
    const inspectionsInPeriod = history.filter(h => {
      const hDate = new Date(h.date);
      return hDate >= startDate && hDate <= endDate;
    }).reduce((sum, h) => sum + (Number(h.count) || 0), 0);

    // Calculate days with activity vs days without
    const daysWithActivity = history.filter(h => {
      const hDate = new Date(h.date);
      return hDate >= startDate && hDate <= endDate && (Number(h.count) || 0) > 0;
    }).length;

    const daysWithoutActivity = Math.max(0, daysElapsed - daysWithActivity);

    return {
      totalDays,
      daysElapsed: Math.max(0, daysElapsed),
      daysRemaining: Math.max(0, daysRemaining),
      progressPercent,
      inspectionsInPeriod,
      daysWithActivity,
      daysWithoutActivity,
      startDate,
      endDate
    };
  }, [selectedAssignment, history, today]);

  const fmtDate = (val) => {
    if (!val) return '';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const fmtMonth = (year, monthIndex) => {
    const d = new Date(year, monthIndex, 1);
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  function ymd(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const normalizeYmd = (val) => {
    if (!val) return '';
    const s = String(val);
    const m = s.match(/^\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : s;
  };

  const assignmentRanges = useMemo(() => {
    if (!Array.isArray(assignments)) return [];
    return assignments
      .map((a) => {
        const start = normalizeYmd(a?.assigned_start_date);
        const end = normalizeYmd(a?.assigned_end_date);
        return {
          ...a,
          _rangeStart: start,
          _rangeEnd: end
        };
      })
      .filter((a) => a?._rangeStart && a?._rangeEnd && a._rangeStart <= a._rangeEnd);
  }, [assignments]);

  const selectedRange = useMemo(() => {
    if (!selectedAssignment?.assigned_id) return null;
    const id = Number(selectedAssignment.assigned_id);
    return assignmentRanges.find((a) => Number(a.assigned_id) === id) || null;
  }, [assignmentRanges, selectedAssignment]);

  const startOfWeek = (date) => {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const addDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  };

  const dailyRows = useMemo(() => {
    const startStr = selectedRange?._rangeStart || null;
    const endStr = selectedRange?._rangeEnd || null;

    const rows = (Array.isArray(history) ? history : [])
      .map((h) => {
        const date = normalizeYmd(h?.date);
        return {
          date,
          count: Number(h?.count) || 0
        };
      })
      .filter((r) => !!r.date)
      .filter((r) => {
        if (!startStr || !endStr) return true;
        return r.date >= startStr && r.date <= endStr;
      })
      .filter((r) => r.count > 0)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    return rows;
  }, [history, selectedRange]);

  const weeklyGroups = useMemo(() => {
    const map = new Map();
    for (const r of dailyRows) {
      const sow = startOfWeek(r.date);
      if (!sow) continue;
      const key = `w:${ymd(sow)}`;
      const existing = map.get(key) || { key, start: ymd(sow), end: ymd(addDays(sow, 6)), total: 0, days: [] };
      existing.total += r.count;
      existing.days.push(r);
      map.set(key, existing);
    }
    const groups = Array.from(map.values()).map((g) => ({
      ...g,
      days: g.days.sort((a, b) => String(b.date).localeCompare(String(a.date)))
    }));
    groups.sort((a, b) => String(b.start).localeCompare(String(a.start)));
    return groups;
  }, [dailyRows]);

  const monthlyGroups = useMemo(() => {
    const map = new Map();
    for (const r of dailyRows) {
      const d = new Date(r.date);
      if (Number.isNaN(d.getTime())) continue;
      const key = `m:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const existing = map.get(key) || {
        key,
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        total: 0,
        days: []
      };
      existing.total += r.count;
      existing.days.push(r);
      map.set(key, existing);
    }
    const groups = Array.from(map.values()).map((g) => ({
      ...g,
      label: fmtMonth(g.year, g.monthIndex),
      days: g.days.sort((a, b) => String(b.date).localeCompare(String(a.date)))
    }));
    groups.sort((a, b) => {
      const ak = `${a.year}-${String(a.monthIndex + 1).padStart(2, '0')}`;
      const bk = `${b.year}-${String(b.monthIndex + 1).padStart(2, '0')}`;
      return bk.localeCompare(ak);
    });
    return groups;
  }, [dailyRows]);

  const openDetailsModal = async (date) => {
    if (!date) return;
    setModalDate(date);
    setModalOpen(true);
    setModalLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}student.php`,
        { operation: 'getInspectionsByDate', json: { user_id: userId, date } },
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (res?.data?.success) {
        setModalInspections(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        toast.error(res?.data?.message || 'Failed to load inspection details.');
      }
    } catch (e) {
      toast.error('Network error. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalDate(null);
    setModalInspections([]);
    setExpandedChecklist(null);
  };

  const stats = useMemo(() => {
    const total = history.reduce((sum, h) => sum + (Number(h.count) || 0), 0);
    const activeDays = history.filter((h) => (Number(h.count) || 0) > 0).length;
    const avgPerDay = activeDays > 0 ? total / activeDays : 0;
    const bestDayCount = history.reduce((m, h) => Math.max(m, Number(h.count) || 0), 0);
    
    // Calculate streak
    let currentStreak = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    while (true) {
      const checkStr = ymd(checkDate);
      const cnt = historyMap.get(checkStr) || 0;
      if (cnt > 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      break;
    }

    return {
      total,
      activeDays,
      avgPerDay,
      bestDayCount,
      currentStreak
    };
  }, [history, historyMap]);

  // Get status badge styles
  const getStatusBadge = (status, hasUpdate, isPastDate) => {
    const displayStatus = status || (hasUpdate ? 'Done' : (isPastDate ? 'Missed' : 'Pending'));
    const styles = {
      'excellent': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'good': 'bg-sky-100 text-sky-700 border-sky-200',
      'fair': 'bg-amber-100 text-amber-700 border-amber-200',
      'poor': 'bg-rose-100 text-rose-700 border-rose-200',
      'missed': 'bg-rose-100 text-rose-700 border-rose-200',
      'pending': 'bg-slate-100 text-slate-600 border-slate-200',
      'Done': 'bg-emerald-100 text-emerald-700 border-emerald-200'
    };
    return { displayStatus, badgeClass: styles[displayStatus] || styles['Pending'] };
  };

  // Check if a date is within assignment range
  const isDateInAssignment = (dateStr) => {
    if (!selectedRange) return false;
    return dateStr >= selectedRange._rangeStart && dateStr <= selectedRange._rangeEnd;
  };

  // Custom calendar tile class for assignment range
  const getTileClassName = ({ date, view }) => {
    if (view !== 'month') return null;
    
    const dateStr = ymd(date);
    const count = historyMap.get(dateStr) || 0;
    let classes = [];
    
    if (count > 0) {
      classes.push(`has-activity level-${Math.min(count, 4)}`);
    }
    
    // Highlight assignment range
    if (selectedRange) {
      const startStr = selectedRange._rangeStart;
      const endStr = selectedRange._rangeEnd;
      
      if (dateStr >= startStr && dateStr <= endStr) {
        classes.push('in-assignment-range');
      }
      if (dateStr === startStr) {
        classes.push('assignment-start');
      }
      if (dateStr === endStr) {
        classes.push('assignment-end');
      }
    }
    
    return classes.length > 0 ? classes.join(' ') : null;
  };

  return (
    <div className="activity-page">
      {/* Header Section */}
          <div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Activity</h1>

        <p className="mt-1 text-sm text-slate-500">Track your inspection progress and performance</p>

      </div>

      {/* Assignment Overview Card */}
      {selectedAssignment && assignmentProgress && (
        <div className="assignment-overview-card">
          <div className="assignment-card-header">
            <div className="assignment-badge-large">
              <Icons.Briefcase />
              <span>Current Assignment</span>
            </div>
            {assignments.length > 1 && (
              <select 
                className="assignment-select-clean"
                value={selectedAssignment?.assigned_id || ''}
                onChange={(e) => {
                  const nextId = Number(e.target.value);
                  const assignment = assignments.find((a) => Number(a.assigned_id) === nextId);
                  setSelectedAssignment(assignment);
                }}
              >
                {assignments.map((a, idx) => (
                  <option
                    key={a.assigned_id}
                    value={a.assigned_id}
                    disabled={todayYmdNow < normalizeYmd(a.assigned_start_date)}
                  >
                    Assignment #{idx + 1}: {fmtDate(a.assigned_start_date)} - {fmtDate(a.assigned_end_date)}{todayYmdNow < normalizeYmd(a.assigned_start_date) ? ' - Not started yet' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Progress Bar */}
          <div className="assignment-progress-section">
            <div className="progress-header">
              <span className="progress-label">Assignment Progress</span>
              <span className="progress-percentage">{Math.round(assignmentProgress.progressPercent)}%</span>
            </div>
            <div className="progress-track">
              <div 
                className="progress-fill"
                style={{ width: `${assignmentProgress.progressPercent}%` }}
              />
              <div 
                className="progress-marker"
                style={{ left: `${assignmentProgress.progressPercent}%` }}
              />
            </div>
            <div className="progress-stats">
              <span>{assignmentProgress.daysElapsed} days elapsed</span>
              <span className={assignmentProgress.daysRemaining <= 7 ? 'urgent' : ''}>
                {assignmentProgress.daysRemaining > 0 
                  ? `${assignmentProgress.daysRemaining} days remaining`
                  : assignmentProgress.daysRemaining === 0
                  ? 'Ends today'
                  : 'Assignment ended'}
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="assignment-quick-stats">
            <div className="quick-stat">
              <div className="quick-stat-icon completed">
                <Icons.CheckSquare />
              </div>
              <div className="quick-stat-content">
                <span className="quick-stat-value">{assignmentProgress.daysWithActivity}</span>
                <span className="quick-stat-label">Days Active</span>
              </div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-icon missed">
                <Icons.AlertCircle />
              </div>
              <div className="quick-stat-content">
                <span className="quick-stat-value">{assignmentProgress.daysWithoutActivity}</span>
                <span className="quick-stat-label">Days Missed</span>
              </div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-icon total">
                <Icons.CheckCircle />
              </div>
              <div className="quick-stat-content">
                <span className="quick-stat-value">{assignmentProgress.inspectionsInPeriod}</span>
                <span className="quick-stat-label">Inspections</span>
              </div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-icon average">
                <Icons.Target />
              </div>
              <div className="quick-stat-content">
                <span className="quick-stat-value">
                  {assignmentProgress.daysElapsed > 0 
                    ? (assignmentProgress.inspectionsInPeriod / assignmentProgress.daysElapsed).toFixed(1)
                    : '0.0'}
                </span>
                <span className="quick-stat-label">Avg/Day</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Icons.LayoutGrid />
            <span>Overview</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <Icons.Calendar />
            <span>Calendar</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <Icons.List />
            <span>History</span>
          </button>
        </div>

        {/* Overview View */}
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="overview-grid">
              {/* Mini Calendar */}
              <div className="overview-card calendar-mini">
                <div className="overview-card-header">
                  <h3>Calendar</h3>
                  <button className="view-all-btn" onClick={() => setActiveTab('calendar')}>
                    View Full
                  </button>
                </div>
                <div className="mini-calendar-wrapper">
                  <Calendar
                    onClickDay={(date) => openDetailsModal(ymd(date))}
                    tileContent={({ date, view }) => {
                      if (view !== 'month') return null;
                      const dateStr = ymd(date);
                      const count = historyMap.get(dateStr);
                      const isStart = selectedRange && dateStr === selectedRange._rangeStart;
                      const isEnd = selectedRange && dateStr === selectedRange._rangeEnd;
                      
                      return (
                        <>
                          {count > 0 && <span className="calendar-badge-mini">{count}</span>}
                          {isStart && <span className="assignment-marker-mini start" title="Start">▶</span>}
                          {isEnd && <span className="assignment-marker-mini end" title="End">🏁</span>}
                          {isStart && <span className="assignment-label start">START</span>}
                          {isEnd && <span className="assignment-label end">END</span>}
                        </>
                      );
                    }}
                    tileClassName={getTileClassName}
                    className="activity-calendar mini"
                  />
                </div>
              </div>

              {/* Recent Activity */}
              <div className="overview-card recent-activity">
                <div className="overview-card-header">
                  <h3>Recent Activity</h3>
                  <button className="view-all-btn" onClick={() => setActiveTab('list')}>
                    View All
                  </button>
                </div>
                <div className="recent-list">
                  {loading ? (
                    <div className="loading-state-mini">
                      <div className="loading-spinner-mini" />
                    </div>
                  ) : dailyRows.length === 0 ? (
                    <div className="empty-state-mini">
                      <p>No recent activity</p>
                    </div>
                  ) : (
                    dailyRows.slice(0, 5).map((r) => {
                      const isInAssignment = isDateInAssignment(r.date);
                      
                      return (
                        <button
                          key={r.date}
                          className={`recent-item ${isInAssignment ? 'in-assignment' : ''}`}
                          onClick={() => openDetailsModal(r.date)}
                        >
                          <div className="recent-date">
                            <span className="day">{new Date(r.date).getDate()}</span>
                            <span className="month">{new Date(r.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                          </div>
                          <div className="recent-info">
                            <span className="recent-day-name">{new Date(r.date).toLocaleDateString(undefined, { weekday: 'long' })}</span>
                            <span className="recent-count">{r.count} inspection{r.count !== 1 ? 's' : ''}</span>
                          </div>
                          {isInAssignment && <span className="assignment-tag">Assignment</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar View */}
        {activeTab === 'calendar' && (
          <div className="calendar-section">
            <div className="section-header">
              <h2>Activity Calendar</h2>
              <div className="calendar-legend">
                <div className="legend-group">
                  <span>Activity:</span>
                  <div className="legend-items">
                    <span className="legend-item" data-level="1" title="Low" />
                    <span className="legend-item" data-level="2" title="Medium" />
                    <span className="legend-item" data-level="3" title="High" />
                    <span className="legend-item" data-level="4" title="Very High" />
                  </div>
                </div>
                {selectedAssignment && (
                  <>
                    <div className="legend-group">
                      <span>Assignment Range:</span>
                      <div className="legend-items">
                        <span className="legend-item assignment-range" title="Within Assignment" />
                      </div>
                    </div>
                    <div className="legend-group">
                      <span>Start/End:</span>
                      <div className="legend-items">
                        <span className="legend-item assignment" title="Start/End Date" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="calendar-wrapper">
              {loading ? (
                <div className="loading-state">
                  <div className="loading-spinner" />
                  <span>Loading activity...</span>
                </div>
              ) : (
                <Calendar
                  onClickDay={(date) => openDetailsModal(ymd(date))}
                  tileContent={({ date, view }) => {
                    if (view !== 'month') return null;
                    const dateStr = ymd(date);
                    const count = historyMap.get(dateStr);
                    const isStart = selectedRange && dateStr === selectedRange._rangeStart;
                    const isEnd = selectedRange && dateStr === selectedRange._rangeEnd;
                    const inRange = isDateInAssignment(dateStr);
                    
                    return (
                      <>
                        {count > 0 && <span className="calendar-badge">{count}</span>}
                        {isStart && <span className="assignment-label start">START</span>}
                        {isEnd && <span className="assignment-label end">END</span>}
                        {isStart && (
                          <span className="assignment-marker start" title="Assignment Start">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                              <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                          </span>
                        )}
                        {isEnd && (
                          <span className="assignment-marker end" title="Assignment End">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                              <line x1="4" y1="22" x2="4" y2="15"/>
                            </svg>
                          </span>
                        )}
                        {inRange && !isStart && !isEnd && (
                          <span className="assignment-dot" title="Within Assignment Period" />
                        )}
                      </>
                    );
                  }}
                  tileClassName={getTileClassName}
                  className="activity-calendar"
                />
              )}
            </div>
          </div>
        )}

        {/* List View */}
        {activeTab === 'list' && (
          <div className="list-section">
            <div className="section-header">
              <h2>Activity History</h2>
              <div className="view-toggle">
                {['daily', 'weekly', 'monthly'].map((mode) => (
                  <button
                    key={mode}
                    className={`toggle-btn ${listMode === mode ? 'active' : ''}`}
                    onClick={() => {
                      setListMode(mode);
                      setExpandedKey(null);
                    }}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="list-content">
              {loading ? (
                <div className="loading-state">
                  <div className="loading-spinner" />
                  <span>Loading history...</span>
                </div>
              ) : listMode === 'daily' ? (
                dailyRows.length === 0 ? (
                  <div className="empty-state">
                    <Icons.Calendar />
                    <p>No activity recorded yet</p>
                    <span>Start inspecting rooms to see your activity here</span>
                  </div>
                ) : (
                  <div className="activity-list">
                    {dailyRows.slice(0, 60).map((r) => {
                      const isInAssignment = isDateInAssignment(r.date);
                      
                      return (
                        <button
                          key={r.date}
                          className={`activity-item ${isInAssignment ? 'in-assignment' : ''}`}
                          onClick={() => openDetailsModal(r.date)}
                        >
                          <div className="item-info">
                            <span className="item-date">{fmtDate(r.date)}</span>
                            <span className="item-day">{new Date(r.date).toLocaleDateString(undefined, { weekday: 'long' })}</span>
                          </div>
                          <div className="item-stats">
                            {isInAssignment && <span className="assignment-badge">Assignment</span>}
                            <span className="item-count">{r.count} inspection{r.count !== 1 ? 's' : ''}</span>
                            <Icons.ChevronRight />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : listMode === 'weekly' ? (
                weeklyGroups.length === 0 ? (
                  <div className="empty-state">
                    <Icons.Calendar />
                    <p>No activity recorded yet</p>
                  </div>
                ) : (
                  <div className="activity-list grouped">
                    {weeklyGroups.slice(0, 26).map((g) => {
                      const isOpen = expandedKey === g.key;
                      const hasAssignmentDays = g.days.some((d) => isDateInAssignment(d.date));
                      
                      return (
                        <div key={g.key} className="group-container">
                          <button
                            className={`activity-item group-header ${hasAssignmentDays ? 'has-assignment' : ''}`}
                            onClick={() => setExpandedKey((k) => (k === g.key ? null : g.key))}
                          >
                            <div className="item-info">
                              <span className="item-date">{fmtDate(g.start)} - {fmtDate(g.end)}</span>
                              <span className="item-day">{g.days.length} active day{g.days.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="item-stats">
                              {hasAssignmentDays && <span className="assignment-indicator" title="Contains assignment days" />}
                              <span className="item-count">{g.total} total</span>
                              <span className={`expand-icon ${isOpen ? 'open' : ''}`}>
                                <Icons.ChevronDown />
                              </span>
                            </div>
                          </button>
                          {isOpen && (
                            <div className="group-children">
                              {g.days.map((d) => {
                                const isInAssignment = isDateInAssignment(d.date);
                                
                                return (
                                  <button
                                    key={d.date}
                                    className={`activity-item child ${isInAssignment ? 'in-assignment' : ''}`}
                                    onClick={() => openDetailsModal(d.date)}
                                  >
                                    <div className="item-info">
                                      <span className="item-date">{fmtDate(d.date)}</span>
                                    </div>
                                    <div className="item-stats">
                                      {isInAssignment && <span className="assignment-badge">Assignment</span>}
                                      <span className="item-count">{d.count} inspection{d.count !== 1 ? 's' : ''}</span>
                                      <Icons.ChevronRight />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                monthlyGroups.length === 0 ? (
                  <div className="empty-state">
                    <Icons.Calendar />
                    <p>No activity recorded yet</p>
                  </div>
                ) : (
                  <div className="activity-list grouped">
                    {monthlyGroups.slice(0, 12).map((g) => {
                      const isOpen = expandedKey === g.key;
                      const hasAssignmentDays = g.days.some((d) => isDateInAssignment(d.date));
                      
                      return (
                        <div key={g.key} className="group-container">
                          <button
                            className={`activity-item group-header ${hasAssignmentDays ? 'has-assignment' : ''}`}
                            onClick={() => setExpandedKey((k) => (k === g.key ? null : g.key))}
                          >
                            <div className="item-info">
                              <span className="item-date">{g.label}</span>
                              <span className="item-day">{g.days.length} active day{g.days.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="item-stats">
                              {hasAssignmentDays && <span className="assignment-indicator" title="Contains assignment days" />}
                              <span className="item-count">{g.total} total</span>
                              <span className={`expand-icon ${isOpen ? 'open' : ''}`}>
                                <Icons.ChevronDown />
                              </span>
                            </div>
                          </button>
                          {isOpen && (
                            <div className="group-children">
                              {g.days.map((d) => {
                                const isInAssignment = isDateInAssignment(d.date);
                                
                                return (
                                  <button
                                    key={d.date}
                                    className={`activity-item child ${isInAssignment ? 'in-assignment' : ''}`}
                                    onClick={() => openDetailsModal(d.date)}
                                  >
                                    <div className="item-info">
                                      <span className="item-date">{fmtDate(d.date)}</span>
                                    </div>
                                    <div className="item-stats">
                                      {isInAssignment && <span className="assignment-badge">Assignment</span>}
                                      <span className="item-count">{d.count} inspection{d.count !== 1 ? 's' : ''}</span>
                                      <Icons.ChevronRight />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-container">
            <div className="modal-header">
              <div className="modal-title">
                <div className="modal-icon">
                  <Icons.Calendar />
                </div>
                <div>
                  <h3>Inspections for {fmtDate(modalDate)}</h3>
                  <p>
                    {modalLoading
                      ? 'Loading...'
                      : `${modalInspections.filter((x) => !!x.assigned_updated_at).length} completed • ${modalInspections.length} total room${modalInspections.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={closeModal} aria-label="Close">
                <Icons.X />
              </button>
            </div>

            <div className="modal-body">
              {modalLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner" />
                  <span>Loading details...</span>
                </div>
              ) : modalInspections.length === 0 ? (
                <div className="empty-state">
                  <Icons.Clock />
                  <p>No inspections found for this date</p>
                </div>
              ) : (
                <div className="inspection-list">
                  {modalInspections.map((insp, i) => {
                    const hasUpdate = !!insp.assigned_updated_at;
                    const isPastDate = String(modalDate || '') < String(todayYmd);
                    const { displayStatus, badgeClass } = getStatusBadge(insp.assigned_status, hasUpdate, isPastDate);
                    const hasChecklist = Array.isArray(insp.checklist) && insp.checklist.length > 0;
                    const isChecklistOpen = expandedChecklist === i;
                    
                    return (
                      <div key={i} className="inspection-card">
                        <div className="inspection-header">
                          <div className="room-info">
                            <span className="room-number">Room {insp.room_number}</span>
                            <span className="building-info">
                              <Icons.Building />
                              {insp.building_name}{insp.floor_name ? ` • ${insp.floor_name}` : ''}
                            </span>
                          </div>
                          <div className="inspection-actions">
                            {hasChecklist && (
                              <button 
                                className="checklist-toggle-btn"
                                onClick={() => setExpandedChecklist(isChecklistOpen ? null : i)}
                                aria-label={isChecklistOpen ? 'Hide checklist' : 'Show checklist'}
                              >
                                <span className="checklist-count">{insp.checklist.length} checklist item{insp.checklist.length !== 1 ? 's' : ''}</span>
                                {isChecklistOpen ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                              </button>
                            )}
                            <span className={`status-badge ${badgeClass}`}>{displayStatus}</span>
                          </div>
                        </div>
                        
                        {isChecklistOpen && hasChecklist && (
                          <div className="checklist-dropdown">
                            {insp.checklist.map((item) => (
                              <div key={item.checklist_id} className="checklist-item">
                                <span className="checklist-name">{item.checklist_name}</span>
                                <span className={`checklist-status ${item.operation_is_functional ? 'ok' : 'not-ok'}`}>
                                  {item.operation_is_functional ? 'OK' : 'Not OK'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {insp.assigned_remarks && (
                          <p className="inspection-remarks">{insp.assigned_remarks}</p>
                        )}
                        
                        {insp.assigned_images && (
                          <div className="inspection-images">
                            {(() => {
                              let images = [];
                              try {
                                const parsed = JSON.parse(insp.assigned_images);
                                images = Array.isArray(parsed) ? parsed : [insp.assigned_images];
                              } catch {
                                images = [insp.assigned_images];
                              }
                              return images.slice(0, 3).map((img, idx) => (
                                <div key={idx} className="image-thumb">
                                  <img 
                                    src={img.startsWith('http') ? img : `${baseUrl}${img}`} 
                                    alt={`Inspection ${idx + 1}`}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                        
                        <div className="inspection-footer">
                          <span className="inspection-time">
                            <Icons.Clock />
                            {insp.assigned_updated_at 
                              ? new Date(insp.assigned_updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : 'Not completed'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
