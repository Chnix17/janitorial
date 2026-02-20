import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useMediaQuery } from 'react-responsive';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { toast } from '../../utils/toast';

const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

export default function AdminAssignments() {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  
  const [students, setStudents] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [buildingFilter, setBuildingFilter] = useState('all');

  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');

  const [form, setForm] = useState({
    assigned_id: '',
    assigned_user_id: '',
    building_id: '',
    assigned_floor_building_id: '',
    assigned_start_date: '',
    assigned_end_date: '',
    assigned_status_enum: 'active'
  });

  const baseUrl = useMemo(() => {
    const storedUrl = SecureStorage.getLocalItem('janitorial_url');
    return withSlash(storedUrl || getApiBaseUrl());
  }, []);

  const resetForm = () => {
    setForm({
      assigned_id: '',
      assigned_user_id: '',
      building_id: '',
      assigned_floor_building_id: '',
      assigned_start_date: '',
      assigned_end_date: '',
      assigned_status_enum: 'active'
    });
    setFloors([]);
  };

  const openCreate = () => {
    resetForm();
    setModalMode('create');
    setOpenModal(true);
  };

  const openEdit = (a) => {
    resetForm();
    setModalMode('edit');
    setForm({
      assigned_id: a?.assigned_id ?? '',
      assigned_user_id: a?.assigned_user_id ?? '',
      building_id: a?.building_id ?? '',
      assigned_floor_building_id: a?.assigned_floor_building_id ?? '',
      assigned_start_date: a?.assigned_start_date ? String(a.assigned_start_date).slice(0, 10) : '',
      assigned_end_date: a?.assigned_end_date ? String(a.assigned_end_date).slice(0, 10) : '',
      assigned_status_enum: a?.assigned_status_enum || 'active'
    });
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setModalMode('create');
    resetForm();
  };

  const loadFloorsByBuilding = useCallback(async (building_id) => {
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
  }, [baseUrl]);

  const loadAll = useCallback(async () => {
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
  }, [baseUrl]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!openModal) return;
    loadFloorsByBuilding(form.building_id);
  }, [openModal, form.building_id, loadFloorsByBuilding]);

  const submit = async (e) => {
    e.preventDefault();

    const assigned_id = form.assigned_id === '' ? '' : Number(form.assigned_id);
    const assigned_user_id = form.assigned_user_id === '' ? '' : Number(form.assigned_user_id);
    const assigned_floor_building_id = form.assigned_floor_building_id === '' ? '' : Number(form.assigned_floor_building_id);
    const assigned_start_date = String(form.assigned_start_date || '').trim();
    const assigned_end_date = String(form.assigned_end_date || '').trim();
    const assigned_status_enum = String(form.assigned_status_enum || '').trim();

    const assigned_by_user_id = Number(
      SecureStorage.getLocalItem('janitorial_user_id') ||
        SecureStorage.getLocalItem('user_id') ||
        0
    );

    if (modalMode === 'create') {
      if (!assigned_user_id) {
        toast.error('Please select a student.');
        return;
      }
    } else {
      if (!assigned_id) {
        toast.error('Missing assignment id.');
        return;
      }
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
      const operation = modalMode === 'edit' ? 'updateAssigned' : 'createAssigned';
      const json =
        modalMode === 'edit'
          ? {
              assigned_id,
              assigned_floor_building_id,
              assigned_start_date,
              assigned_end_date,
              assigned_status_enum
            }
          : {
              assigned_user_id,
              assigned_floor_building_id,
              assigned_start_date,
              assigned_end_date,
              assigned_status_enum,
              assigned_by_user_id
            };

      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation, json },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        toast.success(modalMode === 'edit' ? 'Assignment updated.' : 'Assignment created.');
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

  const getStatus = (a) => {
    const s = String(a?.assigned_status_enum || '').toLowerCase();
    if (s === 'active' || s === 'completed' || s === 'inactive') return s;
    return 'active';
  };

  const filteredAssignments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assignments
      .filter((a) => {
        if (statusFilter === 'all') return true;
        return getStatus(a) === statusFilter;
      })
      .filter((a) => {
        if (buildingFilter === 'all') return true;
        return String(a?.building_name || '') === buildingFilter;
      })
      .filter((a) => {
        if (!q) return true;
        const student = String(a?.assigned_user_name || '').toLowerCase();
        const building = String(a?.building_name || '').toLowerCase();
        const floor = String(a?.floor_name || '').toLowerCase();
        return student.includes(q) || building.includes(q) || floor.includes(q);
      });
  }, [assignments, buildingFilter, query, statusFilter]);

  const buildingOptions = useMemo(() => {
    const names = new Set();
    for (const a of assignments) {
      const n = String(a?.building_name || '').trim();
      if (n) names.add(n);
    }
    return Array.from(names).sort((x, y) => x.localeCompare(y));
  }, [assignments]);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Assignments</h1>
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

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,.08)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student, building, floor…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:max-w-sm"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:max-w-[180px]"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:max-w-[220px]"
          >
            <option value="all">All buildings</option>
            {buildingOptions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="text-sm text-slate-600">Showing <span className="font-semibold text-slate-900">{filteredAssignments.length}</span> of {assignments.length}</div>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setStatusFilter('all');
              setBuildingFilter('all');
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </div>

      {openModal ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className={`w-full rounded-2xl bg-white p-5 shadow-xl ${isMobile ? 'max-w-full h-full overflow-y-auto' : 'max-w-xl'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-slate-900">{modalMode === 'edit' ? 'Edit Assignment' : 'Add Assignment'}</div>
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
                  disabled={modalMode === 'edit'}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="">Select student...</option>
                  {students.map((u) => (
                    <option key={u.user_id} value={u.user_id}>{u.full_name}</option>
                  ))}
                </select>
              </label>

              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
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
              </div>

              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
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

              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Status
                <select
                  value={form.assigned_status_enum}
                  onChange={(e) => setForm((p) => ({ ...p, assigned_status_enum: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'justify-end'}`}>
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

      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,.08)]">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[1.2fr_1.3fr_1.1fr_.9fr_1fr_.6fr] gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500">
            <div>Student</div>
            <div>Location</div>
            <div>Dates</div>
            <div>Status</div>
            <div>Created</div>
            <div className="text-right">Action</div>
          </div>

          <div>
            {loading ? (
              <div className="px-5 py-6 text-sm text-slate-500">Loading assignments…</div>
            ) : null}

            {!loading ? (
              filteredAssignments.map((a) => {
                const status = getStatus(a);
                const badgeClass =
                  status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                    : status === 'completed'
                      ? 'bg-sky-50 text-sky-700 ring-sky-200'
                      : status === 'inactive'
                        ? 'bg-slate-100 text-slate-700 ring-slate-200'
                        : 'bg-amber-50 text-amber-700 ring-amber-200';

                return (
                  <div key={a.assigned_id} className="grid grid-cols-[1.2fr_1.3fr_1.1fr_.9fr_1fr_.6fr] items-center gap-2 border-b border-slate-100 px-5 py-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{a.assigned_user_name || ''}</div>
                
                    </div>
                    <div className="text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">{a.building_name || ''}</div>
                      <div className="text-xs text-slate-500">{a.floor_name || ''}</div>
                    </div>
                    <div className="text-sm text-slate-600">{fmtDate(a.assigned_start_date)} - {fmtDate(a.assigned_end_date)}</div>
                    <div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badgeClass}`}>{status}</span>
                    </div>
                    <div className="text-sm text-slate-600">{fmtDate(a.assigned_created_at)}</div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        disabled={loading}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })
            ) : null}

            {!loading && filteredAssignments.length === 0 ? (
              <div className="px-5 py-6 text-sm text-slate-500">No assignments found for the current filters.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
