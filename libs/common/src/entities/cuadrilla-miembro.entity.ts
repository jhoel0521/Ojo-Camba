import { Entity, PrimaryColumn, Column, CreateDateColumn, Unique } from 'typeorm';

/** Vincula técnicos con una cuadrilla y designa, como máximo, un responsable. */
@Entity('cuadrilla_miembros')
@Unique(['cuadrilla_id', 'usuario_id'])
export class CuadrillaMiembro {
  @PrimaryColumn({ type: 'int' })
  cuadrilla_id: number;

  @PrimaryColumn({ type: 'int' })
  usuario_id: number;

  @Column({ type: 'boolean', default: false })
  es_responsable: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  creado_en: Date;
}
