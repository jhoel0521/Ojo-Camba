import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { EstadoCaso } from '../enums/estado-caso.enum';

@Entity('grupos_reportes')
export class GrupoReporte {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  codigo_obra: string;

  @Column({ type: 'varchar', length: 50, default: EstadoCaso.PendienteAsignacion })
  estado_actual: string;

  @Column({ type: 'date', nullable: true })
  fecha_estimada_fin: string | null;

  @Column({ type: 'int' })
  creado_por_usuario_id: number;

  @Column({ type: 'int', nullable: true })
  categoria_id: number | null;

  /** Cuadrilla asignada al caso. Null mientras nadie lo asigna todavía. */
  @Column({ type: 'int', nullable: true })
  cuadrilla_id: number | null;

  /** 1 es máxima prioridad y 5 es la menor. La ruta la usa como costo operativo. */
  @Column({ type: 'smallint', default: 3 })
  prioridad: number;

  /** Trazabilidad del cierre RechazadoCampo confirmado por Coordinación. */
  @Column({ type: 'int', nullable: true })
  categoria_rechazo_campo_id: number | null;

  @Column({ type: 'int', nullable: true })
  rechazado_campo_por_usuario_id: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  rechazado_campo_en: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}
