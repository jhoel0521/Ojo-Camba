const { H1, CodigoRef, GH, Blank } = require('./helpers');

const anexos = [
    H1("Anexos"),

    ...CodigoRef(
        "Anexo A", "Dashboard KPIs con Filtro de Fechas — backend/ms-admin/src/admin.service.ts",
        "backend/ms-admin/src/admin.service.ts", "552–645",
        `${GH}/backend/ms-admin/src/admin.service.ts#L552-L645`,
        "Método íntegro getDashboardKpis(), incorporado en el Sprint 3 sobre la base construida en el Sprint 2, con el filtro desde/hasta implementado y verificado (Figuras 1 y 2, casos de prueba 10-12). Los cuatro contadores de getDashboard() permanecen en tiempo real; las tres agregaciones restantes aplican el rango desde/hasta cuando se provee, resuelto por resolveRango(). Se muestra resolveRango() completo y el inicio/cierre de getDashboardKpis(); las 3 consultas QueryBuilder intermedias (reportes_por_mes, por_categoria, casos_por_estado) siguen el mismo patrón condicional y se omiten aquí por espacio — el archivo completo está en el enlace de arriba.",
        `private resolveRango(desde?: string, hasta?: string) {
  if (!desde && !hasta) return null;
  const d = desde ? new Date(\`\${desde}T00:00:00.000\`) : new Date('2000-01-01T00:00:00.000');
  const h = hasta ? new Date(\`\${hasta}T23:59:59.999\`) : new Date();
  return { desde: d.toISOString(), hasta: h.toISOString() };
}

async getDashboardKpis(desde?: string, hasta?: string) {
  const base = await this.getDashboard();          // 4 contadores, siempre tiempo real
  const rango = this.resolveRango(desde, hasta);

  const reportesPorMesQb = this.reporteRepo.createQueryBuilder('r')
    .select("TO_CHAR(DATE_TRUNC('month', r.creado_en), 'YYYY-MM')", 'mes')
    .addSelect('COUNT(r.id)', 'total')
    .groupBy("DATE_TRUNC('month', r.creado_en)")
    .orderBy("DATE_TRUNC('month', r.creado_en)", 'ASC');

  if (rango) {
    reportesPorMesQb.where('r.creado_en BETWEEN :desde AND :hasta', rango);
  } else {
    // sin rango: ultimos 6 meses (comportamiento historico original)
    reportesPorMesQb.where('r.creado_en >= :desde', { desde: seisMesesAtras });
  }
  // ... por_categoria y casos_por_estado aplican el mismo condicional (ver archivo completo)

  return {
    ...base,
    reportes_por_mes: reportesPorMes,
    por_categoria: porCategoria,
    casos_por_estado: casosPorEstado,
    tasa_resolucion: tasaResolucion,
    rango_aplicado: rango ? { desde, hasta } : null,
  };
}`,
    ),

    ...CodigoRef(
        "Anexo B", "CRUD de Casos de Obra — backend/ms-admin/src/admin.service.ts (createGroup)",
        "backend/ms-admin/src/admin.service.ts", "187–225",
        `${GH}/backend/ms-admin/src/admin.service.ts#L187-L225`,
        "El método createGroup() ilustra las validaciones de negocio ejecutadas en la capa de servicio (casos de prueba 5 y 6 de la Tabla 10 y el escenario Gherkin de la sección Definition of Ready): cardinalidad mínima de reportes, existencia de los IDs referenciados y generación del código único de Caso de Obra.",
        `async createGroup(dto: CreateGroupDto) {
  if (dto.report_ids.length < 2) {
    throw new BadRequestException('Se necesitan al menos 2 reportes');
  }

  const reportes = await this.reporteRepo.find({ where: { id: In(dto.report_ids) } });
  if (reportes.length !== dto.report_ids.length) {
    throw new BadRequestException('Uno o mas reportes no existen');
  }

  const noReportados = reportes.filter((r) => r.estado !== EstadoReporte.Reportado);
  if (noReportados.length > 0) {
    throw new BadRequestException('Solo se pueden agrupar reportes en estado Reportado');
  }

  const year = new Date().getFullYear();
  const count = (await this.grupoRepo.count()) + 1;
  const codigoObra = \`O-\${String(year).slice(-2)}-\${String(count).padStart(7, '0')}\`;

  const grupo = this.grupoRepo.create({
    codigo_obra: codigoObra,
    estado_actual: EstadoReporte.Aceptado,
    creado_por_usuario_id: dto.creado_por_usuario_id,
  });
  await this.grupoRepo.save(grupo);

  await this.reporteRepo.update(dto.report_ids, {
    grupo_id: grupo.id,
    estado: EstadoReporte.Aceptado,
  });

  return { id: grupo.id, codigo_obra: codigoObra, reportes_agrupados: dto.report_ids.length };
}`,
    ),

    ...CodigoRef(
        "Anexo C", "DTOs de Validación — backend/ms-admin/src/dto/index.ts",
        "backend/ms-admin/src/dto/index.ts", "1–60, archivo completo",
        `${GH}/backend/ms-admin/src/dto/index.ts`,
        "Contrato de entrada completo de los cuatro DTOs de escritura de ms-admin, reproducido íntegro por ser un archivo corto: cardinalidad de CreateGroupDto (ArrayMinSize), campos opcionales de UpdateCaseDto marcados con @IsOptional() / sin decorador cuando el tipo ya lo permite, y motivo de BanDeviceDto.",
        `import { IsArray, IsInt, IsNotEmpty, ArrayMinSize, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGroupDto {
  @IsArray() @ArrayMinSize(2) @Type(() => Number) @IsInt({ each: true })
  report_ids: number[];
  @IsInt() creado_por_usuario_id: number;
}

export class UpdateCaseDto {
  @IsInt() grupo_id: number;
  @IsInt() usuario_id: number;
  @IsNotEmpty() comentario: string;
  url_imagen?: string;
  estado_nuevo?: string;
  recursos_solicitados?: string;
  fecha_estimada_fin?: string;
  lat_actualizada?: number;
  lng_actualizada?: number;
}

export class AcceptReportDto {
  @IsInt() report_id: number;
  @IsInt() moderador_id: number;
  @IsOptional() @IsInt() categoria_id?: number;
  @IsOptional() @IsInt() grupo_id?: number;
}

export class RejectReportDto {
  @IsInt() report_id: number;
}

export class BanDeviceDto {
  @IsNotEmpty() device_id: string;
  @IsNotEmpty() motivo: string;
}`,
    ),

    ...CodigoRef(
        "Anexo D", "Filtro Dinámico del Dashboard — frontend/app-backoffice",
        "DashboardPage.tsx y adminApi.ts",
        "33–58 / 87–94",
        `${GH}/frontend/app-backoffice/src/pages/DashboardPage.tsx#L33-L58`,
        "Estado del filtro (desde/hasta) y el hook load() que reconstruye la solicitud al backend en cada cambio, con el cliente HTTP correspondiente. El formulario con los dos campos type=\"date\" y el botón \"Limpiar filtro\" se muestra en las Figuras 1 y 2; su JSX completo está en el archivo enlazado.",
        `// DashboardPage.tsx
const [desde, setDesde] = useState('');
const [hasta, setHasta] = useState('');

const load = useCallback(() => {
  setLoading(true);
  getDashboardKpis(desde || undefined, hasta || undefined)
    .then(setKpis)
    .catch((err) => setError(friendlyError(err)))
    .finally(() => setLoading(false));
}, [desde, hasta]);

useEffect(() => { load(); }, [load]);

// adminApi.ts
export async function getDashboardKpis(desde?: string, hasta?: string) {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  const qs = params.toString();
  return fetchAPI<DashboardKpis>(\`/admin/dashboard/kpis\${qs ? \`?\${qs}\` : ''}\`);
}`,
    ),

    ...CodigoRef(
        "Anexo E", "Endpoints REST del Gateway — backend/gateway-principal/src/admin.controller.ts (extracto)",
        "backend/gateway-principal/src/admin.controller.ts", "1–44",
        `${GH}/backend/gateway-principal/src/admin.controller.ts#L1-L44`,
        "El Gateway traduce los parámetros de query string a los DTO de payload TCP enviados a ms-admin, siguiendo el mismo patrón para todos los endpoints paginados y filtrables del sistema, incluido el nuevo filtro de fechas del Dashboard.",
        `@Get('dashboard/kpis')
getDashboardKpis(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
  return sendRpc(this.client.send(TCP_PATTERNS.ADMIN.DASHBOARD_KPIS, { desde, hasta }));
}

@Get('groups/nearby')
listNearbyGroups(
  @Query('lat') lat: string,
  @Query('lng') lng: string,
  @Query('radius') radius?: string,
) {
  return sendRpc(
    this.client.send(TCP_PATTERNS.ADMIN.LIST_GROUPS_NEARBY, {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius: radius ? parseInt(radius, 10) : undefined,
    }),
  );
}`,
    ),
];

module.exports = { anexos };
