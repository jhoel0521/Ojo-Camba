import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('niveles')
@Unique(['nombre'])
export class Nivel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'int' })
  puntos_requeridos: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url_sticker: string | null;
}
