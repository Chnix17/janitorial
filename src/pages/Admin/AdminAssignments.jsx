import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { toast } from '../../utils/toast';

const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

export default function AdminAssignments() {
  const [students, setStudents] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [openModal, setOpenModal] = useState(false);

  const [form, setForm] = useState({
    assigned_user_id: '',
    building_id: '',
    assigned_floor_building_id: '',
    assigned_start_date: '',
    assigned_end_date: ''
  });

  const baseUrl = useMemo(() => {
    const storedUrl = SecureStorage.getLocalItem('janitorial_url');
    return withSlash(storedUrl || getApiBaseUrl());
  }, []);

  const resetForm = () => {
    setForm({
      assigned_user_id: '',
      building_id: '',
      assigned_floor_building_id: '',
      assigned_start_date: '',
      assigned_end_date: ''
    });
    setFloors([]);
  };

  const openCreate = () => {
    resetForm();
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    resetForm();
  };

  const loadFloorsByBuilding = async (building_id) => {
    const bId = building_id === '' ? '' : Number(building_id);
    if (!bId) {
      setFloors([]);
      return;
    }

    try {
      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation: 'getFloors', json: { building_id: bId } },
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (res?.data?.success) {
        setFloors(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        setFloors([]);
        toast.error(res?.data?.message || 'Failed to load floors.');
      }
    } catch (e) {
      setFloors([]);
      toast.error('Network error. Please try again.');
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [studentsRes, buildingsRes, assignedRes] = await Promise.all([
        axios.post(`${baseUrl}admin.php`, { operation: 'getStudents', json: {} }, { headers: { 'Content-Type': 'application/json' } }),
        axios.post(`${baseUrl}admin.php`, { operation: 'getBuildings', json: {} }, { headers: { 'Content-Type': 'application/json' } }),
        axios.post(`${baseUrl}admin.php`, { operation: 'getAssigned', json: {} }, { headers: { 'Content-Type': 'application/json' } })
      ]);

      if (studentsRes?.data?.success) {
        setStudents(Array.isArray(studentsRes.data.data) ? studentsRes.data.data : []);
      } else {
        setStudents([]);
        toast.error(studentsRes?.data?.message || 'Failed to load students.');
      }

      if (buildingsRes?.data?.success) {
        setBuildings(Array.isArray(buildingsRes.data.data) ? buildingsRes.data.data : []);
      } else {
        setBuildings([]);
        toast.error(buildingsRes?.data?.message || 'Failed to load buildings.');
      }

      if (assignedRes?.data?.success) {
        setAssignments(Array.isArray(assignedRes.data.data) ? assignedRes.data.data : []);
      } else {
        setAssignments([]);
        toast.error(assignedRes?.data?.message || 'Failed to load assignments.');
      }
    } catch (e) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!openModal) return;
    loadFloorsByBuilding(form.building_id);
  }, [openModal, form.building_id]);

  const submit = async (e) => {
    e.preventDefault();

    const assigned_user_id = form.assigned_user_id === '' ? '' : Number(form.assigned_user_id);
    const assigned_floor_building_id = form.assigned_floor_building_id === '' ? '' : Number(form.assigned_floor_building_id);
    const assigned_start_date = String(form.assigned_start_date || '').trim();
    const assigned_end_date = String(form.assigned_end_date || '').trim();

    const assigned_by_user_id = Number(
      SecureStorage.getLocalItem('janitorial_user_id') ||
        SecureStorage.getLocalItem('user_id') ||
        0
    );

    if (!assigned_user_id) {
      toast.error('Please select a student.');
      return;
    }

    if (!form.building_id) {
      toast.error('Please select a building.');
      return;
    }

    if (!assigned_floor_building_id) {
      toast.error('Please select a floor.');
      return;
    }

    if (!assigned_start_date || !assigned_end_date) {
      toast.error('Please select start and end dates.');
      return;
    }

    if (!assigned_by_user_id) {
      toast.error('Missing admin user session. Please login again.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}admin.php`,
        {
          operation: 'createAssigned',
          json: {
            assigned_user_id,
            assigned_floor_building_id,
            assigned_start_date,
            assigned_end_date,
            assigned_by_user_id
          }
        },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        toast.success('Assignment created.');
        closeModal();
        await loadAll();
      } else {
        toast.error(res?.data?.message || 'Save failed.');
      }
    } catch (e2) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (val) => {
    if (!val) return '';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Assignments</h1>
          <p className="mt-1 text-sm text-slate-500">Assign students to floors by date</p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          disabled={loading || students.length === 0 || buildings.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          <span className="text-lg leading-none">+</span>
          Add Assignment
        </button>
      </div>

      {openModal ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-extrabold text-slate-900">Add Assignment</div>
              <button type="button" onClick={closeModal} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Student
                <select
                  value={form.assigned_user_id}
                  onChange={(e) => setForm((p) => ({ ...p, assigned_user_id: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="">Select student...</option>
                  {students.map((u) => (
                    <option key={u.user_id} value={u.user_id}>{u.full_name}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Building
                <select
                  value={form.building_id}
                  onChange={(e) => setForm((p) => ({ ...p, building_id: e.target.value, assigned_floor_building_id: '' }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="">Select building...</option>
                  {buildings.map((b) => (
                    <option key={b.building_id} value={b.building_id}>{b.building_name}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Floor
                <select
                  value={form.assigned_floor_building_id}
                  onChange={(e) => setForm((p) => ({ ...p, assigned_floor_building_id: e.target.value }))}
                  disabled={!form.building_id || floors.length === 0}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                >
                  <option value="">
                    {!form.building_id ? 'Select building first...' : (floors.length === 0 ? 'No floors available...' : 'Select floor...')}
                  </option>
                  {floors.map((f) => (
                    <option key={f.floorbuilding_id} value={f.floorbuilding_id}>{f.floor_name}</option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-800">
                  Start date
                  <input
                    type="date"
                    value={form.assigned_start_date}
                    onChange={(e) => setForm((p) => ({ ...p, assigned_start_date: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-800">
                  End date
                  <input
                    type="date"
                    value={form.assigned_end_date}
                    onChange={(e) => setForm((p) => ({ ...p, assigned_end_date: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {loading ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,.08)]">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500">
          <div>Student</div>
          <div>Building</div>
          <div>Floor</div>
          <div>Dates</div>
        </div>

        <div>
          {assignments.map((a) => (
            <div key={a.assigned_id} className="grid grid-cols-[1fr_1fr_1fr_1fr] items-center gap-2 border-b border-slate-100 px-5 py-4">
              <div className="text-sm font-semibold text-slate-900">{a.assigned_user_name || ''}</div>
              <div className="text-sm text-slate-600">{a.building_name || ''}</div>
              <div className="text-sm text-slate-600">{a.floor_name || ''}</div>
              <div className="text-sm text-slate-600">{fmtDate(a.assigned_start_date)} - {fmtDate(a.assigned_end_date)}</div>
            </div>
          ))}

          {!loading && assignments.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-500">No assignments found.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
