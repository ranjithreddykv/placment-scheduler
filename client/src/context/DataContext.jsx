import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { studentApi, companyApi, roomApi, scheduleApi, datasetApi, replanApi } from '../services/api.js';
import { useToast } from '../hooks/useToast.jsx';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const toast = useToast();

  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [datasetReady, setDatasetReady] = useState(false);
  const [scheduleReady, setScheduleReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); // true while generate/replan is in flight
  const [error, setError] = useState(null);
  const [lastReplannedAt, setLastReplannedAt] = useState(null);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [studentsData, companiesData, roomsData] = await Promise.all([studentApi.list(), companyApi.list(), roomApi.list()]);
      setStudents(studentsData);
      setCompanies(companiesData);
      setRooms(roomsData);
      setDatasetReady(studentsData.length > 0 && companiesData.length > 0);

      try {
        const [interviewsData, metricsData, historyData] = await Promise.all([scheduleApi.get(), scheduleApi.metrics(), scheduleApi.history()]);
        setInterviews(interviewsData);
        setMetrics(metricsData);
        setHistory(historyData);
        setScheduleReady(interviewsData.length > 0);
      } catch {
        setInterviews([]);
        setMetrics(null);
        setHistory([]);
        setScheduleReady(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const generateDataset = useCallback(async () => {
    setBusy(true);
    try {
      const res = await datasetApi.generate();
      toast.success(`Dataset generated: ${res.stats.studentCount} students, ${res.stats.companyCount} companies, ${res.stats.roomCount} rooms`);
      await refreshAll();
      return res;
    } catch (err) {
      toast.error(err.message);
      throw err;
    } finally {
      setBusy(false);
    }
  }, [refreshAll, toast]);

  const generateSchedule = useCallback(async () => {
    setBusy(true);
    try {
      const res = await scheduleApi.generate();
      toast.success(`Schedule generated: ${res.metrics.schedulingRate}% scheduled`);
      await refreshAll();
      return res;
    } catch (err) {
      toast.error(err.message);
      throw err;
    } finally {
      setBusy(false);
    }
  }, [refreshAll, toast]);

  const runReplan = useCallback(
    async (type, payload) => {
      setBusy(true);
      try {
        const fn = { companyDelay: replanApi.companyDelay, panelDrop: replanApi.panelDrop, studentWithdraw: replanApi.studentWithdraw, roomUnavailable: replanApi.roomUnavailable }[type];
        const res = await fn(payload);
        setLastReplannedAt(new Date());
        await refreshAll();
        return res;
      } catch (err) {
        toast.error(err.message);
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [refreshAll, toast]
  );

  const studentsById = useMemo(() => new Map(students.map((s) => [s.studentId, s])), [students]);
  const companiesById = useMemo(() => new Map(companies.map((c) => [c.companyId, c])), [companies]);
  const roomsById = useMemo(() => new Map(rooms.map((r) => [r.roomId, r])), [rooms]);

  const value = {
    students,
    companies,
    rooms,
    interviews,
    metrics,
    history,
    studentsById,
    companiesById,
    roomsById,
    datasetReady,
    scheduleReady,
    loading,
    busy,
    error,
    lastReplannedAt,
    refreshAll,
    generateDataset,
    generateSchedule,
    runReplan,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
}
