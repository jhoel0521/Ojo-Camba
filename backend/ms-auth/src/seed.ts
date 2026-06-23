import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthService } from './auth.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);

  const email = 'admin@ojocamba.bo';
  const password = 'admin123';
  const roles = ['admin', 'moderador'];

  console.log('Creando usuario admin...');

  try {
    const existing = await authService['usuarioRepo'].findOne({ where: { email } });
    if (existing) {
      await authService['usuarioRolRepo'].delete({ usuario_id: existing.id });
      await authService['usuarioRepo'].delete({ id: existing.id });
    }

    const result = await authService.register({ nombre: 'Administrador', email, password });
    const userId = result.user.id;

    for (const rolNombre of roles) {
      const rol = await authService['rolRepo'].findOne({ where: { nombre: rolNombre } });
      if (rol) {
        const ur = authService['usuarioRolRepo'].create({ usuario_id: userId, rol_id: rol.id });
        await authService['usuarioRolRepo'].save(ur);
      }
    }

    console.log(`Usuario creado: ${email} / ${password}`);
    console.log(`Roles: ${roles.join(', ')}`);
  } catch (e) {
    console.error('Error:', e.message);
  }

  await app.close();
}

bootstrap();
