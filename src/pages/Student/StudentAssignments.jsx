import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { useAuth } from '../../auth/AuthContext';
import { toast } from '../../utils/toast';

const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

export default function StudentAssignments() {
  const { user } = useAuth();

  const baseUrl = useMemo(() => {
    const storedUrl = SecureStorage.getLocalItem('janitorial_url');
    return withSlash(storedUrl || getApiBaseUrl());
  }, []);

  const [loading, setLoading] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [missedLoading, setMissedLoading] = useState(false);
  const [missedGroups, setMissedGroups] = useState([]);
  const [missedModalOpen, setMissedModalOpen] = useState(false);
  const [missedSelected, setMissedSelected] = useState(null);

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklist, setChecklist] = useState([]);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [selectedByChecklistId, setSelectedByChecklistId] = useState({});
  const [overallCondition, setOverallCondition] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const assignedUserId = useMemo(() => {
    const id = user?.user_id;
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [user]);

  const ymd = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const addDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  };

  const pastDates = useMemo(() => {
    const base = new Date();
    const daysBack = [1, 2, 3];
    return daysBack.map((n) => ymd(addDays(base, -n)));
  }, []);

  const loadMissedRooms = async (a) => {
    if (!assignedUserId) {
      setMissedGroups([]);
      return;
    }

    const assignedFloorBuildingId = Number(a?.assigned_floor_building_id);
    if (!assignedFloorBuildingId) {
      setMissedGroups([]);
      return;
    }

    const assignedStart = String(a?.assigned_start_date || '').trim();
    const assignedEnd = String(a?.assigned_end_date || '').trim();

    const yesterday = ymd(addDays(new Date(), -1));
    const endLimit = assignedEnd && assignedEnd < yesterday ? assignedEnd : yesterday;

    const datesToFetch = pastDates
      .filter((d) => !assignedStart || String(d) >= assignedStart)
      .filter((d) => !assignedEnd || String(d) <= endLimit);

    if (datesToFetch.length === 0) {
      setMissedGroups([]);
      return;
    }

    setMissedLoading(true);
    try {
      const results = await Promise.all(
        datesToFetch.map(async (date) => {
          const res = await axios.post(
            `${baseUrl}student.php`,
            {
              operation: 'getMissedClassrooms',
              json: {
                assigned_user_id: Number(assignedUserId),
                assigned_floor_building_id: assignedFloorBuildingId,
                date
              }
            },
            { headers: { 'Content-Type': 'application/json' } }
          );

          if (!res?.data?.success) {
            return { date, rooms: [], error: res?.data?.message || 'Failed to load missed tasks.' };
          }

          return { date, rooms: Array.isArray(res.data.data) ? res.data.data : [], error: null };
        })
      );

      const anyError = results.find((x) => !!x.error);
      if (anyError) {
        toast.error(anyError.error);
      }

      setMissedGroups(
        results
          .map((r) => ({ date: r.date, rooms: r.rooms }))
          .filter((g) => Array.isArray(g.rooms) && g.rooms.length > 0)
          .sort((a2, b2) => String(b2.date).localeCompare(String(a2.date)))
      );
    } catch (e) {
      setMissedGroups([]);
      toast.error('Network error. Please try again.');
    } finally {
      setMissedLoading(false);
    }
  };

  const loadAssignmentAndRooms = async () => {
    if (!assignedUserId) {
      setAssignment(null);
      setRooms([]);
      setMissedGroups([]);
      return;
    }

    setLoading(true);
    try {
      const assignmentRes = await axios.post(
        `${baseUrl}student.php`,
        { operation: 'getCurrentAssignment', json: { assigned_user_id: assignedUserId } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!assignmentRes?.data?.success) {
        setAssignment(null);
        setRooms([]);
        toast.error(assignmentRes?.data?.message || 'Failed to load assignment.');
        return;
      }

      const a = assignmentRes?.data?.data || null;
      setAssignment(a);

      if (!a?.assigned_floor_building_id) {
        setRooms([]);
        setMissedGroups([]);
        return;
      }

      const roomsRes = await axios.post(
        `${baseUrl}student.php`,
        { operation: 'getAssignedRooms', json: { assigned_floor_building_id: Number(a.assigned_floor_building_id) } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (roomsRes?.data?.success) {
        setRooms(Array.isArray(roomsRes.data.data) ? roomsRes.data.data : []);
      } else {
        setRooms([]);
        toast.error(roomsRes?.data?.message || 'Failed to load rooms.');
      }

      await loadMissedRooms(a);
    } catch (e) {
      setAssignment(null);
      setRooms([]);
      setMissedGroups([]);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadChecklist = async (room) => {
    if (!room?.room_id) {
      setSelectedRoom(null);
      setChecklist([]);
      setIsChecklistOpen(false);
      setSelectedByChecklistId({});
      setOverallCondition('');
      setRemarks('');
      return;
    }

    setSelectedRoom(room);
    setIsChecklistOpen(true);
    setChecklistLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}student.php`,
        { operation: 'getRoomChecklist', json: { room_id: Number(room.room_id) } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        const items = Array.isArray(res.data.data) ? res.data.data : [];
        setChecklist(items);
        const seeded = {};
        items.forEach((item) => {
          if (item.operation_is_functional === null || typeof item.operation_is_functional === 'undefined') {
            return;
          }
          const val = Number(item.operation_is_functional);
          if (val === 0 || val === 1) {
            seeded[item.checklist_id] = val;
          }
        });
        setSelectedByChecklistId(seeded);
      } else {
        setChecklist([]);
        setSelectedByChecklistId({});
        toast.error(res?.data?.message || 'Failed to load checklist.');
      }
    } catch (e) {
      setChecklist([]);
      toast.error('Network error. Please try again.');
    } finally {
      setChecklistLoading(false);
    }
  };

  const selectChecklistStatus = (checklistId, status) => {
    setSelectedByChecklistId((prev) => ({ ...prev, [checklistId]: status }));
  };

  const submitInspection = async () => {
    if (!assignedUserId || !assignment?.assigned_id || !selectedRoom?.room_id) return;
    if (!overallCondition) {
      toast.error('Please select the overall condition.');
      return;
    }

    const operations = Object.entries(selectedByChecklistId)
      .filter(([, value]) => value === 0 || value === 1)
      .map(([checklistId, value]) => ({
        checklist_id: Number(checklistId),
        status: Number(value)
      }));

    if (operations.length === 0) {
      toast.error('Please select OK or Not OK for at least one checklist item.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(
        `${baseUrl}student.php`,
        {
          operation: 'submitInspection',
          json: {
            assigned_id: Number(assignment.assigned_id),
            assigned_status: overallCondition,
            assigned_remarks: remarks,
            assigned_reported_by: Number(assignedUserId),
            room_id: Number(selectedRoom.room_id),
            operations
          }
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!res?.data?.success) {
        toast.error(res?.data?.message || 'Failed to submit inspection.');
        return;
      }

      toast.success('Inspection submitted.');
      setIsChecklistOpen(false);
      await loadAssignmentAndRooms();
    } catch (e) {
      toast.error('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    loadAssignmentAndRooms();
  }, [assignedUserId]);

  const selectedRoomId = selectedRoom?.room_id;
  const getStatusLabel = (value) => {
    if (value === null || typeof value === 'undefined') return 'Not recorded';
    if (Number(value) === 1) return 'OK';
    if (Number(value) === 0) return 'Not OK';
    return 'Not recorded';
  };

  const getMissedChecklistLabel = (value) => {
    if (value === null || typeof value === 'undefined') return 'Pending';
    if (Number(value) === 1) return 'OK';
    if (Number(value) === 0) return 'No Action';
    return 'Pending';
  };

  const todayLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, []);

  const fmtDate = (val) => {
    if (!val) return '';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const missedItems = useMemo(() => {
    const items = [];
    for (const g of missedGroups || []) {
      const date = g?.date;
      const roomsForDate = Array.isArray(g?.rooms) ? g.rooms : [];
      for (const r of roomsForDate) {
        items.push({
          key: `${date}:${r?.room_id}`,
          date,
          room: r
        });
      }
    }
    items.sort((a, b) => {
      const d = String(b.date).localeCompare(String(a.date));
      if (d !== 0) return d;
      return String(a?.room?.room_number || '').localeCompare(String(b?.room?.room_number || ''));
    });
    return items;
  }, [missedGroups]);

  const openMissedModal = (item) => {
    setMissedSelected(item);
    setMissedModalOpen(true);
  };

  const closeMissedModal = () => {
    setMissedModalOpen(false);
    setMissedSelected(null);
  };

  return (
    <div className="p-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">My Assignments</h1>
        <p className="mt-1 text-sm text-slate-500">View all your room assignments and inspection status.</p>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">📅</span>
          {todayLabel}
        </div>

        {loading ? (
          <div className="mt-3 text-sm text-slate-500">Loading...</div>
        ) : rooms.length === 0 ? (
          <div className="mt-3 text-sm text-slate-500">No rooms available.</div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rooms.map((room) => (
              <button
                key={room.room_id}
                type="button"
                onClick={() => loadChecklist(room)}
                className="flex w-full items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/40"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">🏫</span>
                    <div>
                      <div className="text-sm font-semibold">Room {room.room_number}</div>
                      <div className="mt-1 text-xs text-slate-500">{room.building_name}</div>
                    </div>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    room.status === 'Done'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {room.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50/40 p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-slate-900">Missed Tasks</div>
            <div className="mt-1 text-xs text-slate-600">Rooms you missed from the past 3 days (excluding today).</div>
          </div>
          {missedGroups.length > 0 ? (
            <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">{missedGroups.reduce((sum, g) => sum + (g.rooms?.length || 0), 0)} missed</div>
          ) : null}
        </div>

        <div className="mt-4">
          {loading || missedLoading ? (
            <div className="text-sm text-slate-600">Loading missed tasks...</div>
          ) : missedItems.length === 0 ? (
            <div className="text-sm text-slate-600">No missed tasks in the past 3 days.</div>
          ) : (
            <div className="grid gap-2">
              {missedItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => openMissedModal(item)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-rose-200 bg-white px-4 py-3 text-left hover:bg-rose-50"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{fmtDate(item.date)} • Room {item?.room?.room_number}</div>
                    <div className="mt-1 text-xs text-slate-500">{item?.room?.building_name} • {item?.room?.floor_name}</div>
                  </div>
                  <div className="text-xs font-semibold text-rose-700">View</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {missedModalOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeMissedModal();
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-extrabold text-slate-900">Missed Room {missedSelected?.room?.room_number}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {fmtDate(missedSelected?.date)} • {missedSelected?.room?.building_name} • {missedSelected?.room?.floor_name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeMissedModal}
                  className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              {Array.isArray(missedSelected?.room?.checklist) && missedSelected.room.checklist.length > 0 ? (
                <div className="grid gap-2">
                  {missedSelected.room.checklist.map((c) => {
                    const v = c.operation_is_functional;
                    const label = getMissedChecklistLabel(v);
                    const cls =
                      label === 'OK'
                        ? 'text-emerald-600'
                        : label === 'No Action'
                          ? 'text-slate-600'
                          : 'text-slate-500';
                    return (
                      <div key={c.checklist_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm">
                        <div className="text-slate-800">{c.checklist_name}</div>
                        <div className={`font-semibold ${cls}`}>{label}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-slate-600">No checklist items found.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isChecklistOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsChecklistOpen(false);
          }}
        >
          <div className="flex w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
            <div className="border-b border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-extrabold text-slate-900">Room {selectedRoom?.room_number}</div>
                  <div className="mt-1 text-xs text-slate-500">{selectedRoom?.building_name} • {selectedRoom?.floor_name}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChecklistOpen(false)}
                  className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-sm font-extrabold text-slate-900">Inspection Checklist</div>
              <div className="mt-4">
                {checklistLoading ? (
                  <div className="text-sm text-slate-500">Loading checklist...</div>
                ) : checklist.length === 0 ? (
                  <div className="text-sm text-slate-500">No checklist items found for this room.</div>
                ) : (
                  <div className="grid gap-4">
                    {checklist.map((item) => {
                      const cid = Number(item.checklist_id);
                      const v = Object.prototype.hasOwnProperty.call(selectedByChecklistId, cid) ? selectedByChecklistId[cid] : null;
                      const isOk = v === 1 || v === '1';
                      const isNotOk = v === 0 || v === '0';

                      return (
                        <div key={cid} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                          <div className="text-sm font-semibold text-slate-900">{item.checklist_name}</div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => selectChecklistStatus(cid, 1)}
                              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${isOk ? 'border-emerald-300 bg-emerald-100 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}
                            >
                              OK
                            </button>
                            <button
                              type="button"
                              onClick={() => selectChecklistStatus(cid, 0)}
                              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${isNotOk ? 'border-rose-300 bg-rose-100 text-rose-700' : 'border-slate-200 bg-white text-slate-600'}`}
                            >
                              Not OK
                            </button>
                          </div>
                          <div className="mt-2 text-xs text-slate-500">Status: {getStatusLabel(v)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 p-5">
              <div className="grid gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Overall Condition</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                    {['Excellent', 'Good', 'Fair', 'Poor'].map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setOverallCondition(label)}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold ${overallCondition === label ? 'border-emerald-300 bg-emerald-100 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-900">Remarks</div>
                  <textarea
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Add remarks about the inspection..."
                    rows={3}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  onClick={submitInspection}
                  disabled={submitting}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Submit Inspection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
