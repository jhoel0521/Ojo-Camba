export default function DashboardPage() {
  return (
    <div>
      <h2 className="font-semibold text-xl text-tierra mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Pendientes', 'Aceptados hoy', 'Casos activos', 'Dispositivos baneados'].map((label) => (
          <div key={label} className="bg-perla rounded-3xl-3 p-6">
            <p className="text-xs text-arena uppercase tracking-wide mb-1">{label}</p>
            <p className="text-2xl font-bold text-tierra">—</p>
          </div>
        ))}
      </div>
    </div>
  );
}
