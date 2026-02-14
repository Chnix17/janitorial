import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { useAuth } from '../../auth/AuthContext';
import { toast } from '../../utils/toast';

const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [activity, setActivity] = useState({ count: 0, isActive: false });
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');

  const baseUrl = useMemo(() => {
    const storedUrl = SecureStorage.getLocalItem('janitorial_url');
    return withSlash(storedUrl || getApiBaseUrl());
  }, []);

  const assignedUserId = useMemo(() => {
    const id = user?.user_id;
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [user]);

  const todayYmd = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const selectedAssignment = useMemo(() => {
    const id = Number(selectedAssignmentId);
    if (!id) return null;
    return assignments.find((a) => Number(a.assigned_id) === id) || null;
  }, [assignments, selectedAssignmentId]);

  const loadDashboard = useCallback(async () => {
    if (!assignedUserId) {
      setRooms([]);
      setActivity({ count: 0, isActive: false });
      setAssignments([]);
      setSelectedAssignmentId('');
      return;
    }

    setLoading(true);
    try {
      const assignmentsRes = await axios.post(
        `${baseUrl}student.php`,
        { operation: 'getAssignments', json: { assigned_user_id: assignedUserId } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const activityRes = await axios.post(
        `${baseUrl}student.php`,
        { operation: 'getTodayActivity', json: { assigned_user_id: assignedUserId } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!assignmentsRes?.data?.success) {
        setAssignments([]);
        setSelectedAssignmentId('');
        setRooms([]);
        toast.error(assignmentsRes?.data?.message || 'Failed to load assignments.');
      } else {
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

        if (nextSelectedId) {
          const chosen = list.find((a) => String(a.assigned_id) === String(nextSelectedId)) || null;
          if (chosen && todayYmd < chosen.assigned_start_date) {
            setSelectedAssignmentId('');
            setRooms([]);
          }
        }
      }

      if (activityRes?.data?.success) {
        const payload = activityRes?.data?.data || {};
        setActivity({
          count: Number(payload.activity_count) || 0,
          isActive: !!payload.is_active_today
        });
      } else {
        setActivity({ count: 0, isActive: false });
      }
    } catch (e) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [assignedUserId, baseUrl, selectedAssignmentId, todayYmd]);

  const loadRoomsForAssignment = useCallback(async () => {
    if (!selectedAssignmentId) {
      setRooms([]);
      return;
    }
    setLoading(true);
    try {
      const roomsRes = await axios.post(
        `${baseUrl}student.php`,
        { operation: 'getAssignedRooms', json: { assigned_id: Number(selectedAssignmentId) } },
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
  }, [baseUrl, selectedAssignmentId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadRoomsForAssignment();
  }, [loadRoomsForAssignment]);

  const todaysAssignments = rooms.length;
  const completedToday = activity.count;
  const pendingInspections = Math.max(todaysAssignments - completedToday, 0);
  const totalInspections = completedToday;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Good morning, {user?.full_name || 'Student'}!</h1>
          <p className="mt-1 text-sm text-slate-500">Here’s your inspection overview for today.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Today's Assignments</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{todaysAssignments}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pending Inspections</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{pendingInspections}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Completed Today</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{completedToday}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Inspections</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{totalInspections}</div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,.08)]">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="text-sm font-semibold text-slate-900">Today’s Room Assignments</div>
          <div className="flex items-center gap-3">
            {assignments.length > 1 && (
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
            )}
            <span className="text-xs font-semibold text-slate-400">View All →</span>
          </div>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="text-sm text-slate-500">Loading...</div>
          ) : rooms.length === 0 ? (
            <div className="text-sm text-slate-500">No rooms available.</div>
          ) : (
            <div className="grid gap-3">
              {rooms.map((room) => (
                <div key={room.room_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Room {room.room_number}</div>
                    <div className="mt-1 text-xs text-slate-500">{room.building_name} • {room.floor_name}</div>
                  </div>
                  <button type="button" className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                    Start Inspection
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
        <div className="text-sm font-semibold text-slate-900">Your Activity Status</div>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <span className={`h-2 w-2 rounded-full ${activity.isActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <div>
            <div className="text-sm font-semibold text-slate-900">
              {activity.isActive ? 'Active Today' : 'Inactive Today'}
            </div>
            <div className="text-xs text-slate-500">
              {activity.isActive
                ? `You have ${activity.count} completed inspection${activity.count === 1 ? '' : 's'} today.`
                : 'No activity recorded for today yet.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
