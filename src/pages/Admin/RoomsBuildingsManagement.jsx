import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { toast } from '../../utils/toast';

const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

export default function RoomsBuildingsManagement() {
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  const [openBuildingForm, setOpenBuildingForm] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [buildingName, setBuildingName] = useState('');

  const [openRoomForm, setOpenRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm, setRoomForm] = useState({ building_id: '', room_number: '' });

  const baseUrl = useMemo(() => {
    const storedUrl = SecureStorage.getLocalItem('janitorial_url');
    return withSlash(storedUrl || getApiBaseUrl());
  }, []);

  const buildingNameById = useMemo(() => {
    const map = new Map();
    buildings.forEach((b) => map.set(String(b.building_id), b.building_name));
    return map;
  }, [buildings]);

  const loadAll = async () => {
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
  };

  useEffect(() => {
    loadAll();
  }, []);

  const openCreateBuilding = () => {
    setEditingBuilding(null);
    setBuildingName('');
    setOpenBuildingForm(true);
  };

  const openEditBuilding = (b) => {
    setEditingBuilding(b);
    setBuildingName(b?.building_name ?? '');
    setOpenBuildingForm(true);
  };

  const submitBuilding = async (e) => {
    e.preventDefault();

    const name = String(buildingName || '').trim();
    if (!name) {
      toast.error('Building name is required.');
      return;
    }

    setLoading(true);
    try {
      const operation = editingBuilding ? 'updateBuilding' : 'createBuilding';
      const json = editingBuilding
        ? { building_id: editingBuilding.building_id, building_name: name }
        : { building_name: name };

      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation, json },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        setOpenBuildingForm(false);
        setEditingBuilding(null);
        setBuildingName('');
        toast.success(editingBuilding ? 'Building updated.' : 'Building created.');
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

  const deleteBuilding = async (b) => {
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

  const openCreateRoom = () => {
    setEditingRoom(null);
    setRoomForm({ building_id: '', room_number: '' });
    setOpenRoomForm(true);
  };

  const openEditRoom = (r) => {
    setEditingRoom(r);
    setRoomForm({
      building_id: r?.building_id ?? '',
      room_number: r?.room_number ?? ''
    });
    setOpenRoomForm(true);
  };

  const submitRoom = async (e) => {
    e.preventDefault();

    const building_id = roomForm.building_id === '' ? '' : Number(roomForm.building_id);
    const room_number = String(roomForm.room_number || '').trim();

    if (!building_id) {
      toast.error('Please select a building.');
      return;
    }

    if (!room_number) {
      toast.error('Room number is required.');
      return;
    }

    const existsInClient = rooms.some((r) => {
      const sameBuilding = String(r.building_id) === String(building_id);
      const sameRoom = String(r.room_number || '').trim().toLowerCase() === room_number.toLowerCase();
      const notSelf = editingRoom ? String(r.room_id) !== String(editingRoom.room_id) : true;
      return sameBuilding && sameRoom && notSelf;
    });

    if (existsInClient) {
      toast.error('Room number already exists for this building.');
      return;
    }

    setLoading(true);
    try {
      const operation = editingRoom ? 'updateRoom' : 'createRoom';
      const json = editingRoom
        ? { room_id: editingRoom.room_id, building_id, room_number }
        : { building_id, room_number };

      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation, json },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        setOpenRoomForm(false);
        setEditingRoom(null);
        setRoomForm({ building_id: '', room_number: '' });
        toast.success(editingRoom ? 'Room updated.' : 'Room created.');
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

  const deleteRoom = async (r) => {
    const bName = r?.building_name || buildingNameById.get(String(r.building_id)) || '';
    if (!window.confirm(`Delete room "${r.room_number}"${bName ? ` in ${bName}` : ''}?`)) return;

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
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">Buildings & Rooms</h1>
          <p className="mt-1 text-sm text-slate-500">Create, update, and delete buildings and room numbers.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={openCreateBuilding} disabled={loading}>
            Add Building
          </button>
          <button type="button" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" onClick={openCreateRoom} disabled={loading || buildings.length === 0}>
            Add Room
          </button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-semibold text-slate-900">Buildings</div>
            <div className="text-sm text-slate-500">{loading ? 'Loading…' : `${buildings.length} record(s)`}</div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 380 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--cc-muted)' }}>
                  <th style={{ padding: '10px 8px', borderBottom: '1px solid rgba(15,23,42,0.10)' }}>ID</th>
                  <th style={{ padding: '10px 8px', borderBottom: '1px solid rgba(15,23,42,0.10)' }}>Building</th>
                  <th style={{ padding: '10px 8px', borderBottom: '1px solid rgba(15,23,42,0.10)' }} />
                </tr>
              </thead>
              <tbody>
                {buildings.map((b) => (
                  <tr key={b.building_id}>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>{b.building_id}</td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid rgba(15,23,42,0.06)', fontWeight: 800 }}>{b.building_name}</td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button type="button" className="cc-btn cc-btn-ghost" onClick={() => openEditBuilding(b)} disabled={loading}>
                          Edit
                        </button>
                        <button type="button" className="cc-btn" style={{ background: '#fee2e2', color: '#7f1d1d' }} onClick={() => deleteBuilding(b)} disabled={loading}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {buildings.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: 14, color: 'var(--cc-muted)' }}>
                      No buildings found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="font-semibold text-slate-900">Rooms</div>
            <div className="text-sm text-slate-500">{loading ? 'Loading…' : `${rooms.length} record(s)`}</div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 520 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--cc-muted)' }}>
                  <th style={{ padding: '10px 8px', borderBottom: '1px solid rgba(15,23,42,0.10)' }}>ID</th>
                  <th style={{ padding: '10px 8px', borderBottom: '1px solid rgba(15,23,42,0.10)' }}>Building</th>
                  <th style={{ padding: '10px 8px', borderBottom: '1px solid rgba(15,23,42,0.10)' }}>Room #</th>
                  <th style={{ padding: '10px 8px', borderBottom: '1px solid rgba(15,23,42,0.10)' }} />
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.room_id}>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>{r.room_id}</td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>{r.building_name || buildingNameById.get(String(r.building_id)) || ''}</td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid rgba(15,23,42,0.06)', fontWeight: 800 }}>{r.room_number}</td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button type="button" className="cc-btn cc-btn-ghost" onClick={() => openEditRoom(r)} disabled={loading}>
                          Edit
                        </button>
                        <button type="button" className="cc-btn" style={{ background: '#fee2e2', color: '#7f1d1d' }} onClick={() => deleteRoom(r)} disabled={loading}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {rooms.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 14, color: 'var(--cc-muted)' }}>
                      No rooms found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {openBuildingForm ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2,6,23,.55)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            zIndex: 50
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setOpenBuildingForm(false);
              setEditingBuilding(null);
              setBuildingName('');
            }
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-slate-900">{editingBuilding ? 'Update Building' : 'Create Building'}</div>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                onClick={() => {
                  setOpenBuildingForm(false);
                  setEditingBuilding(null);
                  setBuildingName('');
                }}
                disabled={loading}
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitBuilding} className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Building name
                <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" value={buildingName} onChange={(e) => setBuildingName(e.target.value)} />
              </label>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setOpenBuildingForm(false);
                    setEditingBuilding(null);
                    setBuildingName('');
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" disabled={loading}>
                  {loading ? 'Saving…' : (editingBuilding ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {openRoomForm ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2,6,23,.55)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
            zIndex: 50
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setOpenRoomForm(false);
              setEditingRoom(null);
              setRoomForm({ building_id: '', room_number: '' });
            }
          }}
        >
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-slate-900">{editingRoom ? 'Update Room' : 'Create Room'}</div>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                onClick={() => {
                  setOpenRoomForm(false);
                  setEditingRoom(null);
                  setRoomForm({ building_id: '', room_number: '' });
                }}
                disabled={loading}
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitRoom} className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Building
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  value={roomForm.building_id}
                  onChange={(e) => setRoomForm((p) => ({ ...p, building_id: e.target.value }))}
                >
                  <option value="">Select building…</option>
                  {buildings.map((b) => (
                    <option key={b.building_id} value={b.building_id}>{b.building_name}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Room number
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  value={roomForm.room_number}
                  onChange={(e) => setRoomForm((p) => ({ ...p, room_number: e.target.value }))}
                />
              </label>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setOpenRoomForm(false);
                    setEditingRoom(null);
                    setRoomForm({ building_id: '', room_number: '' });
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" disabled={loading}>
                  {loading ? 'Saving…' : (editingRoom ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
