import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { SecureStorage } from '../../utils/encryption';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { toast } from '../../utils/toast';
import * as XLSX from 'xlsx';
import {
  generateInspectionReport
} from '../../utils/reportExporter';

// Helper function to format checklist labels - moved outside components for shared access
const checklistLabel = (c) => {
  const itemType = c?.checklist_type || 'boolean';
  const expectedQty = c?.checklist_quantity;

  // Handle different checklist types
  if (itemType === 'quantity') {
    const numVal = c?.operation_quantity !== null && c?.operation_quantity !== undefined
      ? Number(c.operation_quantity)
      : null;
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
    const conditionVal = c?.operation_condition;
    if (conditionVal !== null && conditionVal !== undefined && String(conditionVal).trim() !== '') {
      const goodOptions = ['good', 'clean', 'working', 'functional', 'ok'];
      const isGood = goodOptions.some(g => String(conditionVal).toLowerCase().includes(g));
      return {
        text: String(conditionVal).charAt(0).toUpperCase() + String(conditionVal).slice(1),
        cls: isGood
          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
          : 'text-amber-700 bg-amber-50 border-amber-200'
      };
    }
    return { text: 'Pending', cls: 'text-slate-600 bg-slate-50 border-slate-200' };
  }

  // Boolean (default)
  const v = c?.operation_is_functional;
  const n = v === null || v === undefined ? null : Number(v);
  if (n === 1) return { text: 'OK', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (n === 0) return { text: 'Not OK', cls: 'text-rose-700 bg-rose-50 border-rose-200' };
  return { text: 'Pending', cls: 'text-slate-600 bg-slate-50 border-slate-200' };
};

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
    // Use local date formatting to avoid UTC conversion issues
    const formatLocalDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    return {
      from: formatLocalDate(firstDay),
      to: formatLocalDate(lastDay)
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

  const handleDownloadExcel = () => {
    if (!hasSelection) {
      toast.error('Please select building and floor');
      return;
    }
    
    try {
      // Create worksheet data array
      const wsData = [];
      
      // Add title
      wsData.push(['INSPECTION CHECKLIST REPORT']);
      wsData.push([]);
      
      // Add report metadata
      wsData.push(['Building:', exportFilters.buildingName, '', 'Floor:', exportFilters.floorName]);
      wsData.push(['Report Period:', `${exportFilters.dateFrom} to ${exportFilters.dateTo}`, '', 'Generated:', new Date().toLocaleDateString()]);
      wsData.push([]);
      
      // Add headers - clean format with all essential info
      const headers = [
        'Room Number',
        'Checklist Item',
        'Type',
        'Status/Value',
        'Expected',
        'Inspected By',
        'Inspection Date',
        'Overall Condition',
        'Remarks'
      ];
      wsData.push(headers);
      
      // Add data rows - group by inspection (unique per day/operation) with checklist items aggregated
      filteredAndSortedInspections.forEach((insp) => {
        const checklist = Array.isArray(insp.checklist) ? insp.checklist : [];
        
        if (checklist.length === 0) {
          // Inspection with no checklist items - still show it
          wsData.push([
            insp.room_number || '',
            'No checklist items',
            '',
            '',
            '',
            insp.inspected_by || '',
            insp.inspected_date || '',
            insp.assigned_status || '',
            insp.assigned_remarks || ''
          ]);
        } else {
          // Add checklist items first, without overall condition and remarks
          checklist.forEach((c, index) => {
            const { text } = checklistLabel(c);
            wsData.push([
              insp.room_number || '',
              c.checklist_name || '',
              c.checklist_type || '',
              text || '',
              c?.checklist_quantity || '',
              insp.inspected_by || '',
              insp.inspected_date || '',
              // Only show overall condition and remarks on the first checklist item
              index === 0 ? (insp.assigned_status || '') : '',
              index === 0 ? (insp.assigned_remarks || '') : ''
            ]);
          });
        }
      });
      
      // Add summary section
      wsData.push([]);
      wsData.push(['SUMMARY']);
      wsData.push(['Total Inspections:', filteredAndSortedInspections.length]);
      
      // Calculate statistics for summary
      let totalChecklistItems = 0;
      let completedItems = 0;
      filteredAndSortedInspections.forEach(insp => {
        const checklist = Array.isArray(insp.checklist) ? insp.checklist : [];
        totalChecklistItems += checklist.length;
        checklist.forEach(c => {
          const itemType = c?.checklist_type || 'boolean';
          if (itemType === 'quantity' && c?.operation_quantity !== null && c?.operation_quantity !== undefined) completedItems++;
          else if (itemType === 'condition' && c?.operation_condition !== null && c?.operation_condition !== undefined && String(c?.operation_condition).trim() !== '') completedItems++;
          else if (itemType === 'boolean' && c?.operation_is_functional !== null && c?.operation_is_functional !== undefined) completedItems++;
        });
      });
      wsData.push(['Total Checklist Items:', totalChecklistItems]);
      wsData.push(['Completed Items:', completedItems]);
      if (totalChecklistItems > 0) {
        wsData.push(['Completion Rate:', `${Math.round((completedItems / totalChecklistItems) * 100)}%`]);
      }

      // Create worksheet from data array
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths for better readability
      const colWidths = [
        { wch: 15 }, // Room Number
        { wch: 35 }, // Checklist Item
        { wch: 12 }, // Type
        { wch: 15 }, // Status/Value
        { wch: 10 }, // Expected
        { wch: 20 }, // Inspected By
        { wch: 18 }, // Inspection Date
        { wch: 18 }, // Overall Condition
        { wch: 30 }, // Remarks
      ];
      ws['!cols'] = colWidths;

      // Create summary worksheet data
      const summaryWsData = [];
      
      // Add title for summary
      summaryWsData.push(['INSPECTION SUMMARY REPORT']);
      summaryWsData.push([]);
      
      // Add report metadata
      summaryWsData.push(['Building:', exportFilters.buildingName, '', 'Floor:', exportFilters.floorName]);
      summaryWsData.push(['Report Period:', `${exportFilters.dateFrom} to ${exportFilters.dateTo}`, '', 'Generated:', new Date().toLocaleDateString()]);
      summaryWsData.push([]);
      
      // Add summary headers
      const summaryHeaders = [
        'Room Number',
        'Inspected By',
        'Inspection Date',
        'Overall Condition',
        'Remarks'
      ];
      summaryWsData.push(summaryHeaders);
      
      // Add summary rows - one row per inspection
      filteredAndSortedInspections.forEach((insp) => {
        summaryWsData.push([
          insp.room_number || '',
          insp.inspected_by || '',
          insp.inspected_date || '',
          insp.assigned_status || '',
          insp.assigned_remarks || ''
        ]);
      });
      
      // Create summary worksheet
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryWsData);
      
      // Set column widths for summary worksheet
      const summaryColWidths = [
        { wch: 15 }, // Room Number
        { wch: 20 }, // Inspected By
        { wch: 18 }, // Inspection Date
        { wch: 18 }, // Overall Condition
        { wch: 50 }, // Remarks
      ];
      summaryWs['!cols'] = summaryColWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Checklist Details');
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Inspection Summary');
      
      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { type: 'buffer' });
      
      // Create blob and download
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inspection-report-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Excel report exported successfully');
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Failed to generate Excel report');
    }
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
          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={loading || !hasSelection}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
          >
            <span>Download Excel</span>
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
  // Calculate statistics
  const stats = useMemo(() => {
    const inspections = filteredData || [];
    const totalInspections = inspections.length;
    
    // Overall condition counts
    const conditionCounts = {
      excellent: inspections.filter(i => i.assigned_status === 'excellent').length,
      good: inspections.filter(i => i.assigned_status === 'good').length,
      fair: inspections.filter(i => i.assigned_status === 'fair').length,
      poor: inspections.filter(i => i.assigned_status === 'poor').length,
    };
    
    // Checklist item statistics
    let totalChecklistItems = 0;
    let completedChecklistItems = 0;
    let quantityItems = 0;
    let conditionItems = 0;
    let booleanItems = 0;
    let matchingQuantity = 0;
    let goodCondition = 0;
    let okBoolean = 0;
    
    inspections.forEach(insp => {
      const checklist = Array.isArray(insp.checklist) ? insp.checklist : [];
      totalChecklistItems += checklist.length;
      
      checklist.forEach(c => {
        const itemType = c?.checklist_type || 'boolean';
        
        if (itemType === 'quantity') {
          quantityItems++;
          const numVal = c?.operation_quantity !== null && c?.operation_quantity !== undefined
            ? Number(c.operation_quantity)
            : null;
          if (numVal !== null && !isNaN(numVal)) {
            completedChecklistItems++;
            if (numVal === Number(c?.checklist_quantity)) {
              matchingQuantity++;
            }
          }
        } else if (itemType === 'condition') {
          conditionItems++;
          const conditionVal = c?.operation_condition;
          if (conditionVal !== null && conditionVal !== undefined && String(conditionVal).trim() !== '') {
            completedChecklistItems++;
            const goodOptions = ['good', 'clean', 'working', 'functional', 'ok'];
            if (goodOptions.some(g => String(conditionVal).toLowerCase().includes(g))) {
              goodCondition++;
            }
          }
        } else {
          booleanItems++;
          const v = c?.operation_is_functional;
          if (v !== null && v !== undefined) {
            completedChecklistItems++;
            if (Number(v) === 1) {
              okBoolean++;
            }
          }
        }
      });
    });
    
    return {
      totalInspections,
      conditionCounts,
      totalChecklistItems,
      completedChecklistItems,
      completionRate: totalChecklistItems > 0 ? Math.round((completedChecklistItems / totalChecklistItems) * 100) : 0,
      quantityItems,
      matchingQuantity,
      quantityMatchRate: quantityItems > 0 ? Math.round((matchingQuantity / quantityItems) * 100) : 0,
      conditionItems,
      goodCondition,
      goodConditionRate: conditionItems > 0 ? Math.round((goodCondition / conditionItems) * 100) : 0,
      booleanItems,
      okBoolean,
      okBooleanRate: booleanItems > 0 ? Math.round((okBoolean / booleanItems) * 100) : 0,
    };
  }, [filteredData]);

  return (
    <>
      {/* Statistics Section */}
      {!loading && filteredData.length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,.06)]">
          <div className="text-sm font-semibold text-slate-900 mb-4">Inspection Statistics</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Total Inspections */}
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Total Inspections</div>
              <div className="text-xl font-bold text-slate-900">{stats.totalInspections}</div>
            </div>
            {/* Completion Rate */}
            <div className="rounded-xl bg-emerald-50 p-3">
              <div className="text-xs text-emerald-600">Checklist Completion</div>
              <div className="text-xl font-bold text-emerald-700">{stats.completionRate}%</div>
              <div className="text-xs text-emerald-600">{stats.completedChecklistItems}/{stats.totalChecklistItems} items</div>
            </div>
            {/* Quantity Match Rate */}
            {stats.quantityItems > 0 && (
              <div className="rounded-xl bg-blue-50 p-3">
                <div className="text-xs text-blue-600">Quantity Matches</div>
                <div className="text-xl font-bold text-blue-700">{stats.quantityMatchRate}%</div>
                <div className="text-xs text-blue-600">{stats.matchingQuantity}/{stats.quantityItems} items</div>
              </div>
            )}
            {/* Good Condition Rate */}
            {stats.conditionItems > 0 && (
              <div className="rounded-xl bg-amber-50 p-3">
                <div className="text-xs text-amber-600">Good Conditions</div>
                <div className="text-xl font-bold text-amber-700">{stats.goodConditionRate}%</div>
                <div className="text-xs text-amber-600">{stats.goodCondition}/{stats.conditionItems} items</div>
              </div>
            )}
            {/* OK Boolean Rate */}
            {stats.booleanItems > 0 && (
              <div className="rounded-xl bg-emerald-50 p-3">
                <div className="text-xs text-emerald-600">Boolean OK</div>
                <div className="text-xl font-bold text-emerald-700">{stats.okBooleanRate}%</div>
                <div className="text-xs text-emerald-600">{stats.okBoolean}/{stats.booleanItems} items</div>
              </div>
            )}
            {/* Condition Breakdown */}
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Overall Ratings</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {stats.conditionCounts.excellent > 0 && (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                    {stats.conditionCounts.excellent} Exc
                  </span>
                )}
                {stats.conditionCounts.good > 0 && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                    {stats.conditionCounts.good} Good
                  </span>
                )}
                {stats.conditionCounts.fair > 0 && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                    {stats.conditionCounts.fair} Fair
                  </span>
                )}
                {stats.conditionCounts.poor > 0 && (
                  <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                    {stats.conditionCounts.poor} Poor
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
