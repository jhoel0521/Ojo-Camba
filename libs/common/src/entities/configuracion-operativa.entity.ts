import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

/** Umbrales operativos modificables y auditables por Encargado IT. */
@Entity('configuracion_operativa')
@Unique(['clave'])
export class ConfiguracionOperativa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  clave: string;

  @Column({ type: 'int' })
  valor: number;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'int', nullable: true })
  actualizado_por_usuario_id: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  actualizado_en: Date;
}
