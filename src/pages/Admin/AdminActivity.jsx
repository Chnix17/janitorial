import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { toast } from '../../utils/toast';

const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

export default function AdminActivity() {
  const [viewMode, setViewMode] = useState('daily');
  const [date, setDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');

  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeSummary, setRangeSummary] = useState(null);
  const [rangeMissedGroups, setRangeMissedGroups] = useState([]);
  const [rangeDays, setRangeDays] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalInspections, setModalInspections] = useState([]);

  const baseUrl = useMemo(() => {
    const storedUrl = SecureStorage.getLocalItem('janitorial_url');
    return withSlash(storedUrl || getApiBaseUrl());
  }, []);

  const filtered = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => String(r.full_name || '').toLowerCase().includes(q) || String(r.username || '').toLowerCase().includes(q));
  }, [rows, search]);

  const stats = useMemo(() => {
    const totalStudents = rows.length;
    const active = rows.filter((r) => !!r.is_active_on_date).length;
    const inactive = totalStudents - active;
    const totalRooms = rows.reduce((s, r) => s + (Number(r.rooms_inspected) || 0), 0);
    const totalOps = rows.reduce((s, r) => s + (Number(r.activity_count) || 0), 0);
    return { totalStudents, active, inactive, totalRooms, totalOps };
  }, [rows]);

  const fmtDate = (val) => {
    if (!val) return '';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const fmtTime = (val) => {
    if (!val) return '';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const ymd = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const addDays = (dateObj, n) => {
    const d = new Date(dateObj);
    d.setDate(d.getDate() + n);
    return d;
  };

  const listDatesInclusive = (startYmd, endYmd) => {
    const out = [];
    const s = new Date(`${startYmd}T00:00:00`);
    const e = new Date(`${endYmd}T00:00:00`);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return out;
    if (s.getTime() > e.getTime()) return out;
    for (let d = s; d.getTime() <= e.getTime(); d = addDays(d, 1)) {
      out.push(ymd(d));
      if (out.length > 370) break;
    }
    return out;
  };

  const getMissedChecklistLabel = (value) => {
    if (value === null || typeof value === 'undefined') return 'Pending';
    if (Number(value) === 1) return 'OK';
    if (Number(value) === 0) return 'No Action';
    return 'Pending';
  };

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation: 'getStudentActivitySummaryByDate', json: { date } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        setRows(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        setRows([]);
        toast.error(res?.data?.message || 'Failed to load activity summary.');
      }
    } catch (e) {
      setRows([]);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    setAssignmentsLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation: 'getAssigned', json: {} },
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (res?.data?.success) {
        setAssignments(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        setAssignments([]);
        toast.error(res?.data?.message || 'Failed to load assignments.');
      }
    } catch (e) {
      setAssignments([]);
      toast.error('Network error. Please try again.');
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const selectedAssignment = useMemo(() => {
    const id = String(selectedAssignmentId || '');
    if (!id) return null;
    return (assignments || []).find((a) => String(a.assigned_id) === id) || null;
  }, [assignments, selectedAssignmentId]);

  const rangeTotals = useMemo(() => {
    const totalMissedRooms = (rangeDays || []).reduce((s, d) => s + (Number(d.missed_rooms) || 0), 0);
    const totalInspectedRooms = (rangeDays || []).reduce((s, d) => s + (Number(d.inspected_rooms) || 0), 0);
    return { totalMissedRooms, totalInspectedRooms };
  }, [rangeDays]);

  const loadAssignmentRange = async () => {
    const a = selectedAssignment;
    if (!a?.assigned_user_id || !a?.assigned_floor_building_id || !a?.assigned_start_date || !a?.assigned_end_date) {
      setRangeSummary(null);
      setRangeMissedGroups([]);
      setRangeDays([]);
      return;
    }

    const start = String(a.assigned_start_date);
    const end = String(a.assigned_end_date);
    const today = ymd(new Date());
    const endLimit = end && end < today ? end : today;
    const dayCount = listDatesInclusive(start, endLimit).length;

    setRangeLoading(true);
    try {
      const [roomsRes, historyRes] = await Promise.all([
        axios.post(
          `${baseUrl}admin.php`,
          { operation: 'getRooms', json: { floorbuilding_id: Number(a.assigned_floor_building_id) } },
          { headers: { 'Content-Type': 'application/json' } }
        ),
        axios.post(
          `${baseUrl}admin.php`,
          { operation: 'getStudentInspectionHistory', json: { user_id: Number(a.assigned_user_id) } },
          { headers: { 'Content-Type': 'application/json' } }
        )
      ]);

      const roomCount = roomsRes?.data?.success ? (Array.isArray(roomsRes.data.data) ? roomsRes.data.data.length : 0) : 0;
      const rawHistory = historyRes?.data?.success ? (Array.isArray(historyRes.data.data) ? historyRes.data.data : []) : [];
      const inRangeHistory = rawHistory.filter((h) => String(h.date) >= start && String(h.date) <= endLimit);
      const inspectedDays = inRangeHistory.filter((h) => (Number(h.count) || 0) > 0).length;
      const roomsInspected = inRangeHistory.reduce((s, h) => s + (Number(h.count) || 0), 0);
      const expectedRooms = roomCount * dayCount;

      const inspectedByDate = new Map();
      for (const h of inRangeHistory) {
        inspectedByDate.set(String(h.date), Number(h.count) || 0);
      }

      const missedEnd = endLimit;
      const missedStart = start;
      const missedDates = listDatesInclusive(missedStart, missedEnd);

      const missedResults = await Promise.all(
        missedDates.map(async (d) => {
          const res = await axios.post(
            `${baseUrl}student.php`,
            {
              operation: 'getMissedClassrooms',
              json: {
                assigned_user_id: Number(a.assigned_user_id),
                assigned_floor_building_id: Number(a.assigned_floor_building_id),
                date: d
              }
            },
            { headers: { 'Content-Type': 'application/json' } }
          );

          if (!res?.data?.success) {
            return { date: d, rooms: [], error: res?.data?.message || 'Failed to load missed tasks.' };
          }
          return { date: d, rooms: Array.isArray(res.data.data) ? res.data.data : [], error: null };
        })
      );

      const anyError = missedResults.find((x) => !!x.error);
      if (anyError) toast.error(anyError.error);

      setRangeMissedGroups(
        missedResults
          .map((r) => ({ date: r.date, rooms: r.rooms }))
          .filter((g) => Array.isArray(g.rooms) && g.rooms.length > 0)
          .sort((a2, b2) => String(b2.date).localeCompare(String(a2.date)))
      );

      const missedCountByDate = new Map();
      for (const mr of missedResults) {
        missedCountByDate.set(String(mr.date), Array.isArray(mr.rooms) ? mr.rooms.length : 0);
      }

      const days = listDatesInclusive(start, endLimit);
      setRangeDays(
        days
          .map((d) => {
            const inspected_rooms = inspectedByDate.get(d) || 0;
            const missed_rooms = missedCountByDate.get(d) || 0;
            return {
              date: d,
              inspected_rooms,
              missed_rooms,
              total_rooms: roomCount
            };
          })
          .sort((a2, b2) => String(b2.date).localeCompare(String(a2.date)))
      );

      setRangeSummary({
        studentName: a.assigned_user_name,
        buildingName: a.building_name,
        floorName: a.floor_name,
        start,
        end,
        endLimit,
        roomCount,
        dayCount,
        inspectedDays,
        roomsInspected,
        expectedRooms,
        progressPct: expectedRooms > 0 ? Math.min((roomsInspected / expectedRooms) * 100, 100) : 0
      });
    } catch (e) {
      setRangeSummary(null);
      setRangeMissedGroups([]);
      setRangeDays([]);
      toast.error('Network error. Please try again.');
    } finally {
      setRangeLoading(false);
    }
  };


  const openInspectionsModal = async (userId, selectedDate) => {
    if (!userId || !selectedDate) return;
    setModalOpen(true);
    setModalDate(selectedDate);
    setModalLoading(true);
    setModalInspections([]);

    try {
      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation: 'getStudentInspectionsByDate', json: { user_id: Number(userId), date: selectedDate } },
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
  };

  const todayYmd = useMemo(() => ymd(new Date()), []);

  useEffect(() => {
    loadSummary();
  }, [date]);

  useEffect(() => {
    loadAssignments();
  }, []);

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Activity Monitor</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor each student’s inspection activity and drill into details.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              className={viewMode === 'daily'
                ? 'rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white'
                : 'rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white'}
              onClick={() => setViewMode('daily')}
            >
              Daily Monitor
            </button>
            <button
              type="button"
              className={viewMode === 'assignment'
                ? 'rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white'
                : 'rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white'}
              onClick={() => setViewMode('assignment')}
            >
              Assignment Range
            </button>
          </div>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={viewMode !== 'daily'}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={viewMode === 'daily' ? loadSummary : loadAssignmentRange}
            disabled={viewMode === 'daily' ? loading : (rangeLoading || !selectedAssignmentId)}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {(viewMode === 'daily' ? loading : rangeLoading) ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {viewMode === 'assignment' ? (
        <>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Assignment Range Progress</div>
                <div className="mt-1 text-xs text-slate-500">
                  {rangeSummary
                    ? `${rangeSummary.studentName} • ${rangeSummary.buildingName} • ${rangeSummary.floorName} • ${fmtDate(rangeSummary.start)} - ${fmtDate(rangeSummary.end)}`
                    : 'Select an assignment then click “View Progress”.'}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedAssignmentId}
                  onChange={(e) => setSelectedAssignmentId(e.target.value)}
                  className="min-w-[320px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  disabled={assignmentsLoading}
                >
                  <option value="">Select assignment…</option>
                  {(assignments || []).map((a) => (
                    <option key={a.assigned_id} value={a.assigned_id}>
                      {a.assigned_user_name} • {fmtDate(a.assigned_start_date)} - {fmtDate(a.assigned_end_date)} • {a.building_name} ({a.floor_name})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={loadAssignmentRange}
                  disabled={rangeLoading || !selectedAssignmentId}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {rangeLoading ? 'Loading…' : 'View Progress'}
                </button>
              </div>

              {rangeSummary ? (
                <div className="text-xs font-semibold text-slate-600">Up to: <span className="font-extrabold text-slate-900">{fmtDate(rangeSummary.endLimit)}</span></div>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Days in Range</div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">{rangeLoading ? '—' : (rangeSummary?.dayCount ?? '—')}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rooms / Day</div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">{rangeLoading ? '—' : (rangeSummary?.roomCount ?? '—')}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rooms Inspected</div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">{rangeLoading ? '—' : (rangeSummary?.roomsInspected ?? '—')}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Progress</div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900">{rangeLoading ? '—' : `${(rangeSummary?.progressPct ?? 0).toFixed(0)}%`}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Assignment Days</div>
                <div className="mt-1 text-xs text-slate-500">One entry per day. Click a day to open room checklist details.</div>
              </div>

              <div className="flex items-center gap-2">
                <div className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-slate-700">{rangeLoading ? '—' : `${rangeTotals.totalInspectedRooms} inspected`}</div>
                <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-extrabold text-rose-700">{rangeLoading ? '—' : `${rangeTotals.totalMissedRooms} missed`}</div>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_140px_120px_120px] gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500">
              <div>Date</div>
              <div>Location</div>
              <div>Inspected</div>
              <div>Missed</div>
            </div>

            <div>
              {rangeLoading ? (
                <div className="px-5 py-6 text-sm text-slate-500">Loading range…</div>
              ) : !selectedAssignmentId ? (
                <div className="px-5 py-6 text-sm text-slate-500">Select an assignment then click “View Progress”.</div>
              ) : rangeDays.length === 0 ? (
                <div className="px-5 py-6 text-sm text-slate-500">No days to show in this range.</div>
              ) : (
                rangeDays.map((d) => {
                  const inspected = Number(d.inspected_rooms) || 0;
                  const missed = Number(d.missed_rooms) || 0;
                  const total = Number(d.total_rooms) || 0;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => openInspectionsModal(selectedAssignment.assigned_user_id, d.date)}
                      className="grid w-full grid-cols-[1fr_140px_120px_120px] items-center gap-2 border-b border-slate-100 px-5 py-4 text-left hover:bg-slate-50"
                    >
                      <div className="text-sm font-semibold text-slate-900">{fmtDate(d.date)}</div>
                      <div className="text-sm text-slate-600">{rangeSummary?.floorName || '—'}</div>
                      <div className="text-sm text-slate-600">{inspected}/{total}</div>
                      <div className="text-sm font-semibold text-rose-700">{missed}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : null}

      {viewMode === 'daily' ? (
        <>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Students</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{loading ? '—' : stats.totalStudents}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{loading ? '—' : stats.active}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Inactive</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{loading ? '—' : stats.inactive}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Rooms Inspected</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{loading ? '—' : stats.totalRooms}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Checklist Ops</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{loading ? '—' : stats.totalOps}</div>
        </div>
      </div>


      <div className="mt-5">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Students on {fmtDate(date)}</div>
              <div className="mt-1 text-xs text-slate-500">Click a student to view history and open inspection details.</div>
            </div>

            <div className="relative w-full max-w-sm">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const active = !!r.is_active_on_date;
              return (
                <button
                  key={r.user_id}
                  type="button"
                  onClick={() => openInspectionsModal(r.user_id, date)}
                  className={'w-full px-5 py-4 text-left hover:bg-slate-50'}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{r.full_name}</div>
                      <div className="mt-1 truncate text-xs text-slate-500">{r.username}</div>
                      <div className="mt-2 text-xs text-slate-500">Last activity: {r.last_activity_at ? fmtTime(r.last_activity_at) : '—'}</div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className={`rounded-full px-2 py-0.5 text-xs font-semibold ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                        {active ? 'Active' : 'Inactive'}
                      </div>
                      <div className="text-xs text-slate-600">Rooms: <span className="font-semibold text-slate-900">{Number(r.rooms_inspected) || 0}</span></div>
                      <div className="text-xs text-slate-600">Ops: <span className="font-semibold text-slate-900">{Number(r.activity_count) || 0}</span></div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openInspectionsModal(r.user_id, date);
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      View {fmtDate(date)}
                    </button>
                  </div>
                </button>
              );
            })}

            {!loading && filtered.length === 0 ? (
              <div className="px-5 py-6 text-sm text-slate-500">No students found.</div>
            ) : null}
          </div>
        </div>
      </div>
        </>
      ) : null}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-extrabold text-slate-900">Inspections for {fmtDate(modalDate)}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {modalLoading ? 'Loading…' : `${modalInspections.length} room(s)`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              {modalLoading ? (
                <div className="text-sm text-slate-500">Loading details...</div>
              ) : modalInspections.length === 0 ? (
                <div className="text-sm text-slate-500">No inspections found for this date.</div>
              ) : (
                <div className="grid gap-4">
                  {modalInspections.map((insp, i) => {
                    const hasUpdate = !!insp.assigned_updated_at;
                    const isPastDate = String(modalDate || '') < String(todayYmd);
                    const displayStatus = insp.assigned_status || (hasUpdate ? 'Done' : (isPastDate ? 'Missed' : 'Pending'));
                    const badgeClass =
                      displayStatus === 'Excellent' ? 'bg-emerald-100 text-emerald-700' :
                      displayStatus === 'Good' ? 'bg-sky-100 text-sky-700' :
                      displayStatus === 'Fair' ? 'bg-amber-100 text-amber-700' :
                      displayStatus === 'Poor' ? 'bg-rose-100 text-rose-700' :
                      displayStatus === 'Missed' ? 'bg-rose-100 text-rose-700' :
                      displayStatus === 'Done' ? 'bg-emerald-50 text-emerald-700' :
                      'bg-slate-200 text-slate-700';

                    return (
                      <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold text-slate-900">Room {insp.room_number}</div>
                          <div className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>{displayStatus}</div>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{insp.building_name}{insp.floor_name ? ` • ${insp.floor_name}` : ''}</div>

                        {insp.assigned_remarks ? (
                          <p className="mt-3 text-sm text-slate-700">{insp.assigned_remarks}</p>
                        ) : null}

                        {insp.checklist && insp.checklist.length > 0 ? (
                          <div className="mt-4 border-t border-slate-200 pt-3">
                            <div className="text-[11px] font-extrabold tracking-wide text-slate-500">CHECKLIST DETAILS</div>
                            <div className="mt-2 grid gap-2">
                              {insp.checklist.map((item, j) => {
                                const v = item.operation_is_functional;
                                const n = v === null || v === undefined ? null : Number(v);
                                const label = n === 1 ? 'OK' : n === 0 ? 'Not OK' : 'Pending';
                                const cls = n === 1 ? 'text-emerald-600' : n === 0 ? 'text-rose-600' : 'text-slate-500';

                                return (
                                  <div key={j} className="flex items-center justify-between text-sm">
                                    <div className="text-slate-600">{item.checklist_name}</div>
                                    <div className={`font-semibold ${cls}`}>{label}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
