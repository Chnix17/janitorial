import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { toast } from '../../utils/toast';
import {
  generateInspectionReport
} from '../../utils/reportExporter';

const withSlash = (base) => (base.endsWith('/') ? base : base + '/');

export default function AdminReports() {
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [inspectionData, setInspectionData] = useState({ summary: {}, inspections: [] });
  
  // Filter states
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  
  const [buildingFilter, setBuildingFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [openRowKey, setOpenRowKey] = useState('');
  const [roomFilter, setRoomFilter] = useState(''); // '' means all rooms
  
  const baseUrl = useMemo(() => {
    const storedUrl = SecureStorage.getLocalItem('janitorial_url');
    return withSlash(storedUrl || getApiBaseUrl());
  }, []);
  
  // Get current month as default
  useEffect(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${now.getFullYear()}-${mm}`);
  }, []);

  const derivedDateRange = useMemo(() => {
    if (!selectedMonth) return { from: '', to: '' };
    const [y, m] = selectedMonth.split('-').map(Number);
    if (!y || !m) return { from: '', to: '' };
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);
    return {
      from: firstDay.toISOString().split('T')[0],
      to: lastDay.toISOString().split('T')[0]
    };
  }, [selectedMonth]);
  
  // Load buildings
  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const res = await axios.post(
          `${baseUrl}admin.php`,
          { operation: 'getBuildings', json: {} },
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (res?.data?.success) {
          setBuildings(Array.isArray(res.data.data) ? res.data.data : []);
        }
      } catch (e) {
        console.error('Failed to load buildings', e);
      }
    };
    loadBuildings();
  }, [baseUrl]);
  
  // Load floors when building is selected
  useEffect(() => {
    const loadFloors = async () => {
      if (!buildingFilter) {
        setFloors([]);
        setFloorFilter('');
        return;
      }
      try {
        const res = await axios.post(
          `${baseUrl}admin.php`,
          { operation: 'getFloors', json: { building_id: Number(buildingFilter) } },
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (res?.data?.success) {
          setFloors(Array.isArray(res.data.data) ? res.data.data : []);
        }
      } catch (e) {
        console.error('Failed to load floors', e);
      }
    };
    loadFloors();
  }, [buildingFilter, baseUrl]);
  
  // Load inspection report data based on selected building + floor
  const loadReportData = useCallback(async () => {
    if (!buildingFilter || !floorFilter) {
      setInspectionData({ summary: {}, inspections: [] });
      return;
    }

    setLoading(true);
    const filters = {
      building_id: buildingFilter ? Number(buildingFilter) : '',
      floor_id: floorFilter ? Number(floorFilter) : '',
      date_from: derivedDateRange.from,
      date_to: derivedDateRange.to,
    };
    
    try {
      const res = await axios.post(
        `${baseUrl}admin-reports.php`,
        { operation: 'getInspectionSummaryReport', json: filters },
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (res?.data?.success) {
        setInspectionData(res.data.data || { summary: {}, inspections: [] });
      }
    } catch (e) {
      toast.error('Failed to load report data');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [buildingFilter, floorFilter, derivedDateRange.from, derivedDateRange.to, baseUrl]);
  
  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Reset room filter when building/floor changes
  useEffect(() => {
    setRoomFilter('');
  }, [buildingFilter, floorFilter]);
  
  const exportFilters = useMemo(() => {
    return {
      buildingName: buildings.find(b => String(b.building_id) === String(buildingFilter))?.building_name || '',
      floorName: floors.find(f => String(f.floor_id) === String(floorFilter))?.floor_name || '',
      dateFrom: derivedDateRange.from,
      dateTo: derivedDateRange.to,
    };
  }, [buildings, floors, buildingFilter, floorFilter, derivedDateRange.from, derivedDateRange.to]);

  const hasSelection = Boolean(buildingFilter && floorFilter);

  // Get unique room numbers from inspections for the filter dropdown
  const availableRooms = useMemo(() => {
    const rooms = inspectionData.inspections?.map(item => item.room_number).filter(Boolean) || [];
    return [...new Set(rooms)].sort((a, b) => String(a).localeCompare(String(b)));
  }, [inspectionData.inspections]);

  const handleDownloadPdf = () => {
    if (!hasSelection) {
      toast.error('Please select building and floor');
      return;
    }
    const sortedInspectionData = {
      ...inspectionData,
      inspections: filteredAndSortedInspections
    };
    generateInspectionReport(sortedInspectionData, exportFilters, { mode: 'download' });
    toast.success('Report exported successfully');
  };

  const handleViewPdf = () => {
    if (!hasSelection) {
      toast.error('Please select building and floor');
      return;
    }
    const sortedInspectionData = {
      ...inspectionData,
      inspections: filteredAndSortedInspections
    };
    generateInspectionReport(sortedInspectionData, exportFilters, { mode: 'open' });
  };
  
  // Filtered data based on search and room filter
  const filteredAndSortedInspections = useMemo(() => {
    let data = inspectionData.inspections || [];
    
    // Apply room filter
    if (roomFilter) {
      data = data.filter(item => item.room_number === roomFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(item =>
        item.building_name?.toLowerCase().includes(q) ||
        item.floor_name?.toLowerCase().includes(q) ||
        item.room_number?.toLowerCase().includes(q) ||
        item.inspected_by?.toLowerCase().includes(q) ||
        item.assigned_remarks?.toLowerCase().includes(q) ||
        (item.checklist || []).some((c) => c.checklist_name?.toLowerCase().includes(q))
      );
    }
    
    return data;
  }, [inspectionData.inspections, searchQuery, roomFilter]);
  
  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Building and floor inspection details</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleViewPdf}
            disabled={loading || !hasSelection}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <span>View PDF</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={loading || !hasSelection}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            <span>Download PDF</span>
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,.06)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-nowrap sm:items-center">
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:w-[200px]"
          >
            <option value="">Select Building</option>
            {buildings.map(b => (
              <option key={b.building_id} value={b.building_id}>{b.building_name}</option>
            ))}
          </select>
          
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            disabled={!buildingFilter}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60 sm:w-[200px]"
          >
            <option value="">Select Floor</option>
            {floors.map(f => (
              <option key={f.floorbuilding_id} value={f.floor_id}>{f.floor_name}</option>
            ))}
          </select>

          <div className="w-full sm:w-auto">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 sm:w-[180px]"
            />
          </div>

          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            disabled={availableRooms.length === 0}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60 sm:w-[160px]"
          >
            <option value="">All Rooms</option>
            {availableRooms.map(room => (
              <option key={room} value={room}>{room}</option>
            ))}
          </select>
          
          <div className="relative w-full sm:ml-auto sm:min-w-[200px] sm:flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>
        </div>
      </div>
      
      {/* Content based on report type */}
      {!hasSelection ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Select a building and floor to view the detailed inspection report.
        </div>
      ) : (
        <InspectionsReport
          data={inspectionData}
          filteredData={filteredAndSortedInspections}
          loading={loading}
          openRowKey={openRowKey}
          onToggleRow={(key) => setOpenRowKey((prev) => (prev === key ? '' : key))}
        />
      )}
    </div>
  );
}

// Inspections Report Component
function InspectionsReport({ data, filteredData, loading, openRowKey, onToggleRow }) {
  const checklistLabel = (c) => {
    const v = c?.operation_is_functional;
    const itemType = c?.checklist_type || 'boolean';
    const expectedQty = c?.checklist_quantity;

    // Handle different checklist types
    if (itemType === 'quantity') {
      const numVal = v !== null && v !== undefined ? Number(v) : null;
      if (numVal !== null && !isNaN(numVal)) {
        const match = numVal === Number(expectedQty);
        return {
          text: `${numVal} / ${expectedQty}`,
          cls: match
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
            : 'text-amber-700 bg-amber-50 border-amber-200'
        };
      }
      return { text: `— / ${expectedQty}`, cls: 'text-slate-600 bg-slate-50 border-slate-200' };
    }

    if (itemType === 'condition') {
      if (v !== null && v !== undefined && String(v).trim() !== '') {
        const goodOptions = ['good', 'clean', 'working', 'functional', 'ok'];
        const isGood = goodOptions.some(g => String(v).toLowerCase().includes(g));
        return {
          text: String(v).charAt(0).toUpperCase() + String(v).slice(1),
          cls: isGood
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
            : 'text-amber-700 bg-amber-50 border-amber-200'
        };
      }
      return { text: 'Pending', cls: 'text-slate-600 bg-slate-50 border-slate-200' };
    }

    // Boolean (default)
    const n = v === null || v === undefined ? null : Number(v);
    if (n === 1) return { text: 'OK', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (n === 0) return { text: 'Not OK', cls: 'text-rose-700 bg-rose-50 border-rose-200' };
    return { text: 'Pending', cls: 'text-slate-600 bg-slate-50 border-slate-200' };
  };
  
  return (
    <>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,.08)]">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-[26px_90px_90px_1fr_160px_120px] gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500">
          <div />
          <div>Room</div>
          <div>Overall Condition</div>
          <div>Remarks</div>
          <div>Inspected By</div>
          <div>Date</div>
        </div>
        
        <div>
          {loading ? (
            <div className="px-5 py-6 text-sm text-slate-500">Loading...</div>
          ) : filteredData.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-500">No inspections found.</div>
          ) : (
            filteredData.map((item, idx) => {
              const key = String(item.assigned_status_id || `${item.room_number || ''}-${item.inspected_date || ''}-${idx}`);
              const open = key === openRowKey;
              const hasChecklist = Array.isArray(item.checklist) && item.checklist.length > 0;

              return (
                <div key={key} className="border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => onToggleRow?.(key)}
                    className="grid w-full grid-cols-[26px_90px_90px_1fr_160px_120px] items-center gap-2 px-5 py-4 text-left hover:bg-slate-50"
                  >
                    <div className="text-slate-400">
                      {hasChecklist ? (open ? '▾' : '▸') : ''}
                    </div>
                    <div className="text-sm font-medium text-slate-900">{item.room_number}</div>
                    <div>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.assigned_status === 'excellent' ? 'bg-emerald-100 text-emerald-700' :
                        item.assigned_status === 'good' ? 'bg-blue-100 text-blue-700' :
                        item.assigned_status === 'fair' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {item.assigned_status || 'N/A'}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 truncate" title={item.assigned_remarks || ''}>{item.assigned_remarks || '—'}</div>
                    <div className="text-sm text-slate-600">{item.inspected_by}</div>
                    <div className="text-sm text-slate-500">{item.inspected_date}</div>
                  </button>

                  {open && hasChecklist ? (
                    <div className="bg-slate-50/60 px-5 pb-4">
                      <div className="grid grid-cols-[26px_1fr] gap-2">
                        <div />
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="text-[11px] font-semibold tracking-wide text-slate-500">CHECKLIST DETAILS</div>
                          <div className="mt-3 grid gap-2">
                            {item.checklist.map((c, j) => {
                              const { text, cls } = checklistLabel(c);
                              return (
                                <div key={c.checklist_id || j} className="flex items-center justify-between gap-4 text-sm">
                                  <div className="min-w-0 flex-1 truncate text-slate-700" title={c.checklist_name || ''}>{c.checklist_name}</div>
                                  <div className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>{text}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
      </div>
    </>
  );
}
