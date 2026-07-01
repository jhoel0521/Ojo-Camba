import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Usuario, UsuarioRol, Rol, RefreshToken } from '@ojo-camba/common';
import { AuthService } from './auth.service';

function makeRepoMock() {
  return {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    findAndCount: jest.fn(),
    create: jest.fn((x) => x),
    // Simula que TypeORM muta la entidad en sitio al asignar el id generado.
    save: jest.fn((x) => {
      if (x && x.id == null) x.id = 1;
      return Promise.resolve(x);
    }),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    increment: jest.fn().mockResolvedValue(undefined),
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let usuarioRepo: ReturnType<typeof makeRepoMock>;
  let rolRepo: ReturnType<typeof makeRepoMock>;
  let usuarioRolRepo: ReturnType<typeof makeRepoMock>;
  let refreshTokenRepo: ReturnType<typeof makeRepoMock>;

  beforeEach(async () => {
    usuarioRepo = makeRepoMock();
    rolRepo = makeRepoMock();
    usuarioRolRepo = makeRepoMock();
    refreshTokenRepo = makeRepoMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Usuario), useValue: usuarioRepo },
        { provide: getRepositoryToken(UsuarioRol), useValue: usuarioRolRepo },
        { provide: getRepositoryToken(Rol), useValue: rolRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
        { provide: JwtService, useValue: new JwtService({ secret: 'test-secret' }) },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('register', () => {
    it('rechaza email ya registrado', async () => {
      usuarioRepo.findOne.mockResolvedValue({ id: 1, email: 'a@a.com' });
      await expect(
        service.register({ nombre: 'A', email: 'a@a.com', password: 'secret123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('hashea el password y asigna el rol ciudadano', async () => {
      usuarioRepo.findOne.mockResolvedValue(null);
      rolRepo.findOne.mockResolvedValue({ id: 3, nombre: 'ciudadano' });

      const result = await service.register({
        nombre: 'A',
        email: 'a@a.com',
        password: 'secret123',
      });

      const savedUser = usuarioRepo.save.mock.calls[0][0];
      expect(savedUser.password_hash).not.toBe('secret123');
      expect(await bcrypt.compare('secret123', savedUser.password_hash)).toBe(true);
      expect(usuarioRolRepo.save).toHaveBeenCalledWith(expect.objectContaining({ rol_id: 3 }));
      expect(result.access_token).toBeTruthy();
      expect(result.refresh_token).toBeTruthy();
    });
  });

  describe('login', () => {
    it('rechaza credenciales con email inexistente', async () => {
      usuarioRepo.findOne.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'secret123' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rechaza password incorrecto', async () => {
      const hash = await bcrypt.hash('correcto123', 10);
      usuarioRepo.findOne.mockResolvedValue({ id: 1, email: 'a@a.com', password_hash: hash });
      await expect(service.login({ email: 'a@a.com', password: 'incorrecto' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('genera tokens con credenciales validas', async () => {
      const hash = await bcrypt.hash('secret123', 10);
      usuarioRepo.findOne.mockResolvedValue({
        id: 1,
        nombre: 'A',
        email: 'a@a.com',
        password_hash: hash,
      });

      const result = await service.login({ email: 'a@a.com', password: 'secret123' });

      expect(result.access_token).toBeTruthy();
      expect(refreshTokenRepo.save).toHaveBeenCalled();
    });
  });

  describe('validateToken', () => {
    it('token valido devuelve los roles del usuario', async () => {
      const tokens = await (
        service as unknown as { generateTokens: (id: number) => Promise<{ access_token: string }> }
      ).generateTokens(1);
      usuarioRolRepo.find.mockResolvedValue([{ rol: { nombre: 'moderador' } }]);

      const result = await service.validateToken(tokens.access_token);

      expect(result.valid).toBe(true);
      expect(result.user_id).toBe(1);
      expect(result.roles).toEqual(['moderador']);
    });

    it('token invalido devuelve valid:false sin lanzar excepcion', async () => {
      const result = await service.validateToken('token-malformado');
      expect(result).toEqual({ valid: false, user_id: null, email: null, roles: [] });
    });
  });
});
