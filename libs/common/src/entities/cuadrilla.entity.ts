import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

/**
 * Equipo de campo que ejecuta los Casos de Obra. Una cuadrilla tiene una sola
 * especialidad; `activa=false` la saca de las asignaciones nuevas sin borrar el
 * historial de los casos que ya atendió.
 */
@Entity('cuadrillas')
@Unique(['nombre'])
export class Cuadrilla {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'int', nullable: true })
  especialidad_id: number | null;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}
