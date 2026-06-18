import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('categorias')
@Unique(['nombre'])
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icono: string | null;
}
