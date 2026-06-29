import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Usuario, UsuarioRol, Rol, RefreshToken } from '@ojo-camba/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly REFRESH_TOKEN_DAYS = 30;

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolRepo: Repository<UsuarioRol>,
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usuarioRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('El email ya esta registrado');
    }

    const password_hash = await bcrypt.hash(dto.password, 10);
    const usuario = this.usuarioRepo.create({
      nombre: dto.nombre,
      email: dto.email,
      password_hash,
    });
    await this.usuarioRepo.save(usuario);

    const ciudadanoRol = await this.rolRepo.findOne({ where: { nombre: 'ciudadano' } });
    if (ciudadanoRol) {
      const ur = this.usuarioRolRepo.create({ usuario_id: usuario.id, rol_id: ciudadanoRol.id });
      await this.usuarioRolRepo.save(ur);
    }

    const tokens = await this.generateTokens(usuario.id);

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: { id: usuario.id, nombre: usuario.nombre, email: usuario.email },
    };
  }

  async login(dto: LoginDto) {
    const usuario = await this.usuarioRepo.findOne({ where: { email: dto.email } });
    if (!usuario || !usuario.password_hash) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const valid = await bcrypt.compare(dto.password, usuario.password_hash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const tokens = await this.generateTokens(usuario.id);

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: { id: usuario.id, nombre: usuario.nombre, email: usuario.email },
    };
  }

  async refresh(refreshToken: string) {
    const stored = await this.refreshTokenRepo.findOne({
      where: { token: refreshToken },
      relations: ['usuario'],
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token invalido');
    }

    if (stored.revoked) {
      await this.revokeAllForUser(stored.usuario_id);
      throw new UnauthorizedException('Refresh token revocado');
    }

    if (new Date() > stored.expires_at) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    stored.revoked = true;
    await this.refreshTokenRepo.save(stored);

    return this.generateTokens(stored.usuario_id);
  }

  async logout(userId: number) {
    await this.revokeAllForUser(userId);
    return { ok: true };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const roles = await this.usuarioRolRepo.find({
        where: { usuario_id: payload.sub },
        relations: ['rol'],
      });

      return {
        valid: true,
        user_id: payload.sub,
        email: payload.email,
        roles: roles.map((r) => r.rol.nombre),
      };
    } catch {
      return { valid: false, user_id: null, email: null, roles: [] };
    }
  }

  async getProfile(userId: number) {
    const usuario = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const roles = await this.usuarioRolRepo.find({
      where: { usuario_id: userId },
      relations: ['rol'],
    });

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      puntos: usuario.puntos,
      nivel_id: usuario.nivel_id,
      roles: roles.map((r) => r.rol.nombre),
      creado_en: usuario.creado_en,
    };
  }

  async addPoints(userId: number, puntos: number) {
    const usuario = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.usuarioRepo.increment({ id: userId }, 'puntos', puntos);
    const actualizado = await this.usuarioRepo.findOne({ where: { id: userId } });

    return { user_id: userId, puntos: actualizado!.puntos, nivel_id: actualizado!.nivel_id };
  }

  async updateLevel(userId: number, nivelId: number) {
    const usuario = await this.usuarioRepo.findOne({ where: { id: userId } });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    usuario.nivel_id = nivelId;
    await this.usuarioRepo.save(usuario);

    return { user_id: userId, nivel_id: nivelId };
  }

  private async generateTokens(userId: number) {
    const access_token = this.jwtService.sign({ sub: userId });

    const refreshValue = crypto.randomUUID();
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + this.REFRESH_TOKEN_DAYS);

    const rt = this.refreshTokenRepo.create({
      usuario_id: userId,
      token: refreshValue,
      expires_at,
    });
    await this.refreshTokenRepo.save(rt);

    return { access_token, refresh_token: refreshValue };
  }

  private async revokeAllForUser(userId: number) {
    await this.refreshTokenRepo.update({ usuario_id: userId, revoked: false }, { revoked: true });
  }

  async listUsers(page = 1, limit = 20, q?: string) {
    const where = q ? [{ nombre: ILike(`%${q}%`) }, { email: ILike(`%${q}%`) }] : undefined;

    const [data, total] = await this.usuarioRepo.findAndCount({
      select: ['id', 'nombre', 'email', 'puntos', 'nivel_id', 'creado_en'],
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { creado_en: 'DESC' },
    });

    const usuariosConRoles = await Promise.all(
      data.map(async (u) => {
        const roles = await this.usuarioRolRepo.find({
          where: { usuario_id: u.id },
          relations: ['rol'],
        });
        return { ...u, roles: roles.map((r) => r.rol.nombre) };
      }),
    );

    return { data: usuariosConRoles, total, page, limit };
  }

  async onModuleInit() {
    const roles = ['ciudadano', 'moderador', 'tecnico', 'admin'];
    for (const nombre of roles) {
      const exists = await this.rolRepo.findOne({ where: { nombre } });
      if (!exists) {
        await this.rolRepo.save(this.rolRepo.create({ nombre }));
      }
    }
  }
}
