import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Unidad de trabajo de campo. Un Caso puede tener varias visitas históricas,
 * pero solo una permanece abierta a la vez (restricción parcial de la migración).
 */
@Entity('visitas_caso')
@Index(['tecnico_id', 'fecha_planificada'])
@Index(['cuadrilla_id', 'fecha_planificada', 'orden_ruta'])
export class VisitaCaso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  grupo_id: number;

  @Column({ type: 'int' })
  cuadrilla_id: number;

  @Column({ type: 'int', nullable: true })
  tecnico_id: number | null;

  @Column({ type: 'int', nullable: true })
  asignado_por_usuario_id: number | null;

  @Column({ type: 'date', nullable: true })
  fecha_planificada: string | null;

  @Column({ type: 'int', nullable: true })
  orden_ruta: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  llegada_en: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat_llegada: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng_llegada: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  cerrada_en: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  actualizado_en: Date;
}
