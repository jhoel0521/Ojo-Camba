import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthService } from './auth.service';

const REQUIRED_CONFIRMATION = 'CREATE_INITIAL_ADMIN';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} es obligatoria.`);
  return value;
}

async function bootstrap() {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error('Este bootstrap sólo se permite con NODE_ENV=production.');
  }
  if (process.env.BOOTSTRAP_ADMIN_CONFIRM !== REQUIRED_CONFIRMATION) {
    throw new Error(`Definí BOOTSTRAP_ADMIN_CONFIRM=${REQUIRED_CONFIRMATION} para continuar.`);
  }

  required('DATABASE_URL');
  const nombre = required('BOOTSTRAP_ADMIN_NAME');
  const email = required('BOOTSTRAP_ADMIN_EMAIL').toLowerCase();
  const password = required('BOOTSTRAP_ADMIN_PASSWORD');
  if (password.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD debe tener al menos 12 caracteres.');
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);

  try {
    const usuarioRepo = authService['usuarioRepo'];
    const usuarioRolRepo = authService['usuarioRolRepo'];
    const rolRepo = authService['rolRepo'];
    const existing = await usuarioRepo.findOne({ where: { email } });
    if (existing) throw new Error('El administrador inicial ya existe; no se modificó.');

    const roles = await rolRepo.find({ where: [{ nombre: 'admin' }, { nombre: 'moderador' }] });
    if (roles.length !== 2) throw new Error('No se pudieron inicializar los roles requeridos.');

    const result = await authService.register({ nombre, email, password });
    await usuarioRolRepo.save(
      roles.map((rol) => usuarioRolRepo.create({ usuario_id: result.user.id, rol_id: rol.id })),
    );
    console.log('Administrador inicial creado correctamente.');
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error(`Bootstrap falló: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
