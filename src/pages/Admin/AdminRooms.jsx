import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { toast } from '../../utils/toast';

const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

export default function AdminRooms() {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ building_id: '', floorbuilding_id: '', room_number: '', room_numbers: '' });

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

  const floorNameByFloorBuildingId = useMemo(() => {
    const map = new Map();
    floors.forEach((f) => map.set(String(f.floorbuilding_id), f.floor_name));
    return map;
  }, [floors]);

  const filteredRooms = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    const bId = String(buildingFilter || '');
    return rooms.filter((r) => {
      const matchesQuery = !q || String(r.room_number || '').toLowerCase().includes(q);
      const matchesBuilding = !bId || String(r.building_id) === bId;
      return matchesQuery && matchesBuilding;
    });
  }, [rooms, search, buildingFilter]);

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
      const [bRes, rRes] = await Promise.all([
        axios.post(`${baseUrl}admin.php`, { operation: 'getBuildings', json: {} }, { headers: { 'Content-Type': 'application/json' } }),
        axios.post(`${baseUrl}admin.php`, { operation: 'getRooms', json: {} }, { headers: { 'Content-Type': 'application/json' } })
      ]);

      if (bRes?.data?.success) {
        setBuildings(Array.isArray(bRes.data.data) ? bRes.data.data : []);
      } else {
        setBuildings([]);
        toast.error(bRes?.data?.message || 'Failed to load buildings.');
      }

      if (rRes?.data?.success) {
        setRooms(Array.isArray(rRes.data.data) ? rRes.data.data : []);
      } else {
        setRooms([]);
        toast.error(rRes?.data?.message || 'Failed to load rooms.');
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
    setForm({ building_id: '', floorbuilding_id: '', room_number: '', room_numbers: '' });
    setOpenModal(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      building_id: r?.building_id ?? '',
      floorbuilding_id: r?.floorbuilding_id ?? r?.room_building_floor_id ?? '',
      room_number: r?.room_number ?? '',
      room_numbers: ''
    });
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(null);
    setForm({ building_id: '', floorbuilding_id: '', room_number: '', room_numbers: '' });
  };

  const submit = async (e) => {
    e.preventDefault();

    const building_id = form.building_id === '' ? '' : Number(form.building_id);
    const floorbuilding_id = form.floorbuilding_id === '' ? '' : Number(form.floorbuilding_id);
    const room_number = String(form.room_number || '').trim();
    const room_numbers_raw = String(form.room_numbers || '').trim();

    if (!building_id) {
      toast.error('Please select a building.');
      return;
    }

    if (!floorbuilding_id) {
      toast.error('Please select a floor.');
      return;
    }

    if (editing) {
      if (!room_number) {
        toast.error('Room number is required.');
        return;
      }

      const existsInClient = rooms.some((r) => {
        const sameFloor = String(r.room_building_floor_id || r.floorbuilding_id) === String(floorbuilding_id);
        const sameRoom = String(r.room_number || '').trim().toLowerCase() === room_number.toLowerCase();
        const notSelf = String(r.room_id) !== String(editing.room_id);
        return sameFloor && sameRoom && notSelf;
      });

      if (existsInClient) {
        toast.error('Room number already exists for this floor.');
        return;
      }
    } else {
      const split = room_numbers_raw
        .split(/\r?\n|,/g)
        .map((s) => String(s || '').trim())
        .filter(Boolean);

      if (split.length === 0) {
        toast.error('Please enter at least one room number.');
        return;
      }

      const normalized = new Set(split.map((s) => s.toLowerCase()));
      if (normalized.size !== split.length) {
        toast.error('Please remove duplicate room numbers in the list.');
        return;
      }

      const existsAnyInClient = rooms.some((r) => {
        const sameFloor = String(r.room_building_floor_id || r.floorbuilding_id) === String(floorbuilding_id);
        if (!sameFloor) return false;
        return normalized.has(String(r.room_number || '').trim().toLowerCase());
      });

      if (existsAnyInClient) {
        toast.error('Some room numbers already exist for this floor.');
        return;
      }
    }

    setLoading(true);
    try {
      const operation = editing ? 'updateRoom' : 'createRoomsBulk';
      const json = editing
        ? { room_id: editing.room_id, room_building_floor_id: floorbuilding_id, room_number }
        : {
          room_building_floor_id: floorbuilding_id,
          room_numbers: room_numbers_raw
            .split(/\r?\n|,/g)
            .map((s) => String(s || '').trim())
            .filter(Boolean)
        };

      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation, json },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        closeModal();
        if (editing) {
          toast.success('Room updated.');
        } else {
          const inserted = Number(res?.data?.inserted || 0);
          const skipped = Array.isArray(res?.data?.skipped) ? res.data.skipped : [];
          if (skipped.length > 0) {
            toast.success(`Rooms saved. Inserted: ${inserted}. Skipped: ${skipped.length}.`);
          } else {
            toast.success(`Rooms saved. Inserted: ${inserted}.`);
          }
        }
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

  const remove = async (r) => {
    if (!window.confirm(`Delete room "${r.room_number}"?`)) return;

    setLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation: 'deleteRoom', json: { room_id: r.room_id } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        toast.success('Room deleted.');
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
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Rooms</h1>
          <p className="mt-1 text-sm text-slate-500">Manage classrooms and facilities</p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          disabled={loading || buildings.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          <span className="text-lg leading-none">+</span>
          Add Room
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rooms..."
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
        <div className="grid grid-cols-[1fr_1fr_1fr_56px] gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500">
          <div>Room</div>
          <div>Building</div>
          <div>Floor</div>
          <div />
        </div>

        <div>
          {filteredRooms.map((r) => {
            const buildingName = r.building_name || buildingNameById.get(String(r.building_id)) || '';
            const floorName = r.floor_name || floorNameByFloorBuildingId.get(String(r.floorbuilding_id || r.room_building_floor_id)) || '';
            return (
              <div key={r.room_id} className="grid grid-cols-[1fr_1fr_1fr_56px] items-center gap-2 border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">🏫</div>
                  <div className="text-sm font-semibold text-slate-900">{r.room_number}</div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-slate-400">🏢</span>
                  <span>{buildingName}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-slate-400">🏬</span>
                  <span>{floorName}</span>
                </div>

                <div
                  className="relative flex justify-end"
                  ref={(el) => {
                    if (el) menuRootRefById.current[String(r.room_id)] = el;
                  }}
                >
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                    onClick={() => setOpenMenuId((p) => (p === r.room_id ? null : r.room_id))}
                  >
                    ...
                  </button>

                  {openMenuId === r.room_id ? (
                    <div
                      className="absolute right-0 top-8 z-50 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                    >
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          setOpenMenuId(null);
                          openEdit(r);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                        onClick={() => {
                          setOpenMenuId(null);
                          remove(r);
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

          {!loading && filteredRooms.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-500">No rooms found.</div>
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
              <div className="text-base font-semibold text-slate-900">{editing ? 'Edit Room' : 'Add Room'}</div>
              <button type="button" onClick={closeModal} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Building
                <select
                  value={form.building_id}
                  onChange={(e) => setForm((p) => ({ ...p, building_id: e.target.value, floorbuilding_id: '' }))}
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
                  value={form.floorbuilding_id}
                  onChange={(e) => setForm((p) => ({ ...p, floorbuilding_id: e.target.value }))}
                  disabled={!form.building_id || floors.length === 0}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
                >
                  <option value="">{!form.building_id ? 'Select building first...' : (floors.length === 0 ? 'No floors available...' : 'Select floor...')}</option>
                  {floors.map((f) => (
                    <option key={f.floorbuilding_id} value={f.floorbuilding_id}>{f.floor_name}</option>
                  ))}
                </select>
              </label>

              {editing ? (
                <label className="grid gap-2 text-sm font-semibold text-slate-800">
                  Room number
                  <input
                    value={form.room_number}
                    onChange={(e) => setForm((p) => ({ ...p, room_number: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              ) : (
                <label className="grid gap-2 text-sm font-semibold text-slate-800">
                  Room numbers (one per line)
                  <textarea
                    value={form.room_numbers}
                    onChange={(e) => setForm((p) => ({ ...p, room_numbers: e.target.value }))}
                    rows={6}
                    placeholder={'e.g.\n101\n102\n103'}
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              )}

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
