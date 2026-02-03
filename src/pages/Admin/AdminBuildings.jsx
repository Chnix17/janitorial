import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { toast } from '../../utils/toast';

const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

export default function AdminBuildings() {
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [buildingName, setBuildingName] = useState('');

  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRootRefById = useRef({});

  const baseUrl = useMemo(() => {
    const storedUrl = SecureStorage.getLocalItem('janitorial_url');
    return withSlash(storedUrl || getApiBaseUrl());
  }, []);

  const roomCountByBuildingId = useMemo(() => {
    const map = new Map();
    rooms.forEach((r) => {
      const id = String(r.building_id);
      map.set(id, (map.get(id) || 0) + 1);
    });
    return map;
  }, [rooms]);

  const filteredBuildings = useMemo(() => {
    const q = String(search || '').trim().toLowerCase();
    if (!q) return buildings;
    return buildings.filter((b) => String(b.building_name || '').toLowerCase().includes(q));
  }, [buildings, search]);

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
    setBuildingName('');
    setOpenModal(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setBuildingName(b?.building_name ?? '');
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(null);
    setBuildingName('');
  };

  const submit = async (e) => {
    e.preventDefault();

    const name = String(buildingName || '').trim();
    if (!name) {
      toast.error('Building name is required.');
      return;
    }

    setLoading(true);
    try {
      const operation = editing ? 'updateBuilding' : 'createBuilding';
      const json = editing ? { building_id: editing.building_id, building_name: name } : { building_name: name };

      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation, json },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        closeModal();
        toast.success(editing ? 'Building updated.' : 'Building created.');
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

  const remove = async (b) => {
    if (!window.confirm(`Delete building "${b.building_name}"?`)) return;

    setLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation: 'deleteBuilding', json: { building_id: b.building_id } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        toast.success('Building deleted.');
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
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Buildings</h1>
          <p className="mt-1 text-sm text-slate-500">Manage school buildings</p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          <span className="text-lg leading-none">+</span>
          Add Building
        </button>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="relative w-full max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search buildings..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,.08)]">
        <div className="grid grid-cols-[1fr_120px_56px] gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500">
          <div>Building</div>
          <div>Rooms</div>
          <div />
        </div>

        <div>
          {filteredBuildings.map((b) => {
            const roomsCount = roomCountByBuildingId.get(String(b.building_id)) || 0;
            return (
              <div key={b.building_id} className="grid grid-cols-[1fr_120px_56px] items-center gap-2 border-b border-slate-100 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">🏢</div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{b.building_name}</div>
                  </div>
                </div>

                <div className="text-sm text-slate-700">{roomsCount}</div>

                <div
                  className="relative flex justify-end"
                  ref={(el) => {
                    if (el) menuRootRefById.current[String(b.building_id)] = el;
                  }}
                >
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                    onClick={() => setOpenMenuId((p) => (p === b.building_id ? null : b.building_id))}
                  >
                    ...
                  </button>

                  {openMenuId === b.building_id ? (
                    <div className="absolute right-0 top-8 z-50 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          setOpenMenuId(null);
                          openEdit(b);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                        onClick={() => {
                          setOpenMenuId(null);
                          remove(b);
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

          {!loading && filteredBuildings.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-500">No buildings found.</div>
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
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-slate-900">{editing ? 'Edit Building' : 'Add Building'}</div>
              <button type="button" onClick={closeModal} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Building name
                <input
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
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
