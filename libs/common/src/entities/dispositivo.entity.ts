import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('dispositivos')
export class Dispositivo {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  device_id: string;

  @Column({ type: 'boolean', default: false })
  is_banned: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  motivo_ban: string | null;

  @Column({ type: 'timestamp', nullable: true })
  ultimo_uso: Date | null;
}
