import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

/**
 * Oficio que sabe atender una cuadrilla (bacheo, luminarias, recojo de residuos…).
 * `categoria_id` es la categoría de reporte que esta especialidad resuelve — es lo
 * que le permite al motor de recomendación puntuar el match sin adivinar por nombre.
 */
@Entity('especialidades')
@Unique(['nombre'])
export class Especialidad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'int', nullable: true })
  categoria_id: number | null;
}
