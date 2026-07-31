import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum AccionRecomendacion {
  Aceptada = 'Aceptada',
  Modificada = 'Modificada',
  Descartada = 'Descartada',
}

/**
 * Decisión humana sobre una recomendación de capacidad (ISSUE-32).
 *
 * El pronóstico es una estimación y las cuadrillas no se mueven solas: el
 * coordinador acepta, modifica o descarta, y siempre deja motivo. Esta fila es
 * la evidencia de esa decisión.
 *
 * Guarda una **copia** de la recomendación (riesgo, casos estimados, factores,
 * versión de modelo) en vez de apuntar a ella. Una recomendación se recalcula
 * cada vez que alguien abre el panel y cambia con cada reentrenamiento; para
 * auditar hace falta lo que el coordinador tenía a la vista cuando decidió, no
 * lo que el modelo diría hoy.
 *
 * `periodo_desde`/`periodo_hasta` son la semana que se pronosticó. Son lo que
 * permite, pasada esa semana, contar los Casos que de verdad ocurrieron y medir
 * el error del pronóstico sin guardar una tabla aparte de snapshots.
 */
@Entity('decisiones_recomendacion')
@Index(['zona_h3', 'periodo_desde'])
@Index(['decidido_por_usuario_id', 'creado_en'])
export class DecisionRecomendacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 15 })
  zona_h3: string;

  @Column({ type: 'int', nullable: true })
  categoria_id: number | null;

  /** `apoyo` (riesgo >= 100%) o `preventiva` (>= 80%), como los define ISSUE-31. */
  @Column({ type: 'varchar', length: 20 })
  nivel: string;

  @Column({ type: 'varchar', length: 20 })
  accion: AccionRecomendacion;

  /** Obligatorio: la issue pide justificar aceptar, modificar y descartar. */
  @Column({ type: 'text' })
  motivo: string;

  @Column({ type: 'int' })
  decidido_por_usuario_id: number;

  // --- Copia de la recomendación tal como se mostró ---

  @Column({ type: 'text' })
  recomendacion_original: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  factores: string[];

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  riesgo: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  casos_estimados: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  reportes_estimados: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  confianza: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  version_modelo: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  version_dataset: string | null;

  /** Semana pronosticada, para comparar después contra lo observado. */
  @Column({ type: 'date' })
  periodo_desde: string;

  @Column({ type: 'date' })
  periodo_hasta: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}
