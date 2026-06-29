import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { EstadoReporte, Gravedad } from '../enums/estado-reporte.enum';

@Entity('reportes')
export class Reporte {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  device_id: string;

  @Column({ type: 'int', nullable: true })
  usuario_id: number | null;

  @Column({ type: 'int' })
  categoria_id: number;

  @Column({ type: 'int', nullable: true })
  grupo_id: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @Column({ type: 'varchar', length: 15 })
  h3_res_8: string;

  @Column({ type: 'varchar', length: 15 })
  h3_res_11: string;

  @Column({ type: 'varchar', length: 15 })
  h3_res_13: string;

  @Column({ type: 'varchar', length: 50, default: EstadoReporte.Reportado })
  estado: string;

  @Column({ type: 'varchar', length: 20, default: Gravedad.Media })
  gravedad: string;

  @Column({ type: 'varchar', length: 500 })
  url_imagen: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}
