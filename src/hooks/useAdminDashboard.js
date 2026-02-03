import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { SecureStorage } from '../utils/encryption';
import { getApiBaseUrl } from '../utils/apiConfig';
import { toast } from '../utils/toast';

const withSlash = (base) => (base.endsWith('/') ? base : `${base}/`);

/**
 * Custom hook for fetching and managing admin dashboard data
 * @returns {Object} Dashboard data and loading states
 */
export const useAdminDashboard = () => {
  // Loading states
  const [loading, setLoading] = useState(false);
  const [todayActivityLoading, setTodayActivityLoading] = useState(false);
  const [recentInspectionsLoading, setRecentInspectionsLoading] = useState(false);

  // Data states
  const [studentsCount, setStudentsCount] = useState(0);
  const [buildingsCount, setBuildingsCount] = useState(0);
  const [roomsCount, setRoomsCount] = useState(0);
  const [todayActivity, setTodayActivity] = useState([]);
  const [recentInspections, setRecentInspections] = useState([]);

  // Base URL
  const baseUrl = useMemo(() => {
    const storedUrl = SecureStorage.getLocalItem('janitorial_url');
    return withSlash(storedUrl || getApiBaseUrl());
  }, []);

  // Today's date in YYYY-MM-DD format
  const todayYmd = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Derived metrics
  const activeToday = useMemo(
    () => (todayActivity || []).filter((r) => !!r.is_active_on_date).length,
    [todayActivity]
  );

  const roomsInspectedToday = useMemo(
    () => (todayActivity || []).reduce((s, r) => s + (Number(r.rooms_inspected) || 0), 0),
    [todayActivity]
  );

  // API request helper
  const makeRequest = useCallback(async (operation, json = {}) => {
    const response = await axios.post(
      `${baseUrl}admin.php`,
      { operation, json },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response;
  }, [baseUrl]);

  // Load counts data
  const loadCounts = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsRes, buildingsRes, roomsRes] = await Promise.all([
        makeRequest('getStudents'),
        makeRequest('getBuildings'),
        makeRequest('getRooms')
      ]);

      setStudentsCount(
        studentsRes?.data?.success
          ? (Array.isArray(studentsRes.data.data) ? studentsRes.data.data.length : 0)
          : 0
      );
      setBuildingsCount(
        buildingsRes?.data?.success
          ? (Array.isArray(buildingsRes.data.data) ? buildingsRes.data.data.length : 0)
          : 0
      );
      setRoomsCount(
        roomsRes?.data?.success
          ? (Array.isArray(roomsRes.data.data) ? roomsRes.data.data.length : 0)
          : 0
      );
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [makeRequest]);

  // Load today's activity
  const loadTodayActivity = useCallback(async () => {
    setTodayActivityLoading(true);
    try {
      const res = await makeRequest('getStudentActivitySummaryByDate', { date: todayYmd });

      if (res?.data?.success) {
        setTodayActivity(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        setTodayActivity([]);
        toast.error(res?.data?.message || 'Failed to load today activity.');
      }
    } catch {
      setTodayActivity([]);
      toast.error('Network error. Please try again.');
    } finally {
      setTodayActivityLoading(false);
    }
  }, [makeRequest, todayYmd]);

  // Load recent inspections
  const loadRecentInspections = useCallback(async () => {
    setRecentInspectionsLoading(true);
    try {
      const res = await makeRequest('getRecentInspections', { limit: 6 });

      if (res?.data?.success) {
        setRecentInspections(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        setRecentInspections([]);
        toast.error(res?.data?.message || 'Failed to load recent inspections.');
      }
    } catch {
      setRecentInspections([]);
      toast.error('Network error. Please try again.');
    } finally {
      setRecentInspectionsLoading(false);
    }
  }, [makeRequest]);

  // Load all data on mount
  useEffect(() => {
    loadCounts();
    loadTodayActivity();
    loadRecentInspections();
  }, [loadCounts, loadTodayActivity, loadRecentInspections]);

  return {
    // Loading states
    loading,
    todayActivityLoading,
    recentInspectionsLoading,
    // Counts
    studentsCount,
    buildingsCount,
    roomsCount,
    // Activity data
    todayActivity,
    recentInspections,
    // Derived metrics
    activeToday,
    roomsInspectedToday,
    // Refresh functions
    refresh: {
      counts: loadCounts,
      todayActivity: loadTodayActivity,
      recentInspections: loadRecentInspections,
      all: () => {
        loadCounts();
        loadTodayActivity();
        loadRecentInspections();
      }
    }
  };
};

export default useAdminDashboard;
