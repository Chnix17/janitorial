import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { toast } from '../../utils/toast';

const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState('');
  const [menuFor, setMenuFor] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 5;

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
    const base = showArchived
      ? users
      : users.filter((u) => String(u.is_active) === '1' || u.is_active === 1);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((u) =>
      String(u.full_name || '').toLowerCase().includes(q) ||
      String(u.username || '').toLowerCase().includes(q)
    );
  }, [users, showArchived, query]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(visibleUsers.length / pageSize)), [visibleUsers.length]);
  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visibleUsers.slice(start, start + pageSize);
  }, [visibleUsers, page]);

  const loadAll = useCallback(async () => {
    setLoading(true);
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
        toast.error(usersRes?.data?.message || 'Failed to load users.');
      }
    } catch (e) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  const initials = (name = '') => {
    const parts = String(name).trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0] ? p[0].toUpperCase() : '').join('');
  };

  const fmtDate = (val) => {
    if (!val) return '';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  useEffect(() => {
    const onDocClick = (e) => {
      // Close any open row menu if clicking outside
      if (!e.target.closest?.('[data-row-menu]')) setMenuFor(null);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => {
    // Reset to first page when filters or dataset change
    setPage(1);
  }, [query, showArchived, users]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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

    const payload = {
      full_name: String(form.full_name || '').trim(),
      username: String(form.username || '').trim(),
      password: String(form.password || ''),
      role_id: form.role_id === '' ? '' : Number(form.role_id),
      is_active: form.is_active ? 1 : 0
    };

    if (!payload.full_name || !payload.username) {
      toast.error('Please fill in full name and username.');
      return;
    }

    if (!payload.role_id) {
      toast.error('Please select a user level.');
      return;
    }

    if (!editingUser && !payload.password) {
      toast.error('Password is required when creating a user.');
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
        toast.success(editingUser ? 'User updated.' : 'User created.');
        await loadAll();
      } else {
        toast.error(res?.data?.message || 'Save failed.');
      }
    } catch (e) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleArchive = async (user) => {
    setLoading(true);
    try {
      const currentActive = String(user.is_active) === '1' || user.is_active === 1;
      const res = await axios.post(
        `${baseUrl}admin.php`,
        { operation: 'setActive', json: { user_id: user.user_id, is_active: currentActive ? 0 : 1 } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (res?.data?.success) {
        toast.success(currentActive ? 'User deactivated.' : 'User activated.');
        await loadAll();
      } else {
        toast.error(res?.data?.message || 'Update failed.');
      }
    } catch (e) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">User Management</h1>
          <p className="mt-1 text-sm text-slate-500">Create and manage student and admin accounts</p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          <span className="text-lg leading-none">+</span>
          Add User
        </button>
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,.08)]">
          <div className="min-w-[600px]">
            <div className="grid grid-cols-[1.6fr_0.9fr_0.9fr_0.9fr_56px] gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500">
            <div>Name</div>
            <div>Role</div>
            <div>Status</div>
            <div>Created</div>
            <div />
          </div>

          <div>
            {pagedUsers.map((u, idx) => {
              const active = String(u.is_active) === '1' || u.is_active === 1;
              const roleName = roleNameById.get(String(u.role_id)) || `Role #${u.role_id}`;
              return (
                <div key={u.user_id} className="grid grid-cols-[1.6fr_0.9fr_0.9fr_0.9fr_56px] items-center gap-2 border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 font-semibold text-emerald-700">{initials(u.full_name)}</div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{u.full_name}</div>
                      <div className="text-xs text-slate-500">@{u.username}</div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-800">{roleName}</div>

                  <div>
                    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-600' : 'bg-slate-500'}`}></span>
                      {active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="text-sm text-slate-700">{fmtDate(u.created_at)}</div>

                  <div className="relative flex justify-end" data-row-menu>
                    <button
                      type="button"
                      className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuFor(menuFor === u.user_id ? null : u.user_id);
                      }}
                      disabled={loading}
                      aria-label="Row actions"
                      title="Row actions"
                    >
                      ...
                    </button>

                    {menuFor === u.user_id ? (
                      <div className="absolute right-0 top-8 z-50 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                          onClick={() => { setMenuFor(null); openEdit(u); }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                          onClick={() => { setMenuFor(null); toggleArchive(u); }}
                        >
                          {active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {visibleUsers.length === 0 ? (
              <div className="px-5 py-6 text-sm text-slate-500">No users found.</div>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-500">
            Showing {visibleUsers.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, visibleUsers.length)} of {visibleUsers.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </button>
            <div className="min-w-[60px] text-center text-sm font-semibold text-slate-700">Page {page} of {totalPages}</div>
            <button
              type="button"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {openForm ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setOpenForm(false);
              resetForm();
            }
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-slate-900">{editingUser ? 'Update User' : 'Create User'}</div>
              <button
                type="button"
                onClick={() => { setOpenForm(false); resetForm(); }}
                className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                disabled={loading}
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitForm} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Full Name
                <input
                  value={form.full_name}
                  onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Username
                <input
                  value={form.username}
                  onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                Password {editingUser ? '(leave blank to keep current)' : ''}
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  autoComplete="new-password"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-800">
                User Level
                <select
                  value={form.role_id}
                  onChange={(e) => setForm((p) => ({ ...p, role_id: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  <option value="">Select level…</option>
                  {roles.map((r) => (
                    <option key={r.role_id} value={r.role_id}>{r.role_name}</option>
                  ))}
                </select>
              </label>

              <label className="col-span-full flex items-center gap-2 text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={!!form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked ? 1 : 0 }))}
                />
                Active
              </label>

              <div className="col-span-full flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setOpenForm(false); resetForm(); }}
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
                  {loading ? 'Saving…' : (editingUser ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
    </div>
  );
}
