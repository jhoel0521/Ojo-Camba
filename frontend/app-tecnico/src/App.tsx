import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import CasosPage from './pages/CasosPage';
import CasoDetallePage from './pages/CasoDetallePage';

function NotFound() {
  return (
    <div className="text-center text-sm text-arena py-16">Pagina no encontrada.</div>
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
                  <Route path="/" element={<CasosPage />} />
                  <Route path="/casos/:id" element={<CasoDetallePage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
