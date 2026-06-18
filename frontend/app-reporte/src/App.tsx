import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useDevice } from './hooks/useDevice';
import { useAppStore } from './store/appStore';
import Layout from './components/Layout';
import HeatmapPage from './pages/HeatmapPage';
import ReportePage from './pages/ReportePage';
import ReporteDetailPage from './pages/ReporteDetailPage';
import MisReportesPage from './pages/MisReportesPage';
import PerfilPage from './pages/PerfilPage';
import HexagonoPage from './pages/HexagonoPage';
import GroupReportePage from './pages/GroupReportePage';

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
          <Route path="/mis-reportes" element={<MisReportesPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/hexagono/:resolution/:h3" element={<HexagonoPage />} />
          <Route path="/group-reporte/:groupId" element={<GroupReportePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
