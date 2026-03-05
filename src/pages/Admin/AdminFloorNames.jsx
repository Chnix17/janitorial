import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import axios from 'axios';

import { SecureStorage } from '../../utils/encryption';

import { getApiBaseUrl } from '../../utils/apiConfig';



const withSlash = (base) => (base.endsWith('/') ? base : base + '/');


export default function AdminFloorNames() {

  const [floorNames, setFloorNames] = useState([]);

  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');



  const [openModal, setOpenModal] = useState(false);

  const [editing, setEditing] = useState(null);

  const [floorName, setFloorName] = useState('');

  const [page, setPage] = useState(0);
  const ITEMS_PER_PAGE = 10;

  const baseUrl = useMemo(() => {

    const storedUrl = SecureStorage.getLocalItem('janitorial_url');

    return withSlash(storedUrl || getApiBaseUrl());

  }, []);



  const filtered = useMemo(() => {

    const q = String(search || '').trim().toLowerCase();

    if (!q) return floorNames;

    return floorNames.filter((f) => String(f.floor_name || '').toLowerCase().includes(q));

  }, [floorNames, search]);



  const paginated = useMemo(() => {
    return filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  }, [filtered, page]);



  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;



  const loadAll = useCallback(async () => {

    setLoading(true);

    setError('');

    try {

      const res = await axios.post(`${baseUrl}admin.php`, { operation: 'getFloorNames', json: {} }, { headers: { 'Content-Type': 'application/json' } });

      if (res?.data?.success) {

        setFloorNames(Array.isArray(res.data.data) ? res.data.data : []);

      } else {

        setFloorNames([]);

        setError(res?.data?.message || 'Failed to load floor names.');

      }

    } catch (e) {

      setError('Network error. Please try again.');

    } finally {

      setLoading(false);

    }

  }, [baseUrl]);



  useEffect(() => {

    loadAll();

  }, [loadAll]);



  useEffect(() => {

    setPage(0);

  }, [search]);



  const openCreate = () => {

    setEditing(null);

    setFloorName('');

    setOpenModal(true);

  };



  const openEdit = (f) => {

    setEditing(f);

    setFloorName(f?.floor_name ?? '');

    setOpenModal(true);

  };



  const closeModal = () => {

    setOpenModal(false);

    setEditing(null);

    setFloorName('');

  };



  const submit = async (e) => {

    e.preventDefault();

    setError('');



    const name = String(floorName || '').trim();

    if (!name) {

      setError('Floor name is required.');

      return;

    }



    setLoading(true);

    try {

      const operation = editing ? 'updateFloorName' : 'createFloorName';

      const json = editing ? { floor_id: editing.floor_id, floor_name: name } : { floor_name: name };



      const res = await axios.post(

        `${baseUrl}admin.php`,

        { operation, json },

        { headers: { 'Content-Type': 'application/json' } }

      );



      if (res?.data?.success) {

        closeModal();

        await loadAll();

      } else {

        setError(res?.data?.message || 'Save failed.');

      }

    } catch (e2) {

      setError('Network error. Please try again.');

    } finally {

      setLoading(false);

    }

  };



  const remove = async (f) => {

    setError('');

    if (!window.confirm(`Delete floor name "${f.floor_name}"?`)) return;



    setLoading(true);

    try {

      const res = await axios.post(

        `${baseUrl}admin.php`,

        { operation: 'deleteFloorName', json: { floor_id: f.floor_id } },

        { headers: { 'Content-Type': 'application/json' } }

      );



      if (res?.data?.success) {

        await loadAll();

      } else {

        setError(res?.data?.message || 'Delete failed.');

      }

    } catch (e) {

      setError('Network error. Please try again.');

    } finally {

      setLoading(false);

    }

  };



  return (

    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Floor Names</h1>
          <p className="mt-1 text-sm text-slate-500">Create and manage available floor names</p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          <span className="text-lg leading-none">+</span>
          Add Floor Name
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search floor names..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>
      </div>



      {error ? (

        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>

      ) : null}



      <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,.08)]">
        <div className="min-w-[300px]">
          <div className="grid grid-cols-[1fr_56px] gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500">
            <div>Floor Name</div>
            <div />
          </div>



        <div>

          {paginated.map((f) => (

            <div key={f.floor_id} className="grid grid-cols-[1fr_56px] items-center gap-2 border-b border-slate-100 px-5 py-4">

              <div className="text-sm font-semibold text-slate-900">{f.floor_name}</div>



              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
                  onClick={() => openEdit(f)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1 text-sm text-rose-600 hover:bg-rose-50"
                  onClick={() => remove(f)}
                >
                  Delete
                </button>
              </div>

            </div>

          ))}



          {!loading && paginated.length === 0 ? (

            <div className="px-5 py-6 text-sm text-slate-500">No floor names found.</div>

          ) : null}

        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
            <div className="text-sm text-slate-500">
              Page {page + 1} of {totalPages}
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
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

              <div className="text-base font-extrabold text-slate-900">{editing ? 'Edit Floor Name' : 'Add Floor Name'}</div>

              <button type="button" onClick={closeModal} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">

                ✕

              </button>

            </div>



            <form onSubmit={submit} className="mt-4 grid gap-4">

              <label className="grid gap-2 text-sm font-semibold text-slate-800">

                Floor name

                <input

                  value={floorName}

                  onChange={(e) => setFloorName(e.target.value)}

                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"

                />

              </label>



              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
    </div>
  );

}

