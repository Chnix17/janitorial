import React, { useEffect, useMemo, useState } from 'react';

import axios from 'axios';

import { SecureStorage } from '../../utils/encryption';

import { getApiBaseUrl } from '../../utils/apiConfig';

import { useAuth } from '../../auth/AuthContext';

import { toast } from '../../utils/toast';



const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

// Helper: Get current date in Asia/Manila timezone as YYYY-MM-DD
const getManilaDate = () => {
  const now = new Date();
  const manilaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const y = manilaTime.getFullYear();
  const m = String(manilaTime.getMonth() + 1).padStart(2, '0');
  const d = String(manilaTime.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Helper: Check if today is Sunday in Asia/Manila timezone
const isSundayInManila = () => {
  const now = new Date();
  const manilaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  return manilaTime.getDay() === 0;
};



export default function StudentAssignments() {

  const { user } = useAuth();



  const baseUrl = useMemo(() => {

    const storedUrl = SecureStorage.getLocalItem('janitorial_url');

    return withSlash(storedUrl || getApiBaseUrl());

  }, []);



  const [loading, setLoading] = useState(false);

  const [assignment, setAssignment] = useState(null);

  const [assignments, setAssignments] = useState([]);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');

  const [rooms, setRooms] = useState([]);



  const [selectedRoom, setSelectedRoom] = useState(null);

  const [checklistLoading, setChecklistLoading] = useState(false);

  const [checklist, setChecklist] = useState([]);

  const [isChecklistOpen, setIsChecklistOpen] = useState(false);

  const [selectedByChecklistId, setSelectedByChecklistId] = useState({});

  const [overallCondition, setOverallCondition] = useState('');

  const [remarks, setRemarks] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const isViewOnly = useMemo(() => {
    return String(selectedRoom?.status || '').toLowerCase() === 'done';
  }, [selectedRoom]);

  const normalizeOverallCondition = (value) => {
    const v = String(value || '').trim().toLowerCase();
    if (!v) return '';
    if (v === 'excellent') return 'Excellent';
    if (v === 'good') return 'Good';
    if (v === 'fair') return 'Fair';
    if (v === 'poor') return 'Poor';
    return '';
  };



  const assignedUserId = useMemo(() => {

    const id = user?.user_id;

    const n = Number(id);

    return Number.isFinite(n) && n > 0 ? n : null;

  }, [user]);

  const todayYmd = useMemo(() => getManilaDate(), []);

  const isTodaySunday = useMemo(() => isSundayInManila(), []);

  const selectedAssignment = useMemo(() => {
    const id = Number(selectedAssignmentId);
    if (!id) return null;
    return assignments.find((a) => Number(a.assigned_id) === id) || null;
  }, [assignments, selectedAssignmentId]);

  const loadRoomsByAssignmentId = async (assignedId) => {

    const aid = Number(assignedId);

    if (!aid) {

      setRooms([]);

      return;

    }



    setLoading(true);

    try {

      const roomsRes = await axios.post(

        `${baseUrl}student.php`,

        { operation: 'getAssignedRooms', json: { assigned_id: aid } },

        { headers: { 'Content-Type': 'application/json' } }

      );



      if (roomsRes?.data?.success) {

        setRooms(Array.isArray(roomsRes.data.data) ? roomsRes.data.data : []);

      } else {

        setRooms([]);

        toast.error(roomsRes?.data?.message || 'Failed to load rooms.');

      }

    } catch (e) {

      setRooms([]);

      toast.error('Network error. Please try again.');

    } finally {

      setLoading(false);

    }

  };



  const loadAssignmentAndRooms = async () => {

    if (!assignedUserId) {

      setAssignment(null);

      setAssignments([]);

      setSelectedAssignmentId('');

      setRooms([]);

      return;

    }



    setLoading(true);

    try {

      const assignmentsRes = await axios.post(

        `${baseUrl}student.php`,

        { operation: 'getAssignments', json: { assigned_user_id: assignedUserId } },

        { headers: { 'Content-Type': 'application/json' } }

      );



      if (!assignmentsRes?.data?.success) {

        setAssignment(null);

        setAssignments([]);

        setSelectedAssignmentId('');

        setRooms([]);

        toast.error(assignmentsRes?.data?.message || 'Failed to load assignments.');

        return;

      }



      const list = Array.isArray(assignmentsRes.data.data) ? assignmentsRes.data.data : [];

      setAssignments(list);

      let nextSelectedId = selectedAssignmentId;

      const hasSelected = list.some((a) => String(a.assigned_id) === String(nextSelectedId));

      if (!hasSelected) {

        const active = list.find((a) => todayYmd >= a.assigned_start_date && todayYmd <= a.assigned_end_date);

        const started = list.find((a) => todayYmd >= a.assigned_start_date);

        nextSelectedId = String(active?.assigned_id || started?.assigned_id || '');

        setSelectedAssignmentId(nextSelectedId);

      }



      const selected = list.find((a) => String(a.assigned_id) === String(nextSelectedId)) || null;

      setAssignment(selected);

      if (!selected?.assigned_id) {

        setRooms([]);

        return;

      }

      if (todayYmd < selected.assigned_start_date) {

        setSelectedAssignmentId('');

        setAssignment(null);

        setRooms([]);

        return;

      }



      await loadRoomsByAssignmentId(selected.assigned_id);

    } catch (e) {

      setAssignment(null);

      setAssignments([]);

      setSelectedAssignmentId('');

      setRooms([]);

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

    setChecklist([]);

    setSelectedByChecklistId({});

    setOverallCondition('');

    setRemarks('');

    setChecklistLoading(true);

    try {

      const res = await axios.post(

        `${baseUrl}student.php`,

        {
          operation: 'getRoomChecklist',
          json: {
            room_id: Number(room.room_id),
            assigned_id: Number(assignment?.assigned_id) || undefined,
            assigned_reported_by: Number(assignedUserId) || undefined
          }
        },

        { headers: { 'Content-Type': 'application/json' } }

      );



      if (res?.data?.success) {

        const items = Array.isArray(res.data.data) ? res.data.data : [];

        setChecklist(items);

        const insp = res?.data?.inspection || null;
        if (insp && typeof insp === 'object') {
          setOverallCondition(normalizeOverallCondition(insp.assigned_status));
          setRemarks(String(insp.assigned_remarks || ''));
        } else {
          setOverallCondition('');
          setRemarks('');
        }

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

        setOverallCondition('');
        setRemarks('');

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

    if (isViewOnly) return;

    setSelectedByChecklistId((prev) => ({ ...prev, [checklistId]: status }));

  };



  const submitInspection = async () => {

    if (isViewOnly) {
      toast.error('This inspection is already marked as Done and is view-only.');
      return;
    }

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

  useEffect(() => {

    if (!selectedAssignmentId) return;

    setAssignment(selectedAssignment);

    loadRoomsByAssignmentId(selectedAssignmentId);

  }, [selectedAssignmentId]);



  const selectedRoomId = selectedRoom?.room_id;

  const getStatusLabel = (value) => {

    if (value === null || typeof value === 'undefined') return 'Not recorded';

    if (Number(value) === 1) return 'OK';

    if (Number(value) === 0) return 'Not OK';

    return 'Not recorded';

  };



  const todayLabel = useMemo(() => {
    const now = new Date();
    const manilaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    return manilaTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, []);



  return (

    <div className="p-6">

      <div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">My Assignments</h1>

        <p className="mt-1 text-sm text-slate-500">View all your room assignments and inspection status.</p>

      </div>



      {assignments.length > 1 && (

        <div className="mt-4 flex flex-wrap items-center gap-3">

          <div className="text-xs font-semibold text-slate-500">Select assignment:</div>

          <select

            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"

            value={selectedAssignmentId}

            onChange={(e) => setSelectedAssignmentId(e.target.value)}

          >

            {assignments.map((a) => (

              <option

                key={a.assigned_id}

                value={a.assigned_id}

                disabled={todayYmd < a.assigned_start_date}

              >

                {a.building_name} • {a.floor_name} ({a.assigned_start_date} to {a.assigned_end_date}){todayYmd < a.assigned_start_date ? ' - Not started yet' : ''}

              </option>

            ))}

          </select>

        </div>

      )}



      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">

          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">📅</span>

          {todayLabel}

        </div>



        {loading ? (

          <div className="mt-3 text-sm text-slate-500">Loading...</div>

        ) : isTodaySunday ? (

          <div className="mt-3 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
            <span className="font-semibold">Sunday - No inspections scheduled.</span> Please check back tomorrow.
          </div>

        ) : rooms.length === 0 ? (

          <div className="mt-3 text-sm text-slate-500">No rooms available.</div>

        ) : (

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">

            {rooms.map((room) => (

              <button

                key={room.room_id}

                type="button"

                onClick={() => loadChecklist(room)}

                disabled={isTodaySunday}

                className="flex w-full items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-white"

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

                <span
                  className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${
                    isViewOnly ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {selectedRoom?.status || 'Pending'}
                </span>

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
                      const v = selectedByChecklistId[cid] ?? null;
                      const isOk = Number(v) === 1;
                      const isNotOk = Number(v) === 0;

                      return (
                        <div key={cid} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                          <div className="text-sm font-semibold text-slate-900">{item.checklist_name}</div>

                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => selectChecklistStatus(cid, 1)}
                              disabled={isViewOnly}
                              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                                isOk ? 'border-emerald-300 bg-emerald-100 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'
                              }`}
                            >
                              OK
                            </button>

                            <button
                              type="button"
                              onClick={() => selectChecklistStatus(cid, 0)}
                              disabled={isViewOnly}
                              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                                isNotOk ? 'border-rose-300 bg-rose-100 text-rose-700' : 'border-slate-200 bg-white text-slate-600'
                              }`}
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
                        disabled={isViewOnly}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                          overallCondition === label
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
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
                    disabled={isViewOnly}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={submitInspection}
                    disabled={submitting || isViewOnly}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {submitting ? 'Submitting…' : 'Submit Inspection'}
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>

      ) : null}

    </div>

  );

}

