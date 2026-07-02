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
    nombre: 'Obras activas',
    formula: 'COUNT(casos de obra) WHERE estado_actual NOT IN (Rechazado, Finalizado)',
    interpretacion: 'Casos de Obra en curso, aún no cerrados ni rechazados.',
    decision: 'Carga operativa actual en campo → dimensiona cuadrillas necesarias.',
  },
  reportes_activos: {
    id: 'reportes_activos',
    nombre: 'Reportes activos',
    formula: 'COUNT(reportes) WHERE estado NOT IN (Rechazado, Finalizado)',
    interpretacion:
      'Reportes individuales aún en curso, se hayan agrupado en una obra o no — complementa a "Obras activas" mostrando el lado reporte en vez del lado obra.',
    decision:
      'Muy por encima de "Obras activas" × tamaño promedio de obra → hay reportes sueltos sin agrupar, revisa el agrupamiento.',
  },
  dispositivos_baneados: {
    id: 'dispositivos_baneados',
    nombre: 'Dispositivos baneados',
    formula: 'COUNT(dispositivos) WHERE is_banned = true',
    interpretacion: 'Dispositivos bloqueados por abuso o contenido inapropiado.',
    decision: 'Incremento inusual → revisar patrón de abuso reciente y reforzar moderación.',
  },
  reportes_por_periodo: {
    id: 'reportes_por_periodo',
    nombre: 'Reportes por período',
    formula: 'COUNT(reportes) GROUP BY DATE_TRUNC(granularidad, creado_en)',
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
      'Reconstruido dia a dia desde la bitacora (actualizaciones_caso): estado de cada caso activo segun su ultima transicion antes de esa fecha. Excluye "Finalizado" a propósito.',
    interpretacion:
      'Evolución del ciclo de vida ACTIVO de las obras (Aceptado/Validación en campo/En trabajo) a lo largo del tiempo — revela en qué etapa se estancan los casos. "Finalizado" se excluye de este gráfico porque es un balde terminal que solo crece: mezclado con estados activos (una población acotada), su acumulado de toda la historia domina la escala y hace ilegible el resto. Su evolución real está en "Obras finalizadas por período".',
    decision:
      'Una etapa que no baja con el tiempo (ej. "En trabajo" estancado) → investigar qué frena el avance a la siguiente.',
  },
  finalizados_por_periodo: {
    id: 'finalizados_por_periodo',
    nombre: 'Obras finalizadas por período',
    formula:
      "COUNT(actualizaciones_caso) WHERE estado_nuevo = 'Finalizado', GROUP BY DATE_TRUNC(granularidad, creado_en)",
    interpretacion:
      'Cuántas obras terminaron efectivamente en cada período — a diferencia de "Casos por estado", este es un conteo por período (flujo), no un acumulado histórico, así que es directamente comparable en escala con "Reportes por período".',
    decision:
      'Caída sostenida → el equipo de campo está cerrando menos obras por período, revisar capacidad de cuadrillas.',
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
