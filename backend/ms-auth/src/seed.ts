import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthService } from './auth.service';

async function crearUsuario(
  authService: AuthService,
  nombre: string,
  email: string,
  password: string,
  roles: string[],
) {
  const existing = await authService['usuarioRepo'].findOne({ where: { email } });
  if (existing) {
    await authService['usuarioRolRepo'].delete({ usuario_id: existing.id });
    await authService['usuarioRepo'].delete({ id: existing.id });
  }

  const result = await authService.register({ nombre, email, password });
  const userId = result.user.id;

  for (const rolNombre of roles) {
    const rol = await authService['rolRepo'].findOne({ where: { nombre: rolNombre } });
    if (rol) {
      const ur = authService['usuarioRolRepo'].create({ usuario_id: userId, rol_id: rol.id });
      await authService['usuarioRolRepo'].save(ur);
    }
  }

  console.log(`Usuario creado: ${email} / ${password} (roles: ${roles.join(', ')})`);
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);

  try {
    await crearUsuario(authService, 'Operador Demo', 'admin@ojocamba.bo', 'admin123', [
      'backoffice',
      'tecnico',
      'coordinador_operativo',
      'encargado_it',
    ]);
    // Segundo moderador (para el sistema de claim / moderación concurrente).
    await crearUsuario(authService, 'Moderador Dos', 'moderador2@ojocamba.bo', 'mod123', [
      'backoffice',
    ]);
    await crearUsuario(authService, 'Técnico Municipal', 'tecnico@ojocamba.bo', 'tec123', [
      'tecnico',
    ]);
    // Usuario de demo pública — credenciales conocidas para la presentación final.
    await crearUsuario(
      authService,
      'Coordinadora Operativa',
      'coordinador@ojocamba.bo',
      'coord123',
      ['coordinador_operativo'],
    );
    await crearUsuario(authService, 'Encargada IT', 'it@ojocamba.bo', 'it123', ['encargado_it']);
    await crearUsuario(
      authService,
      'Autoridad Municipal',
      'autoridad@ojocamba.bo',
      'autoridad123',
      ['autoridad_municipal'],
    );
  } catch (e) {
    console.error('Error:', (e as Error).message);
  }

  await app.close();
}

bootstrap();
