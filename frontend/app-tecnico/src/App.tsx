import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import InicioOperativoPage from './pages/InicioOperativoPage';
import MisObrasPage from './pages/MisObrasPage';
import MiRutaPage from './pages/MiRutaPage';
import DetalleVisitaPage from './pages/DetalleVisitaPage';
import { OperacionProvider } from './components/OperacionProvider';

function NotFound() {
  return <div className="text-center text-sm text-arena py-16">Pagina no encontrada.</div>;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <AuthGuard>
              <OperacionProvider>
                <Layout>
                  <Routes>
                    <Route path="/" element={<InicioOperativoPage />} />
                    <Route path="/mis-obras" element={<MisObrasPage />} />
                    <Route path="/mi-ruta" element={<MiRutaPage />} />
                    <Route path="/visitas/:id" element={<DetalleVisitaPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              </OperacionProvider>
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
