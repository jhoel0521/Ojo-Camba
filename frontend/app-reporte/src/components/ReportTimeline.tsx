interface Actualizacion {
  id: number;
  comentario: string;
  estado_nuevo: string | null;
  url_imagen: string | null;
  creado_en: string;
}

export default function ReportTimeline({ items }: { items: Actualizacion[] }) {
  if (items.length === 0)
    return <p className="text-sm text-arena text-center py-4">Sin actualizaciones aun.</p>;

  return (
    <div className="space-y-0">
      {items.map((a, i) => {
        const fecha = new Date(a.creado_en).toLocaleString('es-BO', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
        return (
          <div key={a.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${a.estado_nuevo ? 'bg-sol-camba' : 'bg-arcilla'}`}
              />
              {i < items.length - 1 && <div className="w-px flex-1 bg-arcilla mt-1" />}
            </div>
            <div className={`pb-4 ${i === items.length - 1 ? '' : ''}`}>
              {a.estado_nuevo && (
                <span className="text-[10px] font-semibold text-sol-camba uppercase tracking-wide">
                  {a.estado_nuevo}
                </span>
              )}
              <p className="text-sm text-tierra mt-0.5">{a.comentario}</p>
              {a.url_imagen && (
                <img src={a.url_imagen} alt="" className="w-full rounded-2xl mt-2" />
              )}
              <p className="text-[10px] text-arena mt-1">{fecha}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
