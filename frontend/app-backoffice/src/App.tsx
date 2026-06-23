import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RevisarPage from './pages/RevisarPage';
import CasosPage from './pages/CasosPage';
import CasoDetallePage from './pages/CasoDetallePage';
import UsuariosPage from './pages/UsuariosPage';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-arena text-sm">{title} — pronto</div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <Layout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/revisar" element={<RevisarPage />} />
                  <Route path="/casos" element={<CasosPage />} />
                  <Route path="/casos/:id" element={<CasoDetallePage />} />
                  <Route path="/grupos/:id" element={<CasoDetallePage />} />
                  <Route path="/usuarios" element={<UsuariosPage />} />
                  <Route path="*" element={<PlaceholderPage title="Pagina no encontrada" />} />
                </Routes>
              </Layout>
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
