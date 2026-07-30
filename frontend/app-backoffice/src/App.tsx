import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthGuard from './components/AuthGuard';
import RoleRoute from './components/RoleRoute';
import InicioPorRol from './components/InicioPorRol';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RevisarPage from './pages/RevisarPage';
import CasosPage from './pages/CasosPage';
import CasoDetallePage from './pages/CasoDetallePage';
import UsuariosPage from './pages/UsuariosPage';
import GestionAccesosPage from './pages/GestionAccesosPage';
import ConfiguracionIaPage from './pages/ConfiguracionIaPage';
import SeleccionAreaPage from './pages/SeleccionAreaPage';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-arena text-sm">{title} — pronto</div>
  );
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
              <Routes>
                {/* Pantalla de decision para perfiles con varios roles: va sin
                    Layout porque todavia no eligieron area. */}
                <Route path="/areas" element={<SeleccionAreaPage />} />
                <Route
                  path="*"
                  element={
                    <Layout>
                      <Routes>
                        {/* "/" ya no es la entrada por defecto de cualquiera:
                            quien no puede ver el tablero estrategico cae en su
                            propia area (ISSUE-30). */}
                        <Route path="/" element={<InicioPorRol />} />
                        <Route
                          path="/revisar"
                          element={
                            <RoleRoute>
                              <RevisarPage />
                            </RoleRoute>
                          }
                        />
                        <Route
                          path="/casos"
                          element={
                            <RoleRoute>
                              <CasosPage />
                            </RoleRoute>
                          }
                        />
                        <Route
                          path="/casos/:id"
                          element={
                            <RoleRoute>
                              <CasoDetallePage />
                            </RoleRoute>
                          }
                        />
                        <Route
                          path="/grupos/:id"
                          element={
                            <RoleRoute>
                              <CasoDetallePage />
                            </RoleRoute>
                          }
                        />
                        <Route
                          path="/usuarios"
                          element={
                            <RoleRoute>
                              <UsuariosPage />
                            </RoleRoute>
                          }
                        />
                        <Route
                          path="/accesos"
                          element={
                            <RoleRoute>
                              <GestionAccesosPage />
                            </RoleRoute>
                          }
                        />
                        <Route
                          path="/configuracion/ia"
                          element={
                            <RoleRoute>
                              <ConfiguracionIaPage />
                            </RoleRoute>
                          }
                        />
                        <Route
                          path="*"
                          element={<PlaceholderPage title="Pagina no encontrada" />}
                        />
                      </Routes>
                    </Layout>
                  }
                />
              </Routes>
            </AuthGuard>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
