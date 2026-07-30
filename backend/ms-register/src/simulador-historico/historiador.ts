import { DataSource } from 'typeorm';
import {
  ActualizacionCaso,
  Categoria,
  DerivacionCaso,
  Dispositivo,
  GrupoReporte,
  Reporte,
} from '@ojo-camba/common';

export interface EventosDelDia {
  reportes: number[];
  grupos: number[];
  actualizaciones: number[];
  derivaciones: number[];
}

export interface ReporteValidacion {
  corrida: string;
  porFechaCategoriaZona: Array<{ fecha: string; categoria: string; zona: string; total: number }>;
  porEstado: Array<{ estado: string; total: number }>;
  derivaciones: number;
  alertasCapacidad: number;
}

export class Historiador {
  private readonly dataSource: DataSource;

  constructor(databaseUrl: string) {
    this.dataSource = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: [Reporte, GrupoReporte, ActualizacionCaso, DerivacionCaso, Categoria, Dispositivo],
      synchronize: false,
    });
  }

  async iniciar(): Promise<void> {
    await this.dataSource.initialize();
  }

  async cerrar(): Promise<void> {
    if (this.dataSource.isInitialized) await this.dataSource.destroy();
  }

  async categorias(): Promise<Map<string, number>> {
    const categorias = await this.dataSource.getRepository(Categoria).find();
    return new Map(categorias.map((categoria) => [categoria.nombre, categoria.id]));
  }

  /**
   * Las acciones ya fueron validadas por las APIs. Esta transacción solo mueve
   * su reloj a la fecha histórica para que el dashboard conserve coherencia.
   */
  async fechar(eventos: EventosDelDia, fecha: Date): Promise<void> {
    const creadoEn = new Date(fecha);
    creadoEn.setUTCHours(12, 0, 0, 0);
    await this.dataSource.transaction(async (manager) => {
      await this.actualizarFecha(manager, 'reportes', eventos.reportes, creadoEn);
      await this.actualizarFecha(manager, 'grupos_reportes', eventos.grupos, creadoEn);
      await this.actualizarFecha(
        manager,
        'actualizaciones_caso',
        eventos.actualizaciones,
        creadoEn,
      );
      await this.actualizarFecha(manager, 'derivaciones_caso', eventos.derivaciones, creadoEn);
    });
  }

  /** Compensación ante fallo: elimina el historial visible de una corrida. */
  async limpiarCorrida(prefijoDispositivo: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const grupos = (await manager.query(
        `SELECT DISTINCT grupo_id FROM reportes WHERE device_id LIKE $1 AND grupo_id IS NOT NULL`,
        [`${prefijoDispositivo}%`],
      )) as Array<{ grupo_id: number }>;
      const grupoIds = grupos.map((grupo) => grupo.grupo_id);
      if (grupoIds.length > 0) {
        await manager.query('DELETE FROM derivaciones_caso WHERE grupo_id = ANY($1)', [grupoIds]);
        await manager.query('DELETE FROM actualizaciones_caso WHERE grupo_id = ANY($1)', [
          grupoIds,
        ]);
        await manager.query('DELETE FROM grupos_reportes WHERE id = ANY($1)', [grupoIds]);
      }
      await manager.query('DELETE FROM reportes WHERE device_id LIKE $1', [
        `${prefijoDispositivo}%`,
      ]);
      await manager.query('DELETE FROM dispositivos WHERE device_id LIKE $1', [
        `${prefijoDispositivo}%`,
      ]);
    });
  }

  /** Borra el trabajo iniciado después del último checkpoint para poder repetir esa jornada. */
  async limpiarDiaParcial(prefijoDispositivoDelDia: string): Promise<void> {
    await this.limpiarCorrida(prefijoDispositivoDelDia);
  }

  async generarReporte(corridaId: string): Promise<ReporteValidacion> {
    const prefijo = `sim-${corridaId}-%`;
    const porFechaCategoriaZona = (await this.dataSource.query(
      `SELECT TO_CHAR(r.creado_en AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS fecha,
              c.nombre AS categoria,
              r.h3_res_8 AS zona,
              COUNT(*)::int AS total
         FROM reportes r
         INNER JOIN categorias c ON c.id = r.categoria_id
        WHERE r.device_id LIKE $1
        GROUP BY fecha, c.nombre, r.h3_res_8
        ORDER BY fecha, c.nombre, r.h3_res_8`,
      [prefijo],
    )) as ReporteValidacion['porFechaCategoriaZona'];
    const porEstado = (await this.dataSource.query(
      `SELECT estado, COUNT(*)::int AS total
         FROM reportes
        WHERE device_id LIKE $1
        GROUP BY estado
        ORDER BY estado`,
      [prefijo],
    )) as ReporteValidacion['porEstado'];
    const derivaciones = (await this.dataSource.query(
      `SELECT COUNT(DISTINCT d.id)::int AS total
         FROM derivaciones_caso d
         INNER JOIN grupos_reportes g ON g.id = d.grupo_id
         INNER JOIN reportes r ON r.grupo_id = g.id
        WHERE r.device_id LIKE $1`,
      [prefijo],
    )) as Array<{ total: number }>;
    const alertas = (await this.dataSource.query(
      `SELECT COUNT(DISTINCT a.id)::int AS total
         FROM actualizaciones_caso a
         INNER JOIN grupos_reportes g ON g.id = a.grupo_id
         INNER JOIN reportes r ON r.grupo_id = g.id
        WHERE r.device_id LIKE $1
          AND (a.comentario ILIKE '%alerta preventiva%' OR a.recursos_solicitados IS NOT NULL)`,
      [prefijo],
    )) as Array<{ total: number }>;
    return {
      corrida: corridaId,
      porFechaCategoriaZona,
      porEstado,
      derivaciones: derivaciones[0]?.total ?? 0,
      alertasCapacidad: alertas[0]?.total ?? 0,
    };
  }

  private async actualizarFecha(
    manager: { query: (query: string, parameters?: unknown[]) => Promise<unknown> },
    tabla: string,
    ids: number[],
    fecha: Date,
  ): Promise<void> {
    if (ids.length === 0) return;
    await manager.query(`UPDATE ${tabla} SET creado_en = $2 WHERE id = ANY($1)`, [ids, fecha]);
  }
}
