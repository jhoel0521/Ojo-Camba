import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { EstadoReporte } from '../enums/estado-reporte.enum';

@Entity('grupos_reportes')
export class GrupoReporte {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  codigo_obra: string;

  @Column({ type: 'varchar', length: 50, default: EstadoReporte.Aceptado })
  estado_actual: string;

  @Column({ type: 'date', nullable: true })
  fecha_estimada_fin: string | null;

  @Column({ type: 'int' })
  creado_por_usuario_id: number;

  @Column({ type: 'int', nullable: true })
  categoria_id: number | null;

  @CreateDateColumn()
  creado_en: Date;
}
