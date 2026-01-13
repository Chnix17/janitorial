import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';

const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [openForm, setOpenForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    full_name: '',
    username: '',
    password: '',
    role_id: '',
    is_active: 1
  });

  const baseUrl = useMemo(() => {
    const storedUrl = SecureStorage.getLocalItem('janitorial_url');
    return withSlash(storedUrl || getApiBaseUrl());
  }, []);

  const roleNameById = useMemo(() => {
    const map = new Map();
    roles.forEach((r) => map.set(String(r.role_id), r.role_name));
    return map;
  }, [roles]);

  const visibleUsers = useMemo(() => {
    if (showArchived) return users;
    return users.filter((u) => String(u.is_active) === '1' || u.is_active === 1);
  }, [users, showArchived]);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [rolesRes, usersRes] = await Promise.all([
        axios.post(`${baseUrl}admin.php`, { operation: 'getRoles', json: {} }, { headers: { 'Content-Type': 'application/json' } }),
        axios.post(`${baseUrl}admin.php`, { operation: 'getData', json: {} }, { headers: { 'Content-Type': 'application/json' } })
      ]);

      if (rolesRes?.data?.success) {
        setRoles(Array.isArray(rolesRes.data.data) ? rolesRes.data.data : []);
      } else {
        setRoles([]);
      }

      if (usersRes?.data?.success) {
        setUsers(Array.isArray(usersRes.data.data) ? usersRes.data.data : []);
      } else {
        setUsers([]);
        setError(usersRes?.data?.message || 'Failed to load users.');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const resetForm = () => {
    setEditingUser(null);
    setForm({ full_name: '', username: '', password: '', role_id: '', is_active: 1 });
  };

  const openCreate = () => {
    resetForm();
    setOpenForm(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      full_name: user.full_name ?? '',
      username: user.username ?? '',
      password: '',
      role_id: user.role_id ?? '',
      is_active: String(user.is_active) === '1' || user.is_active === 1 ? 1 : 0
    });
    setOpenForm(true);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      full_name: String(form.full_name || '').trim(),
      username: String(form.username || '').trim(),
      password: String(form.password || ''),
      role_id: form.role_id === '' ? '' : Number(form.role_id),
      is_active: form.is_active ? 1 : 0
    };

    if (!payload.full_name || !payload.username) {
      setError('Please fill in full name and username.');
      return;
    }

    if (!payload.role_id) {
      setError('Please select a user level.');
      return;
    }

    if (!editingUser && !payload.password) {
      setError('Password is required when creating a user.');
      return;
    }

    setLoading(true);
    try {
      const operation = editingUser ? 'update' : 'save';
      const json = editingUser
        ? { user_id: editingUser.user_id, ...payload, password: payload.password || '' }
        : payload;

      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation, json },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        setOpenForm(false);
        resetForm();
        await loadAll();
      } else {
        setError(res?.data?.message || 'Save failed.');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleArchive = async (user) => {
    setError('');
    setLoading(true);
    try {
      const currentActive = String(user.is_active) === '1' || user.is_active === 1;
      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation: 'setActive', json: { user_id: user.user_id, is_active: currentActive ? 0 : 1 } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        await loadAll();
      } else {
        setError(res?.data?.message || 'Update failed.');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>Users Management</h1>
          <div style={{ marginTop: 6, color: '#475569' }}>Create, update, and archive user accounts.</div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#0f172a' }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>

          <button
            type="button"
            className="cc-btn"
            style={{ background: '#0ea5e9', color: '#fff' }}
            onClick={openCreate}
            disabled={loading}
          >
            Create User
          </button>
        </div>
      </div>

      {error ? (
        <div style={{ marginTop: 12, background: '#fee2e2', border: '1px solid #fecaca', color: '#7f1d1d', padding: 10, borderRadius: 12 }}>
          {error}
        </div>
      ) : null}

      <div style={{ marginTop: 14, background: '#fff', borderRadius: 14, padding: 14, boxShadow: '0 10px 28px rgba(15,23,42,.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 800 }}>Users</div>
          <div style={{ color: '#475569' }}>{loading ? 'Loading…' : `${visibleUsers.length} record(s)`}</div>
        </div>

        <div style={{ marginTop: 10, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#475569' }}>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>ID</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>Full Name</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>Username</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>User Level</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>Created</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }} />
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => {
                const active = String(u.is_active) === '1' || u.is_active === 1;
                const roleName = roleNameById.get(String(u.role_id)) || `Role #${u.role_id}`;

                return (
                  <tr key={u.user_id}>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #f1f5f9' }}>{u.user_id}</td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>{u.full_name}</td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #f1f5f9' }}>{u.username}</td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #f1f5f9' }}>{roleName}</td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 800,
                        background: active ? '#dcfce7' : '#e2e8f0',
                        color: active ? '#14532d' : '#334155'
                      }}>
                        {active ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>{u.created_at || ''}</td>
                    <td style={{ padding: '10px 8px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="cc-btn"
                          style={{ background: '#e2e8f0', color: '#0f172a' }}
                          onClick={() => openEdit(u)}
                          disabled={loading}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="cc-btn"
                          style={{ background: active ? '#fee2e2' : '#dcfce7', color: active ? '#7f1d1d' : '#14532d' }}
                          onClick={() => toggleArchive(u)}
                          disabled={loading}
                        >
                          {active ? 'Archive' : 'Restore'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {visibleUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 14, color: '#475569' }}>
                    No users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {openForm ? (
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
              setOpenForm(false);
              resetForm();
            }
          }}
        >
          <div style={{ width: 'min(720px, 100%)', background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 20px 50px rgba(15,23,42,.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{editingUser ? 'Update User' : 'Create User'}</div>
              <button
                type="button"
                className="cc-btn"
                style={{ background: '#e2e8f0', color: '#0f172a' }}
                onClick={() => {
                  setOpenForm(false);
                  resetForm();
                }}
                disabled={loading}
              >
                Close
              </button>
            </div>

            <form onSubmit={submitForm} style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                Full Name
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  style={{ padding: 10, borderRadius: 10, border: '1px solid #cbd5e1' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                Username
                <input
                  value={form.username}
                  onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  style={{ padding: 10, borderRadius: 10, border: '1px solid #cbd5e1' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                Password {editingUser ? '(leave blank to keep current)' : ''}
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  style={{ padding: 10, borderRadius: 10, border: '1px solid #cbd5e1' }}
                  autoComplete="new-password"
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                User Level
                <select
                  value={form.role_id}
                  onChange={(e) => setForm((p) => ({ ...p, role_id: e.target.value }))}
                  style={{ padding: 10, borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  <option value="">Select level…</option>
                  {roles.map((r) => (
                    <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', gap: 10, alignItems: 'center', gridColumn: '1 / -1' }}>
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked ? 1 : 0 }))}
                />
                Active
              </label>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', gridColumn: '1 / -1' }}>
                <button
                  type="button"
                  className="cc-btn"
                  style={{ background: '#e2e8f0', color: '#0f172a' }}
                  onClick={() => {
                    setOpenForm(false);
                    resetForm();
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cc-btn"
                  style={{ background: '#0ea5e9', color: '#fff' }}
                  disabled={loading}
                >
                  {loading ? 'Saving…' : (editingUser ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
