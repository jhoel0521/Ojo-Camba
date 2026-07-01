import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('ping_log')
@Index(['servicio', 'creado_en'])
export class PingLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  servicio: string;

  @Column({ type: 'varchar', length: 10 })
  estado: string;

  @Column({ type: 'int', nullable: true })
  latencia_ms: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}
