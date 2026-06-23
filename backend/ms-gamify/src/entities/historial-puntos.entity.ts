import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('historial_puntos')
export class HistorialPuntos {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  usuario_id: number;

  @Index({ unique: true, where: 'report_id IS NOT NULL' })
  @Column({ type: 'int', nullable: true })
  report_id: number | null;

  @Column({ type: 'int' })
  puntos: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  motivo: string | null;

  @CreateDateColumn()
  creado_en: Date;
}
