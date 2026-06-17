import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Rol } from './rol.entity';

@Entity('usuario_roles')
export class UsuarioRol {
  @PrimaryColumn({ type: 'int' })
  usuario_id: number;

  @PrimaryColumn({ type: 'int' })
  rol_id: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @ManyToOne(() => Rol)
  @JoinColumn({ name: 'rol_id' })
  rol: Rol;
}
