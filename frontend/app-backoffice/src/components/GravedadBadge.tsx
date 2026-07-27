// Rampa cálida de la paleta Anillos; Emergencia usa el rojo de Tailwind por la misma
// razón que StatusBadge usa green-600: es un semáforo sin token propio en el sistema.
const GRAVEDAD_COLORS: Record<string, string> = {
  Baja: 'bg-arena text-perla',
  Media: 'bg-caoba text-perla',
  Alta: 'bg-sol-camba text-perla',
  Emergencia: 'bg-red-600 text-perla',
};

export default function GravedadBadge({ gravedad }: { gravedad: string }) {
  const colorClass = GRAVEDAD_COLORS[gravedad] || 'bg-arena text-perla';
  return (
    <span
      data-testid={`gravedad-badge-${gravedad}`}
      className={`inline-flex px-2 py-0.5 rounded-pill text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}
    >
      {gravedad}
    </span>
  );
}
