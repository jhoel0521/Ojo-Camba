import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('actualizaciones_caso')
export class ActualizacionCaso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  reporte_id: number | null;

  @Column({ type: 'int', nullable: true })
  grupo_id: number | null;

  @Column({ type: 'int' })
  usuario_id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  estado_nuevo: string | null;

  @Column({ type: 'text' })
  comentario: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  recursos_solicitados: string | null;

  @Column({ type: 'date', nullable: true })
  fecha_estimada_fin: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat_actualizada: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng_actualizada: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url_imagen: string | null;

  @CreateDateColumn()
  creado_en: Date;
}
