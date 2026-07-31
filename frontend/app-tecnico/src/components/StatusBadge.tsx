const STATUS_COLORS: Record<string, string> = {
  Reportado: 'bg-arena text-perla',
  PendienteAsignacion: 'bg-sol-camba text-perla',
  PlanificadoVisita: 'bg-caoba text-perla',
  ValidacionCampo: 'bg-caoba text-perla',
  Reencolado: 'bg-sol-camba text-perla',
  EnTrabajo: 'bg-caoba text-perla',
  Derivado: 'bg-ladrillo text-perla',
  RechazadoCampo: 'bg-catedral text-arena',
  Finalizado: 'bg-green-600 text-perla',
  Rechazado: 'bg-catedral text-arena',
};

export default function StatusBadge({ estado }: { estado: string }) {
  const colorClass = STATUS_COLORS[estado] || 'bg-arena text-perla';
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-pill text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}
    >
      {estado}
    </span>
  );
}
