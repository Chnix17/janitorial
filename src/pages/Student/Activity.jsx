import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import CalendarHeatmap from 'react-calendar-heatmap';
import { Tooltip } from 'react-tooltip';
import { useAuth } from '../../auth/AuthContext';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { toast } from '../../utils/toast';
import './activity.css';

const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

export default function Activity() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listMode, setListMode] = useState('daily');
  const [expandedKey, setExpandedKey] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState(null);
  const [modalInspections, setModalInspections] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

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

    const loadHistory = async () => {
      setLoading(true);
      try {
        const res = await axios.post(
          `${baseUrl}student.php`,
          { operation: 'getInspectionHistory', json: { user_id: userId } },
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (res?.data?.success) {
          setHistory(Array.isArray(res.data.data) ? res.data.data : []);
        } else {
          toast.error(res?.data?.message || 'Failed to load history.');
        }
      } catch (e) {
        toast.error('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [userId, baseUrl]);

  const today = new Date();
  const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

  const heatmapValues = history.map((item) => ({
    date: item.date,
    count: Number(item.count)
  }));

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

  const ymd = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayYmd = useMemo(() => ymd(new Date()), []);

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
    const rows = (Array.isArray(history) ? history : [])
      .map((h) => ({
        date: h.date,
        count: Number(h.count) || 0
      }))
      .filter((r) => !!r.date)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return rows;
  }, [history]);

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
  };

  const stats = useMemo(() => {
    const total = history.reduce((sum, h) => sum + (Number(h.count) || 0), 0);
    const activeDays = history.filter((h) => (Number(h.count) || 0) > 0).length;
    const avgPerDay = activeDays > 0 ? total / activeDays : 0;
    const bestDayCount = history.reduce((m, h) => Math.max(m, Number(h.count) || 0), 0);

    return {
      total,
      activeDays,
      avgPerDay,
      bestDayCount
    };
  }, [history]);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Activity</h1>
          <p className="mt-1 text-sm text-slate-500">Track your inspection submissions over time.</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-extrabold text-slate-900">Inspection Activity</div>
            <div className="mt-1 text-xs text-slate-500">Calendar view for the past year</div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span>Less</span>
            <span className="inline-flex items-center gap-1" aria-hidden="true">
              <span className="h-2 w-2 rounded-full" style={{ background: '#ebedf0' }} />
              <span className="h-2 w-2 rounded-full" style={{ background: '#9be9a8' }} />
              <span className="h-2 w-2 rounded-full" style={{ background: '#40c463' }} />
              <span className="h-2 w-2 rounded-full" style={{ background: '#30a14e' }} />
              <span className="h-2 w-2 rounded-full" style={{ background: '#216e39' }} />
            </span>
            <span>More</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Inspections</div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">{loading ? '—' : stats.total}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Active Days</div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">{loading ? '—' : stats.activeDays}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Avg per Day</div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">{loading ? '—' : stats.avgPerDay.toFixed(1)}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Best Day</div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">{loading ? '—' : stats.bestDayCount}</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 overflow-x-auto">
          {loading ? (
            <div className="text-sm text-slate-500">Loading activity...</div>
          ) : (
            <CalendarHeatmap
              startDate={yearAgo}
              endDate={today}
              values={heatmapValues}
              classForValue={(value) => {
                if (!value) return 'color-empty';
                const count = Math.min(value.count, 4);
                return `color-filled-${count}`;
              }}
              onClick={(value) => value && openDetailsModal(value.date)}
              tooltipDataAttrs={(value) => {
                if (!value?.date) return {};
                return {
                  'data-tooltip-id': 'activity-heatmap-tip',
                  'data-tooltip-content': `${fmtDate(value.date)}: ${value.count} inspection${value.count === 1 ? '' : 's'}`
                };
              }}
            />
          )}
          <Tooltip id="activity-heatmap-tip" />
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-extrabold text-slate-900">Activity List</div>
            <div className="mt-1 text-xs text-slate-500">Browse your inspections by day, week, or month</div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              className={listMode === 'daily'
                ? 'rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white'
                : 'rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white'}
              onClick={() => {
                setListMode('daily');
                setExpandedKey(null);
              }}
            >
              Daily
            </button>
            <button
              type="button"
              className={listMode === 'weekly'
                ? 'rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white'
                : 'rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white'}
              onClick={() => {
                setListMode('weekly');
                setExpandedKey(null);
              }}
            >
              Weekly
            </button>
            <button
              type="button"
              className={listMode === 'monthly'
                ? 'rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white'
                : 'rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white'}
              onClick={() => {
                setListMode('monthly');
                setExpandedKey(null);
              }}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : listMode === 'daily' ? (
            dailyRows.length === 0 ? (
              <div className="text-sm text-slate-500">No activity yet.</div>
            ) : (
              <div className="grid gap-2">
                {dailyRows.slice(0, 60).map((r) => (
                  <button
                    key={r.date}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
                    onClick={() => openDetailsModal(r.date)}
                  >
                    <span className="text-sm font-semibold text-slate-800">{fmtDate(r.date)}</span>
                    <span className="text-sm text-slate-500">{r.count}</span>
                  </button>
                ))}
              </div>
            )
          ) : listMode === 'weekly' ? (
            weeklyGroups.length === 0 ? (
              <div className="text-sm text-slate-500">No activity yet.</div>
            ) : (
              <div className="grid gap-2">
                {weeklyGroups.slice(0, 26).map((g) => {
                  const isOpen = expandedKey === g.key;
                  return (
                    <div key={g.key} className="grid gap-2">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
                        onClick={() => setExpandedKey((k) => (k === g.key ? null : g.key))}
                      >
                        <span className="text-sm font-semibold text-slate-800">{fmtDate(g.start)} - {fmtDate(g.end)}</span>
                        <span className="text-sm text-slate-500">{g.total}</span>
                      </button>
                      {isOpen ? (
                        <div className="grid gap-2 pl-4">
                          {g.days.map((d) => (
                            <button
                              key={d.date}
                              type="button"
                              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
                              onClick={() => openDetailsModal(d.date)}
                            >
                              <span className="text-sm font-semibold text-slate-800">{fmtDate(d.date)}</span>
                              <span className="text-sm text-slate-500">{d.count}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            monthlyGroups.length === 0 ? (
              <div className="text-sm text-slate-500">No activity yet.</div>
            ) : (
              <div className="grid gap-2">
                {monthlyGroups.slice(0, 12).map((g) => {
                  const isOpen = expandedKey === g.key;
                  return (
                    <div key={g.key} className="grid gap-2">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
                        onClick={() => setExpandedKey((k) => (k === g.key ? null : g.key))}
                      >
                        <span className="text-sm font-semibold text-slate-800">{g.label}</span>
                        <span className="text-sm text-slate-500">{g.total}</span>
                      </button>
                      {isOpen ? (
                        <div className="grid gap-2 pl-4">
                          {g.days.map((d) => (
                            <button
                              key={d.date}
                              type="button"
                              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
                              onClick={() => openDetailsModal(d.date)}
                            >
                              <span className="text-sm font-semibold text-slate-800">{fmtDate(d.date)}</span>
                              <span className="text-sm text-slate-500">{d.count}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100" aria-hidden="true">📅</div>
                  <div>
                    <div className="text-base font-extrabold text-slate-900">Inspections for {fmtDate(modalDate)}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {modalLoading
                        ? 'Loading…'
                        : (() => {
                          const totalRooms = modalInspections.length;
                          const completed = modalInspections.filter((x) => !!x.assigned_updated_at).length;
                          return `${completed} completed • ${totalRooms} total room(s)`;
                        })()}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={closeModal} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
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
                  {modalInspections.map((insp, i) => (
                    <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-slate-900">Room {insp.room_number}</div>
                        {(() => {
                          const hasUpdate = !!insp.assigned_updated_at;
                          const isPastDate = String(modalDate || '') < String(todayYmd);
                          const displayStatus = insp.assigned_status || (hasUpdate ? 'Done' : (isPastDate ? 'Missed' : 'Pending'));
                          const emoji =
                            displayStatus === 'Excellent' ? '🏆' :
                            displayStatus === 'Good' ? '✅' :
                            displayStatus === 'Fair' ? '⚠️' :
                            displayStatus === 'Poor' ? '❌' :
                            displayStatus === 'Missed' ? '⛔' :
                            displayStatus === 'Pending' ? '⏳' :
                            displayStatus === 'Done' ? '🧾' :
                            'ℹ️';
                          const badgeClass =
                            displayStatus === 'Excellent' ? 'bg-emerald-100 text-emerald-700' :
                            displayStatus === 'Good' ? 'bg-sky-100 text-sky-700' :
                            displayStatus === 'Fair' ? 'bg-amber-100 text-amber-700' :
                            displayStatus === 'Poor' ? 'bg-rose-100 text-rose-700' :
                            displayStatus === 'Missed' ? 'bg-rose-100 text-rose-700' :
                            displayStatus === 'Pending' ? 'bg-slate-200 text-slate-700' :
                            displayStatus === 'Done' ? 'bg-emerald-50 text-emerald-700' :
                            'bg-slate-200 text-slate-700';

                          return (
                            <div className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>{emoji} {displayStatus}</div>
                          );
                        })()}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">{insp.building_name}{insp.floor_name ? ` • ${insp.floor_name}` : ''}</div>
                      {insp.assigned_remarks ? (
                        <p className="mt-3 text-sm text-slate-700">{insp.assigned_remarks}</p>
                      ) : null}

                      {insp.checklist && insp.checklist.length > 0 ? (
                        <div className="mt-4 border-t border-slate-200 pt-3">
                          <div className="text-[11px] font-extrabold tracking-wide text-slate-500">CHECKLIST DETAILS</div>
                          <div className="mt-2 grid gap-2">
                            {insp.checklist.map((item, j) => (
                              <div key={j} className="flex items-center justify-between text-sm">
                                <div className="text-slate-600">{item.checklist_name}</div>
                                {(() => {
                                  const v = item.operation_is_functional;
                                  const n = v === null || v === undefined ? null : Number(v);
                                  const label = n === 1 ? 'OK' : n === 0 ? 'No Action' : 'Pending';
                                  const cls = n === 1 ? 'text-emerald-600' : n === 0 ? 'text-slate-600' : 'text-slate-500';
                                  return <div className={`font-semibold ${cls}`}>{label}</div>;
                                })()}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
