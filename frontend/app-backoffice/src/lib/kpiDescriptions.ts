export interface KpiDescription {
  id: string;
  nombre: string;
  formula: string;
  interpretacion: string;
  decision: string;
}

// Fuente unica: este microcopy alimenta el Dashboard y el "Analisis de KPIs"
// del informe final — se redacta una sola vez y se reusa en ambos lugares.
export const KPI_DESCRIPTIONS: Record<string, KpiDescription> = {
  pendientes: {
    id: 'pendientes',
    nombre: 'Pendientes',
    formula: 'COUNT(reportes) WHERE estado = Reportado',
    interpretacion: 'Reportes esperando primera revisión de un moderador.',
    decision: 'Backlog alto → asignar más moderadores a la bandeja de revisión.',
  },
  aceptados_hoy: {
    id: 'aceptados_hoy',
    nombre: 'Aceptados hoy',
    formula: 'COUNT(reportes) WHERE estado = Aceptado AND creado_en >= hoy 00:00',
    interpretacion: 'Reportes procesados hoy — mide el ritmo de moderación diario.',
    decision:
      'Ritmo bajo respecto a lo habitual → revisar disponibilidad del equipo de moderación.',
  },
  casos_activos: {
    id: 'casos_activos',
    nombre: 'Casos activos',
    formula: 'COUNT(casos de obra) WHERE estado_actual NOT IN (Rechazado, Finalizado)',
    interpretacion: 'Casos de Obra en curso, aún no cerrados ni rechazados.',
    decision: 'Carga operativa actual en campo → dimensiona cuadrillas necesarias.',
  },
  dispositivos_baneados: {
    id: 'dispositivos_baneados',
    nombre: 'Dispositivos baneados',
    formula: 'COUNT(dispositivos) WHERE is_banned = true',
    interpretacion: 'Dispositivos bloqueados por abuso o contenido inapropiado.',
    decision: 'Incremento inusual → revisar patrón de abuso reciente y reforzar moderación.',
  },
  reportes_por_mes: {
    id: 'reportes_por_mes',
    nombre: 'Reportes por mes',
    formula: 'COUNT(reportes) GROUP BY DATE_TRUNC(mes, creado_en)',
    interpretacion:
      'Tendencia de reportes ciudadanos — un aumento sostenido indica más carga operativa.',
    decision: 'Tendencia al alza → planificar refuerzo de personal con anticipación.',
  },
  por_categoria: {
    id: 'por_categoria',
    nombre: 'Por categoría',
    formula: 'COUNT(reportes) GROUP BY categoria_id (con categoría asignada)',
    interpretacion:
      'Qué tipo de problema urbano reportan más — guía la asignación de cuadrillas especializadas.',
    decision: 'Categoría dominante (>40%) → priorizar cuadrillas de esa especialidad este período.',
  },
  casos_por_estado: {
    id: 'casos_por_estado',
    nombre: 'Casos por estado',
    formula:
      'Reconstruido dia a dia desde la bitacora (actualizaciones_caso): estado de cada caso segun su ultima transicion antes de esa fecha.',
    interpretacion:
      'Evolución del ciclo de vida de las obras a lo largo del tiempo — revela en qué etapa se estancan los casos y qué tan rápido crece "Finalizado".',
    decision:
      'Una etapa que no baja con el tiempo (ej. "En trabajo" estancado) → investigar qué frena el avance a la siguiente.',
  },
  tasa_resolucion: {
    id: 'tasa_resolucion',
    nombre: 'Tasa de resolución',
    formula: 'Finalizados / (Finalizados + Aceptados + ValidacionEnCampo + EnTrabajo) × 100',
    interpretacion:
      '% de casos cerrados sobre el total del período — mide la efectividad operativa.',
    decision: 'Caídas bajo 70% activan alerta: reforzar cuadrillas o revisar casos represados.',
  },
};
