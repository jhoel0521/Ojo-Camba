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

  /** Quién admitió el reporte en Backoffice; alimenta la métrica de calidad. */
  @Column({ type: 'int', nullable: true })
  admitido_por_usuario_id: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  admitido_en: Date | null;

  /** Descarte previo a una visita, distinto del rechazo de campo del Caso. */
  @Column({ type: 'varchar', length: 80, nullable: true })
  motivo_descarte_digital: string | null;

  @Column({ type: 'int', nullable: true })
  descartado_por_usuario_id: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  descartado_en: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}
