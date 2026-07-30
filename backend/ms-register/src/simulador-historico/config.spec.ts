import { cargarConfiguracion, esBaseSegura, parsearFlags } from './config';

describe('protección de base de datos del simulador', () => {
  const entornoOriginal = {
    apiUrl: process.env.SIMULADOR_API_URL,
    databaseUrl: process.env.SIMULADOR_DATABASE_URL,
  };

  beforeEach(() => {
    process.env.SIMULADOR_API_URL = 'http://localhost:3000';
    process.env.SIMULADOR_DATABASE_URL = 'postgresql://localhost/ojo_camba_demo';
  });

  afterEach(() => {
    restaurarVariable('SIMULADOR_API_URL', entornoOriginal.apiUrl);
    restaurarVariable('SIMULADOR_DATABASE_URL', entornoOriginal.databaseUrl);
  });

  it('acepta bases demo/test por defecto', () => {
    expect(esBaseSegura('postgresql://localhost/ojo_camba_demo')).toBe(true);
    expect(esBaseSegura('postgresql://localhost/ojo_camba_test')).toBe(true);
  });

  it('solo permite una base local común con la flag explícita', () => {
    expect(esBaseSegura('postgresql://localhost/ojocamba')).toBe(false);
    expect(esBaseSegura('postgresql://localhost/ojocamba', true)).toBe(true);
  });

  it('acepta flags booleanas sin exigirles un valor', () => {
    const flags = parsearFlags(['--permitir-base-local', '--permitir-imagenes-pendientes']);
    expect(flags.get('permitir-base-local')).toBe('true');
    expect(flags.get('permitir-imagenes-pendientes')).toBe('true');
  });

  it('guarda el checkpoint de cada semilla en la carpeta ignorada del simulador', () => {
    const configuracion = cargarConfiguracion([
      '--seed',
      'feria-2026',
      '--inicio',
      '2020-07-29',
      '--hasta',
      '2026-07-29',
      '--permitir-base-local',
    ]);

    expect(configuracion.checkpointPath).toMatch(
      /var[\\/]simulador[\\/]checkpoints[\\/]feria-2026\.json$/,
    );
  });
});

function restaurarVariable(nombre: string, valorOriginal: string | undefined): void {
  if (valorOriginal === undefined) delete process.env[nombre];
  else process.env[nombre] = valorOriginal;
}
