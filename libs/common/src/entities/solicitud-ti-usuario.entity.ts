import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Detalle inmutable de los roles que una solicitud TI modificó por persona. */
@Entity('solicitud_ti_usuarios')
export class SolicitudTiUsuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  solicitud_id: number;

  @Column({ type: 'int' })
  usuario_id: number;

  @Column({ type: 'jsonb' })
  roles_antes: string[];

  @Column({ type: 'jsonb' })
  roles_despues: string[];

  @Column({ type: 'varchar', length: 20, nullable: true })
  participacion_cuadrilla: string | null;
}
