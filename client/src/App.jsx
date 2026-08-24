import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { DataProvider, useData } from './context/DataContext.jsx';
import Header from './components/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import History from './pages/History.jsx';

function Shell() {
  const { refreshAll, error } = useData();

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-[1400px] px-6 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Failed to load data: {error}. Is the backend running on port 5000?
          </div>
        )}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}
