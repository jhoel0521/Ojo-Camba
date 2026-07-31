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
  const usuario = await authService.asegurarUsuarioDemo({ nombre, email, password, roles });
  console.log(`Usuario listo: ${email} / ${password} (#${usuario.id}; roles: ${roles.join(', ')})`);
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);

  try {
    await crearUsuario(authService, 'Administrador Ojo Camba', 'admin@ojocamba.bo', 'admin123', [
      'backoffice',
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
    await crearUsuario(
      authService,
      'Responsable Cuadrilla Demo',
      'jefe.cuadrilla@ojocamba.bo',
      'cuadrilla123',
      ['tecnico'],
    );
    await crearUsuario(authService, 'Técnico Demo Uno', 'tecnico.1@ojocamba.bo', 'cuadrilla123', [
      'tecnico',
    ]);
    await crearUsuario(authService, 'Técnico Demo Dos', 'tecnico.2@ojocamba.bo', 'cuadrilla123', [
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
