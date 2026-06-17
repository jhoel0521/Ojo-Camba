import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useDevice } from './hooks/useDevice';
import { useAppStore } from './store/appStore';
import Layout from './components/Layout';
import HeatmapPage from './pages/HeatmapPage';
import ReportePage from './pages/ReportePage';
import ReporteDetailPage from './pages/ReporteDetailPage';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-caoba text-sm">
      {title} — pronto
    </div>
  );
}

export default function App() {
  const setDevice = useAppStore((s) => s.setDevice);
  useDevice(setDevice);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HeatmapPage />} />
          <Route path="/nuevo" element={<ReportePage />} />
          <Route path="/reporte/:id" element={<ReporteDetailPage />} />
          <Route path="/mis-reportes" element={<PlaceholderPage title="Mis Reportes" />} />
          <Route path="/perfil" element={<PlaceholderPage title="Perfil" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
