import React, { useCallback, useEffect, useMemo, useState } from 'react';

import axios from 'axios';

import { SecureStorage } from '../../utils/encryption';

import { getApiBaseUrl } from '../../utils/apiConfig';

import { useAuth } from '../../auth/AuthContext';

import { toast } from '../../utils/toast';
import { useMediaQuery } from 'react-responsive';



const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

// Helper: Get current date in Asia/Manila timezone as YYYY-MM-DD
const getManilaDate = () => {
  const now = new Date();
  // Use Intl.DateTimeFormat for more reliable timezone conversion
  const formatter = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
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

  const isMobile = useMediaQuery({ maxWidth: 640 });

  const selectedAssignment = useMemo(() => {
    const id = Number(selectedAssignmentId);
    if (!id) return null;
    return assignments.find((a) => Number(a.assigned_id) === id) || null;
  }, [assignments, selectedAssignmentId]);

  const loadRoomsByAssignmentId = useCallback(async (assignedId) => {

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

  }, [baseUrl]);



  const loadAssignmentAndRooms = useCallback(async () => {

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

  }, [assignedUserId, baseUrl, selectedAssignmentId, todayYmd, loadRoomsByAssignmentId]);



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
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([checklistId, value]) => ({
        checklist_id: Number(checklistId),
        status: value
      }));



    if (operations.length === 0) {
      toast.error('Please provide a value for at least one checklist item.');
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

  }, [assignedUserId, loadAssignmentAndRooms]);

  useEffect(() => {

    if (!selectedAssignmentId) return;

    setAssignment(selectedAssignment);

    loadRoomsByAssignmentId(selectedAssignmentId);

  }, [selectedAssignmentId, loadRoomsByAssignmentId, selectedAssignment]);




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
        <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
          <div className="text-xs font-semibold text-slate-500">Select assignment:</div>
          <div className="w-full sm:w-auto">
            <select
              className="w-full sm:w-auto min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 truncate"
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



      {isChecklistOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm ${isMobile ? 'p-0' : 'p-4'}`}
          onMouseDown={(e) => e.target === e.currentTarget && setIsChecklistOpen(false)}
        >
          <div
            className={`flex w-full flex-col bg-white shadow-2xl ${
              isMobile ? 'h-full max-w-full rounded-none' : 'max-w-3xl rounded-2xl'
            }`}
            style={{ maxHeight: isMobile ? '100vh' : 'calc(100vh - 2rem)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Room {selectedRoom?.room_number}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedRoom?.building_name} • {selectedRoom?.floor_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isViewOnly
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {selectedRoom?.status || 'Pending'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsChecklistOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className={`flex-1 overflow-hidden ${isMobile ? 'flex flex-col' : 'flex flex-row'}`}>
              {/* Left side: Checklist */}
              <div className={`${isMobile ? 'flex-1 overflow-y-auto p-4' : 'flex-1 overflow-y-auto border-r border-slate-200 p-5'}`}>
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Inspection Checklist</h3>
                  <p className="text-xs text-slate-500">Mark each item as OK or Not OK</p>
                </div>

                {checklistLoading ? (
                  <div className="flex items-center gap-3 py-8 text-slate-500">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
                    <span className="text-sm">Loading checklist...</span>
                  </div>
                ) : checklist.length === 0 ? (
                  <div className="rounded-xl bg-slate-50 py-8 text-center">
                    <p className="text-sm text-slate-500">No checklist items found for this room.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {checklist.map((item) => {
                      const cid = Number(item.checklist_id);
                      const itemType = item.checklist_type || 'boolean';
                      const v = selectedByChecklistId[cid] ?? null;

                      // Render based on item type
                      const renderInput = () => {
                        switch (itemType) {
                          case 'quantity':
                            const expectedQty = item.checklist_quantity;
                            const currentVal = v !== null ? v : '';
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500">Found:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={currentVal}
                                    onChange={(e) => selectChecklistStatus(cid, e.target.value)}
                                    disabled={isViewOnly}
                                    placeholder={`Expected: ${expectedQty}`}
                                    className={`w-20 rounded-lg border px-3 py-2 text-sm font-semibold text-center outline-none transition ${
                                      isViewOnly ? 'cursor-not-allowed opacity-60 bg-slate-100' : 'border-slate-200 bg-white text-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                                    }`}
                                  />
                                  <span className="text-xs text-slate-500">/ {expectedQty}</span>
                                </div>
                                {currentVal !== '' && Number(currentVal) !== Number(expectedQty) && (
                                  <div className="text-xs text-amber-600">
                                    ⚠️ Expected {expectedQty}, found {currentVal}
                                  </div>
                                )}
                              </div>
                            );

                          case 'condition':
                            const options = item.checklist_options ? item.checklist_options.split(',').map(o => o.trim()) : [];
                            return (
                              <select
                                value={v || ''}
                                onChange={(e) => selectChecklistStatus(cid, e.target.value)}
                                disabled={isViewOnly}
                                className={`w-full rounded-lg border px-3 py-2.5 text-sm font-semibold outline-none transition ${
                                  v
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 bg-white text-slate-600'
                                } ${isViewOnly ? 'cursor-not-allowed opacity-60' : 'hover:border-emerald-300'}`}
                              >
                                <option value="">Select condition...</option>
                                {options.map((opt) => (
                                  <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                                ))}
                              </select>
                            );

                          case 'boolean':
                          default:
                            const isOk = v !== null && v !== undefined && Number(v) === 1;
                            const isNotOk = v !== null && v !== undefined && Number(v) === 0;
                            return (
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => selectChecklistStatus(cid, 1)}
                                  disabled={isViewOnly}
                                  className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                                    isOk
                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                      : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50'
                                  } ${isViewOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  OK
                                </button>

                                <button
                                  type="button"
                                  onClick={() => selectChecklistStatus(cid, 0)}
                                  disabled={isViewOnly}
                                  className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                                    isNotOk
                                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                                      : 'border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50/50'
                                  } ${isViewOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  Not OK
                                </button>
                              </div>
                            );
                        }
                      };

                      const getStatusDisplay = () => {
                        if (v === null || v === undefined) {
                          return <span className="text-xs text-slate-500">Not recorded</span>;
                        }
                        if (itemType === 'quantity') {
                          const expected = item.checklist_quantity;
                          const match = Number(v) === Number(expected);
                          return (
                            <span className={`text-xs ${match ? 'text-emerald-600' : 'text-amber-600'}`}>
                              Found {v} of {expected}
                            </span>
                          );
                        }
                        if (itemType === 'condition') {
                          return <span className="text-xs text-emerald-600">{v}</span>;
                        }
                        // boolean
                        return Number(v) === 1
                          ? <span className="text-xs text-emerald-600">OK</span>
                          : <span className="text-xs text-rose-600">Not OK</span>;
                      };

                      const getStatusColor = () => {
                        if (v === null || v === undefined) return 'bg-slate-300';
                        if (itemType === 'quantity') {
                          return Number(v) === Number(item.checklist_quantity) ? 'bg-emerald-500' : 'bg-amber-500';
                        }
                        if (itemType === 'condition') {
                          const goodOptions = ['good', 'clean', 'working', 'functional', 'ok'];
                          return goodOptions.some(g => v.toLowerCase().includes(g)) ? 'bg-emerald-500' : 'bg-amber-500';
                        }
                        return Number(v) === 1 ? 'bg-emerald-500' : 'bg-rose-500';
                      };

                      return (
                        <div
                          key={cid}
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="mb-3">
                            <span className="text-sm font-semibold text-slate-900">
                              {item.checklist_name}
                            </span>
                            {itemType === 'quantity' && item.checklist_quantity && (
                              <span className="ml-2 text-xs text-slate-500">
                                (Expected: {item.checklist_quantity})
                              </span>
                            )}
                          </div>

                          {renderInput()}

                          <div className="mt-2 flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full ${getStatusColor()}`} />
                            {getStatusDisplay()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right side: Overall Condition, Remarks, Submit (web only) */}
              {!isMobile && (
                <div className="w-80 flex flex-col bg-slate-50/50 p-5">
                  <div className="flex-1 overflow-y-auto space-y-4">
                    {/* Overall Condition */}
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-900">
                        Overall Condition
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Excellent', 'Good', 'Fair', 'Poor'].map((label) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setOverallCondition(label)}
                            disabled={isViewOnly}
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                              overallCondition === label
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/30'
                            } ${isViewOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Remarks */}
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-900">
                        Remarks
                      </label>
                      <textarea
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        placeholder="Add remarks about the inspection..."
                        rows={4}
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        disabled={isViewOnly}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-slate-200 mt-4">
                    <button
                      type="button"
                      onClick={submitInspection}
                      disabled={submitting || isViewOnly}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 hover:shadow-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    >
                      {submitting ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Submit Inspection
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Footer (overall condition, remarks, submit) */}
            {isMobile && (
              <div className={`border-t border-slate-200 ${isMobile ? 'p-4 pb-safe' : 'p-5'}`}>
                <div className="space-y-4">
                  {/* Overall Condition */}
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-900">
                      Overall Condition
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Excellent', 'Good', 'Fair', 'Poor'].map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setOverallCondition(label)}
                          disabled={isViewOnly}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                            overallCondition === label
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/30'
                          } ${isViewOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-900">
                      Remarks
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="Add remarks about the inspection..."
                      rows={3}
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      disabled={isViewOnly}
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={submitInspection}
                      disabled={submitting || isViewOnly}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 hover:shadow-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                    >
                      {submitting ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Submit Inspection
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>

  );

}

