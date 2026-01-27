import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import CalendarHeatmap from 'react-calendar-heatmap';
import { Tooltip } from 'react-tooltip';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { toast } from '../../utils/toast';

const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

export default function AdminActivity() {
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

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

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

  const loadStudentHistory = async (user) => {
    if (!user?.user_id) return;
    setHistoryLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation: 'getStudentInspectionHistory', json: { user_id: Number(user.user_id) } },
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (res?.data?.success) {
        setHistory(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        setHistory([]);
        toast.error(res?.data?.message || 'Failed to load student history.');
      }
    } catch (e) {
      setHistory([]);
      toast.error('Network error. Please try again.');
    } finally {
      setHistoryLoading(false);
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

  useEffect(() => {
    loadSummary();
  }, [date]);

  const today = new Date();
  const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

  const heatmapValues = useMemo(() => {
    return (Array.isArray(history) ? history : []).map((h) => ({
      date: h.date,
      count: Number(h.count) || 0
    }));
  }, [history]);

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Activity Monitor</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor each student’s inspection activity and drill into details.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
          <button
            type="button"
            onClick={loadSummary}
            disabled={loading}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

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

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_420px]">
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
              const selected = String(selectedStudent?.user_id) === String(r.user_id);
              return (
                <button
                  key={r.user_id}
                  type="button"
                  onClick={async () => {
                    setSelectedStudent(r);
                    await loadStudentHistory(r);
                  }}
                  className={
                    selected
                      ? 'w-full px-5 py-4 text-left bg-emerald-50/60'
                      : 'w-full px-5 py-4 text-left hover:bg-slate-50'
                  }
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

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Student Activity Timeline</div>
              <div className="mt-1 text-xs text-slate-500">
                {selectedStudent ? `Heatmap for ${selectedStudent.full_name}` : 'Select a student to see their activity history.'}
              </div>
            </div>

            {selectedStudent ? (
              <button
                type="button"
                disabled={historyLoading}
                onClick={() => loadStudentHistory(selectedStudent)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {historyLoading ? 'Loading…' : 'Reload'}
              </button>
            ) : null}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 overflow-x-auto">
            {!selectedStudent ? (
              <div className="text-sm text-slate-500">No student selected.</div>
            ) : historyLoading ? (
              <div className="text-sm text-slate-500">Loading history...</div>
            ) : (
              <>
                <CalendarHeatmap
                  startDate={yearAgo}
                  endDate={today}
                  values={heatmapValues}
                  classForValue={(value) => {
                    if (!value) return 'color-empty';
                    const count = Math.min(value.count, 4);
                    return `color-filled-${count}`;
                  }}
                  onClick={(value) => {
                    if (!value?.date) return;
                    openInspectionsModal(selectedStudent.user_id, value.date);
                  }}
                  tooltipDataAttrs={(value) => {
                    if (!value?.date) return {};
                    return {
                      'data-tooltip-id': 'admin-activity-heatmap-tip',
                      'data-tooltip-content': `${fmtDate(value.date)}: ${value.count} inspection${value.count === 1 ? '' : 's'}`
                    };
                  }}
                />
                <Tooltip id="admin-activity-heatmap-tip" />
              </>
            )}
          </div>

          <div className="mt-3 text-xs text-slate-500">
            Tip: Click a day on the heatmap to open that day’s room checklist details.
          </div>
        </div>
      </div>

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
                    const displayStatus = insp.assigned_status || (hasUpdate ? 'Done' : 'Pending');
                    const badgeClass =
                      displayStatus === 'Excellent' ? 'bg-emerald-100 text-emerald-700' :
                      displayStatus === 'Good' ? 'bg-sky-100 text-sky-700' :
                      displayStatus === 'Fair' ? 'bg-amber-100 text-amber-700' :
                      displayStatus === 'Poor' ? 'bg-rose-100 text-rose-700' :
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
