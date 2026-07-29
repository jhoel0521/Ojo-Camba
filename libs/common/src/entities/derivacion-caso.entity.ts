import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/** Evidencia auditable de una derivación confirmada en campo. */
@Entity('derivaciones_caso')
@Index(['grupo_id', 'creado_en'])
export class DerivacionCaso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  grupo_id: number;

  @Column({ type: 'varchar', length: 160 })
  entidad_destino: string;

  @Column({ type: 'text' })
  motivo: string;

  @Column({ type: 'varchar', length: 500 })
  evidencia_url: string;

  @Column({ type: 'int' })
  confirmado_por_usuario_id: number;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}
