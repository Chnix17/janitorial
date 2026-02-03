import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { toast } from '../../utils/toast';

const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

export default function AdminRoomChecklists() {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [building_id, setBuildingId] = useState('');
  const [floorbuilding_id, setFloorBuildingId] = useState('');
  const [room_id, setRoomId] = useState('');

  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(false);

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ checklist_name: '', checklist_names: '' });

  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRootRefById = useRef({});

  const baseUrl = useMemo(() => {
    const storedUrl = SecureStorage.getLocalItem('janitorial_url');
    return withSlash(storedUrl || getApiBaseUrl());
  }, []);

  const floorNameByFloorBuildingId = useMemo(() => {
    const map = new Map();
    floors.forEach((f) => map.set(String(f.floorbuilding_id), f.floor_name));
    return map;
  }, [floors]);

  const loadBuildings = useCallback(async () => {
    const res = await axios.post(
      `${baseUrl}admin.php`,
      { operation: 'getBuildings', json: {} },
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (res?.data?.success) {
      setBuildings(Array.isArray(res.data.data) ? res.data.data : []);
    } else {
      setBuildings([]);
      toast.error(res?.data?.message || 'Failed to load buildings.');
    }
  }, [baseUrl]);

  const loadFloorsByBuilding = useCallback(async (bId) => {
    const id = bId === '' ? '' : Number(bId);
    if (!id) {
      setFloors([]);
      return;
    }

    const res = await axios.post(
      `${baseUrl}admin.php`,
      { operation: 'getFloors', json: { building_id: id } },
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (res?.data?.success) {
      setFloors(Array.isArray(res.data.data) ? res.data.data : []);
    } else {
      setFloors([]);
      toast.error(res?.data?.message || 'Failed to load floors.');
    }
  }, [baseUrl]);

  const loadRoomsByFloorBuilding = useCallback(async (fbId) => {
    const id = fbId === '' ? '' : Number(fbId);
    if (!id) {
      setRooms([]);
      return;
    }

    const res = await axios.post(
      `${baseUrl}admin.php`,
      { operation: 'getRooms', json: { floorbuilding_id: id } },
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (res?.data?.success) {
      setRooms(Array.isArray(res.data.data) ? res.data.data : []);
    } else {
      setRooms([]);
      toast.error(res?.data?.message || 'Failed to load rooms.');
    }
  }, [baseUrl]);

  const loadChecklists = useCallback(async (rId) => {
    const id = rId === '' ? '' : Number(rId);
    if (!id) {
      setChecklists([]);
      return;
    }

    const res = await axios.post(
      `${baseUrl}admin.php`,
      { operation: 'getRoomChecklists', json: { room_id: id } },
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (res?.data?.success) {
      setChecklists(Array.isArray(res.data.data) ? res.data.data : []);
    } else {
      setChecklists([]);
      toast.error(res?.data?.message || 'Failed to load checklist.');
    }
  }, [baseUrl]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      await loadBuildings();
    } catch (e) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [loadBuildings]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    setFloorBuildingId('');
    setRoomId('');
    setFloors([]);
    setRooms([]);
    setChecklists([]);

    if (!building_id) return;

    (async () => {
      try {
        await loadFloorsByBuilding(building_id);
      } catch {
        setFloors([]);
      }
    })();
  }, [building_id, loadFloorsByBuilding]);

  useEffect(() => {
    setRoomId('');
    setRooms([]);
    setChecklists([]);

    if (!floorbuilding_id) return;

    (async () => {
      try {
        await loadRoomsByFloorBuilding(floorbuilding_id);
      } catch {
        setRooms([]);
      }
    })();
  }, [floorbuilding_id, loadRoomsByFloorBuilding]);

  useEffect(() => {
    setChecklists([]);

    if (!room_id) return;

    (async () => {
      try {
        await loadChecklists(room_id);
      } catch {
        setChecklists([]);
      }
    })();
  }, [room_id, loadChecklists]);

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
    if (!building_id) {
      toast.error('Please select a building first.');
      return;
    }
    if (!floorbuilding_id) {
      toast.error('Please select a floor first.');
      return;
    }
    if (!room_id) {
      toast.error('Please select a room first.');
      return;
    }

    setEditing(null);
    setForm({ checklist_name: '', checklist_names: '' });
    setOpenModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ checklist_name: c?.checklist_name ?? '', checklist_names: '' });
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(null);
    setForm({ checklist_name: '', checklist_names: '' });
  };

  const submit = async (e) => {
    e.preventDefault();

    const rId = room_id === '' ? '' : Number(room_id);
    if (!rId) {
      toast.error('Please select a room.');
      return;
    }

    setLoading(true);
    try {
      if (editing) {
        const name = String(form.checklist_name || '').trim();
        if (!name) {
          toast.error('Checklist name is required.');
          return;
        }

        const existsInClient = checklists.some((x) => (
          String(x.checklist_name || '').trim().toLowerCase() === name.toLowerCase()
          && String(x.checklist_id) !== String(editing.checklist_id)
        ));

        if (existsInClient) {
          toast.error('Checklist already exists for this room.');
          return;
        }

        const res = await axios.post(
          `${baseUrl}admin.php`,
          { operation: 'updateChecklist', json: { checklist_id: editing.checklist_id, checklist_name: name } },
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (res?.data?.success) {
          toast.success('Checklist updated.');
          closeModal();
          await loadChecklists(rId);
        } else {
          toast.error(res?.data?.message || 'Save failed.');
        }
        return;
      }

      const raw = String(form.checklist_names || '').trim();
      const split = raw
        .split(/\r?\n|,/g)
        .map((s) => String(s || '').trim())
        .filter(Boolean);

      if (split.length === 0) {
        toast.error('Please enter at least one checklist item.');
        return;
      }

      const normalized = new Set(split.map((s) => s.toLowerCase()));
      if (normalized.size !== split.length) {
        toast.error('Please remove duplicate checklist items in the list.');
        return;
      }

      const existsAnyInClient = checklists.some((x) => normalized.has(String(x.checklist_name || '').trim().toLowerCase()));
      if (existsAnyInClient) {
        toast.error('Some checklist items already exist for this room.');
        return;
      }

      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation: 'createChecklistBulk', json: { checklist_room_id: rId, checklist_names: split } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        toast.success('Checklist items created.');
        closeModal();
        await loadChecklists(rId);
      } else {
        toast.error(res?.data?.message || 'Save failed.');
      }
    } catch (e2) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete checklist "${c.checklist_name}"?`)) return;

    setLoading(true);
    try {
      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation: 'deleteChecklist', json: { checklist_id: c.checklist_id } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        toast.success('Checklist deleted.');
        await loadChecklists(Number(room_id));
      } else {
        toast.error(res?.data?.message || 'Delete failed.');
      }
    } catch (e) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedFloorName = floorbuilding_id ? (floorNameByFloorBuildingId.get(String(floorbuilding_id)) || '') : '';

  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Room Checklists</h1>
          <p className="mt-1 text-sm text-slate-500">Create, update, delete, and bulk add checklist items per room.</p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          <span className="text-lg leading-none">+</span>
          Add Checklist
        </button>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="grid gap-2 text-sm font-semibold text-slate-800">
            Building
            <select
              value={building_id}
              onChange={(e) => setBuildingId(e.target.value)}
              disabled={loading}
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
              value={floorbuilding_id}
              onChange={(e) => setFloorBuildingId(e.target.value)}
              disabled={loading || !building_id}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
            >
              <option value="">Select floor...</option>
              {floors.map((f) => (
                <option key={f.floorbuilding_id} value={f.floorbuilding_id}>{f.floor_name}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-slate-800">
            Room
            <select
              value={room_id}
              onChange={(e) => setRoomId(e.target.value)}
              disabled={loading || !floorbuilding_id}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
            >
              <option value="">Select room...</option>
              {rooms.map((r) => (
                <option key={r.room_id} value={r.room_id}>{r.room_number}</option>
              ))}
            </select>
          </label>
        </div>

        {selectedFloorName ? (
          <div className="mt-3 text-sm text-slate-500">Selected floor: {selectedFloorName}</div>
        ) : null}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,.08)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div className="text-sm font-semibold text-slate-700">Checklist Items</div>
          <div className="text-xs font-semibold text-slate-500">{room_id ? `${checklists.length} item(s)` : 'Select a room to view.'}</div>
        </div>

        <div>
          {!room_id ? (
            <div className="px-5 py-6 text-sm text-slate-500">No room selected.</div>
          ) : loading ? (
            <div className="px-5 py-6 text-sm text-slate-500">Loading...</div>
          ) : checklists.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-500">No checklist items for this room.</div>
          ) : (
            checklists.map((c) => (
              <div key={c.checklist_id} className="grid grid-cols-[1fr_56px] items-center gap-2 border-b border-slate-100 px-5 py-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{c.checklist_name}</div>
                
                </div>

                <div
                  className="relative flex justify-end"
                  ref={(el) => {
                    if (el) menuRootRefById.current[String(c.checklist_id)] = el;
                  }}
                >
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                    onClick={() => setOpenMenuId((p) => (p === c.checklist_id ? null : c.checklist_id))}
                  >
                    ...
                  </button>

                  {openMenuId === c.checklist_id ? (
                    <div className="absolute right-0 top-8 z-50 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          setOpenMenuId(null);
                          openEdit(c);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                        onClick={() => {
                          setOpenMenuId(null);
                          remove(c);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
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
              <div className="text-base font-semibold text-slate-900">{editing ? 'Edit Checklist' : 'Add Checklist (Bulk)'}</div>
              <button type="button" onClick={closeModal} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="mt-4 grid gap-4">
              {editing ? (
                <label className="grid gap-2 text-sm font-semibold text-slate-800">
                  Checklist name
                  <input
                    value={form.checklist_name}
                    onChange={(e) => setForm((p) => ({ ...p, checklist_name: e.target.value }))}
                    placeholder="e.g. Lights"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    disabled={loading}
                  />
                </label>
              ) : (
                <label className="grid gap-2 text-sm font-semibold text-slate-800">
                  Checklist items (bulk)
                  <textarea
                    value={form.checklist_names}
                    onChange={(e) => setForm((p) => ({ ...p, checklist_names: e.target.value }))}
                    placeholder={`Example:\nLights\nWindows\nFloor\nTrash bin`}
                    className="min-h-[160px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    disabled={loading}
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
                  {loading ? 'Saving…' : (editing ? 'Save' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
