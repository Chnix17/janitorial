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
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <h1 className="cc-page-title">Buildings & Rooms</h1>
          <div className="cc-page-subtitle">Create, update, and delete buildings and room numbers.</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="cc-btn cc-btn-ghost" onClick={openCreateBuilding} disabled={loading}>
            Add Building
          </button>
          <button type="button" className="cc-btn cc-btn-primary" onClick={openCreateRoom} disabled={loading || buildings.length === 0}>
            Add Room
          </button>
        </div>
      </div>
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 14 }}>
        <div className="cc-card cc-card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 900 }}>Buildings</div>
            <div style={{ color: 'var(--cc-muted)' }}>{loading ? 'Loading…' : `${buildings.length} record(s)`}</div>
          </div>

          <div style={{ marginTop: 10, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 380 }}>
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

        <div className="cc-card cc-card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 900 }}>Rooms</div>
            <div style={{ color: 'var(--cc-muted)' }}>{loading ? 'Loading…' : `${rooms.length} record(s)`}</div>
          </div>

          <div style={{ marginTop: 10, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
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
          <div className="cc-card" style={{ width: 'min(560px, 100%)', padding: 16, boxShadow: '0 20px 50px rgba(15,23,42,.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{editingBuilding ? 'Update Building' : 'Create Building'}</div>
              <button
                type="button"
                className="cc-btn cc-btn-ghost"
                onClick={() => {
                  setOpenBuildingForm(false);
                  setEditingBuilding(null);
                  setBuildingName('');
                }}
                disabled={loading}
              >
                Close
              </button>
            </div>

            <form onSubmit={submitBuilding} style={{ marginTop: 12, display: 'grid', gap: 12 }}>
              <label className="cc-label">
                Building name
                <input className="cc-input" value={buildingName} onChange={(e) => setBuildingName(e.target.value)} />
              </label>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="cc-btn cc-btn-ghost"
                  onClick={() => {
                    setOpenBuildingForm(false);
                    setEditingBuilding(null);
                    setBuildingName('');
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className="cc-btn cc-btn-primary" disabled={loading}>
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
          <div className="cc-card" style={{ width: 'min(720px, 100%)', padding: 16, boxShadow: '0 20px 50px rgba(15,23,42,.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{editingRoom ? 'Update Room' : 'Create Room'}</div>
              <button
                type="button"
                className="cc-btn cc-btn-ghost"
                onClick={() => {
                  setOpenRoomForm(false);
                  setEditingRoom(null);
                  setRoomForm({ building_id: '', room_number: '' });
                }}
                disabled={loading}
              >
                Close
              </button>
            </div>

            <form onSubmit={submitRoom} style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="cc-label" style={{ gridColumn: '1 / -1' }}>
                Building
                <select
                  className="cc-input"
                  value={roomForm.building_id}
                  onChange={(e) => setRoomForm((p) => ({ ...p, building_id: e.target.value }))}
                >
                  <option value="">Select building…</option>
                  {buildings.map((b) => (
                    <option key={b.building_id} value={b.building_id}>{b.building_name}</option>
                  ))}
                </select>
              </label>

              <label className="cc-label" style={{ gridColumn: '1 / -1' }}>
                Room number
                <input
                  className="cc-input"
                  value={roomForm.room_number}
                  onChange={(e) => setRoomForm((p) => ({ ...p, room_number: e.target.value }))}
                />
              </label>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', gridColumn: '1 / -1' }}>
                <button
                  type="button"
                  className="cc-btn cc-btn-ghost"
                  onClick={() => {
                    setOpenRoomForm(false);
                    setEditingRoom(null);
                    setRoomForm({ building_id: '', room_number: '' });
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button type="submit" className="cc-btn cc-btn-primary" disabled={loading}>
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
