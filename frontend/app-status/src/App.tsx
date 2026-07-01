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

interface DayUptime {
  fecha: string;
  uptimePct: number;
  totalChecks: number;
}

interface ServiceHistory {
  servicio: string;
  dias: DayUptime[];
}

const HISTORY_DAYS = 30;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDate(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'short',
  });
}

function uptimeLevel(pct: number): 'high' | 'mid' | 'low' {
  if (pct >= 99) return 'high';
  if (pct >= 95) return 'mid';
  return 'low';
}

function buildDayWindow(dias: DayUptime[], days: number) {
  const byFecha = new Map(dias.map((d) => [d.fecha, d]));
  const today = new Date();
  const window: (DayUptime | null)[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const fecha = d.toISOString().slice(0, 10);
    window.push(byFecha.get(fecha) ?? null);
  }
  return window;
}

function averageUptime(dias: DayUptime[]) {
  if (dias.length === 0) return null;
  const totalChecks = dias.reduce((acc, d) => acc + d.totalChecks, 0);
  const okChecks = dias.reduce((acc, d) => acc + (d.uptimePct / 100) * d.totalChecks, 0);
  return totalChecks === 0 ? null : Math.round((okChecks / totalChecks) * 1000) / 10;
}

export default function App() {
  const [data, setData] = useState<StatusData | null>(null);
  const [history, setHistory] = useState<ServiceHistory[]>([]);
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

    const fetchHistory = () => {
      fetch(`${apiUrl}/status/history?days=${HISTORY_DAYS}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((json: ServiceHistory[]) => setHistory(json))
        .catch(() => {});
    };

    fetchStatus();
    fetchHistory();
    const statusInterval = setInterval(fetchStatus, 5000);
    const historyInterval = setInterval(fetchHistory, 60000);
    return () => {
      clearInterval(statusInterval);
      clearInterval(historyInterval);
    };
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

          <section className="uptime-history">
            <h2 className="uptime-history-title">
              Historico de disponibilidad (ultimos {HISTORY_DAYS} dias)
            </h2>
            {data.services.map((svc) => {
              const svcHistory = history.find((h) => h.servicio === svc.name);
              const dias = svcHistory?.dias ?? [];
              const avg = averageUptime(dias);
              const window = buildDayWindow(dias, HISTORY_DAYS);

              return (
                <div key={svc.name} className="uptime-row">
                  <div className="uptime-row-header">
                    <span className="uptime-row-name">{svc.name}</span>
                    <span className="uptime-row-avg">
                      {avg !== null ? `${avg}% uptime` : 'Sin datos aun'}
                    </span>
                  </div>
                  <div className="uptime-bars">
                    {window.map((day, i) => (
                      <span
                        key={i}
                        className={`uptime-bar ${day ? uptimeLevel(day.uptimePct) : 'no-data'}`}
                        title={
                          day
                            ? `${formatDate(day.fecha)}: ${day.uptimePct}% (${day.totalChecks} checks)`
                            : 'Sin datos'
                        }
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          <footer className="status-footer">Actualizado: {formatTime(data.timestamp)}</footer>
        </>
      )}
    </main>
  );
}
