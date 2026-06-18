import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-arena text-sm">{title} — pronto</div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/revisar" element={<PlaceholderPage title="Revision de reportes" />} />
          <Route path="/casos" element={<PlaceholderPage title="Casos de Obra" />} />
          <Route path="/usuarios" element={<PlaceholderPage title="Gestion de Usuarios" />} />
          <Route path="/grupos/:id" element={<PlaceholderPage title="Detalle de Caso" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
