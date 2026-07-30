import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EstadoCaso } from '../enums/estado-caso.enum';

export enum DecisionPropuestaVisita {
  Pendiente = 'Pendiente',
  Confirmada = 'Confirmada',
  Descartada = 'Descartada',
}

/** Propuesta trazable del técnico, pendiente de la autoridad que corresponda. */
@Entity('propuestas_visita')
@Index(['visita_id', 'creado_en'])
@Index(['decision', 'creado_en'])
export class PropuestaVisita {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  visita_id: number;

  @Column({ type: 'varchar', length: 50 })
  estado_propuesto: EstadoCaso;

  @Column({ type: 'text' })
  comentario: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  entidad_destino: string | null;

  @Column({ type: 'int', nullable: true })
  categoria_rechazo_id: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  evidencia_url: string | null;

  @Column({ type: 'int' })
  propuesto_por_usuario_id: number;

  @Column({ type: 'varchar', length: 20, default: DecisionPropuestaVisita.Pendiente })
  decision: DecisionPropuestaVisita;

  @Column({ type: 'int', nullable: true })
  decidido_por_usuario_id: number | null;

  @Column({ type: 'text', nullable: true })
  motivo_decision: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  decidida_en: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}
