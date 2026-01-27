import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { toast } from '../../utils/toast';

const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

export default function AdminFloors() {
  const [buildings, setBuildings] = useState([]);
  const [floorNames, setFloorNames] = useState([]);
  const [floors, setFloors] = useState([]);
  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ building_id: '', floor_id: '' });

  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRootRefById = useRef({});

  const baseUrl = useMemo(() => {
    const storedUrl = SecureStorage.getLocalItem('janitorial_url');
    return withSlash(storedUrl || getApiBaseUrl());
  }, []);

  const buildingNameById = useMemo(() => {
    const map = new Map();
    buildings.forEach((b) => map.set(String(b.building_id), b.building_name));
    return map;
  }, [buildings]);

  const floorNameById = useMemo(() => {
    const map = new Map();
    floorNames.forEach((f) => map.set(String(f.floor_id), f.floor_name));
    return map;
  }, [floorNames]);

  const filteredFloors = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    const bId = String(buildingFilter || '');
    return floors.filter((f) => {
      const matchesQuery = !q || String(f.floor_name || floorNameById.get(String(f.floor_id)) || '').toLowerCase().includes(q);
      const matchesBuilding = !bId || String(f.building_id) === bId;
      return matchesQuery && matchesBuilding;
    });
  }, [floors, search, buildingFilter, floorNameById]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [bRes, fRes, fnRes] = await Promise.all([
        axios.post(`${baseUrl}admin.php`, { operation: 'getBuildings', json: {} }, { headers: { 'Content-Type': 'application/json' } }),
        axios.post(`${baseUrl}admin.php`, { operation: 'getFloors', json: {} }, { headers: { 'Content-Type': 'application/json' } }),
        axios.post(`${baseUrl}admin.php`, { operation: 'getFloorNames', json: {} }, { headers: { 'Content-Type': 'application/json' } })
      ]);

      if (bRes?.data?.success) {
        setBuildings(Array.isArray(bRes.data.data) ? bRes.data.data : []);
      } else {
        setBuildings([]);
        toast.error(bRes?.data?.message || 'Failed to load buildings.');
      }

      if (fRes?.data?.success) {
        setFloors(Array.isArray(fRes.data.data) ? fRes.data.data : []);
      } else {
        setFloors([]);
        toast.error(fRes?.data?.message || 'Failed to load floors.');
      }

      if (fnRes?.data?.success) {
        setFloorNames(Array.isArray(fnRes.data.data) ? fnRes.data.data : []);
      } else {
        setFloorNames([]);
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
    if (!openMenuId) return;

    const handleDocumentMouseDown = (e) => {
      const root = menuRootRefById.current[String(openMenuId)];
      if (root && root.contains(e.target)) return;
      setOpenMenuId(null);
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [openMenuId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ building_id: '', floor_id: '' });
    setOpenModal(true);
  };

  const openEdit = (f) => {
    setEditing(f);
    setForm({
      building_id: f?.building_id ?? '',
      floor_id: f?.floor_id ?? ''
    });
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(null);
    setForm({ building_id: '', floor_id: '' });
  };

  const submit = async (e) => {
    e.preventDefault();

    const building_id = form.building_id === '' ? '' : Number(form.building_id);
    const floor_id = form.floor_id === '' ? '' : Number(form.floor_id);

    if (!building_id) {
      toast.error('Please select a building.');
      return;
    }

    if (!floor_id) {
      toast.error('Please select a floor.');
      return;
    }

    const existsInClient = floors.some((f) => {
      const sameBuilding = String(f.building_id) === String(building_id);
      const sameFloor = String(f.floor_id) === String(floor_id);
      const notSelf = editing ? String(f.floorbuilding_id) !== String(editing.floorbuilding_id) : true;
      return sameBuilding && sameFloor && notSelf;
    });

    if (existsInClient) {
      toast.error('Floor already exists for this building.');
      return;
    }

    setLoading(true);
    try {
      const operation = editing ? 'updateFloor' : 'createFloor';
      const json = editing
        ? { floorbuilding_id: editing.floorbuilding_id, building_id, floor_id }
        : { building_id, floor_id };

      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation, json },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        closeModal();
        toast.success(editing ? 'Floor updated.' : 'Floor created.');
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

  const remove = async (f) => {
    if (!window.confirm(`Delete floor "${f.floor_name || floorNameById.get(String(f.floor_id)) || ''}"?`)) return;

    setLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation: 'deleteFloor', json: { floorbuilding_id: f.floorbuilding_id } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        toast.success('Floor deleted.');
        await loadAll();
      } else {
        toast.error(res?.data?.message || 'Delete failed.');
      }
    } catch (e) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Floors</h1>
          <p className="mt-1 text-sm text-slate-500">Assign floor names to buildings</p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          disabled={loading || buildings.length === 0 || floorNames.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          <span className="text-lg leading-none">+</span>
          Add Floor
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search floors..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>

        <select
          value={buildingFilter}
          onChange={(e) => setBuildingFilter(e.target.value)}
          className="w-full max-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        >
          <option value="">All Buildings</option>
          {buildings.map((b) => (
            <option key={b.building_id} value={b.building_id}>{b.building_name}</option>
          ))}
        </select>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,.08)]">
        <div className="grid grid-cols-[1fr_1fr_56px] gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500">
          <div>Floor</div>
          <div>Building</div>
          <div />
        </div>

        <div>
          {filteredFloors.map((f) => {
            const bName = f.building_name || buildingNameById.get(String(f.building_id)) || '';
            const floorName = f.floor_name || floorNameById.get(String(f.floor_id)) || '';
            return (
              <div key={f.floorbuilding_id} className="grid grid-cols-[1fr_1fr_56px] items-center gap-2 border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">#</div>
                  <div className="text-sm font-semibold text-slate-900">{floorName}</div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-slate-400">🏢</span>
                  <span>{bName}</span>
                </div>

                <div
                  className="relative flex justify-end"
                  ref={(el) => {
                    if (el) menuRootRefById.current[String(f.floorbuilding_id)] = el;
                  }}
                >
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                    onClick={() => setOpenMenuId((p) => (p === f.floorbuilding_id ? null : f.floorbuilding_id))}
                  >
                    ...
                  </button>

                  {openMenuId === f.floorbuilding_id ? (
                    <div
                      className="absolute right-0 top-8 z-50 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                    >
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          setOpenMenuId(null);
                          openEdit(f);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                        onClick={() => {
                          setOpenMenuId(null);
                          remove(f);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {!loading && filteredFloors.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-500">No floors found.</div>
          ) : null}
        </div>
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
              <div className="text-base font-extrabold text-slate-900">{editing ? 'Edit Floor' : 'Add Floor'}</div>
              <button type="button" onClick={closeModal} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Building
                <select
                  value={form.building_id}
                  onChange={(e) => setForm((p) => ({ ...p, building_id: e.target.value }))}
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
                  value={form.floor_id}
                  onChange={(e) => setForm((p) => ({ ...p, floor_id: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="">Select floor...</option>
                  {floorNames.map((f) => (
                    <option key={f.floor_id} value={f.floor_id}>{f.floor_name}</option>
                  ))}
                </select>
              </label>

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
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  disabled={loading}
                >
                  {loading ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
