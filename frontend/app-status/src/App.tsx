import { useEffect, useState } from 'react';
import './App.css';

interface ServiceItem {
  name: string;
  status: 'ok' | 'down';
  latencyMs?: number;
}

interface StatusData {
  status: 'ok' | 'degraded';
  services: ServiceItem[];
  timestamp: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function App() {
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3005';

    const fetchStatus = () => {
      fetch(`${apiUrl}/status`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((json: StatusData) => {
          setData(json);
          setError(null);
        })
        .catch((err) => {
          setError(err.message);
        });
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="status-app">
      <header className="status-header">
        <h1>Ojo Camba</h1>
        <p className="subtitle">Estado de los Microservicios</p>
      </header>

      {error && !data && (
        <div className="status-banner error">No se pudo conectar al gateway: {error}</div>
      )}

      {data && (
        <>
          <div className={`global-status ${data.status}`}>
            <span className="dot" />
            {data.status === 'ok' ? 'Todos los servicios operativos' : 'Servicio degradado'}
          </div>

          <div className="service-grid">
            {data.services.map((svc) => (
              <div key={svc.name} className={`service-card ${svc.status}`}>
                <div className="card-header">
                  <span className="dot" />
                  <h3>{svc.name}</h3>
                </div>
                <p className="card-status">{svc.status === 'ok' ? 'Operativo' : 'Interrupcion'}</p>
                {svc.latencyMs !== undefined && <p className="card-latency">{svc.latencyMs} ms</p>}
              </div>
            ))}
          </div>

          <footer className="status-footer">Actualizado: {formatTime(data.timestamp)}</footer>
        </>
      )}
    </main>
  );
}
