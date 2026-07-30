import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ParametrosSimulador } from './domain';

export interface ConfiguracionSimulador extends ParametrosSimulador {
  apiUrl: string;
  databaseUrl: string;
  permitirImagenesPendientes: boolean;
  manifestPath: string;
  checkpointPath: string;
}

function cargarEnv(ruta: string): void {
  if (!existsSync(ruta)) return;
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const coincidencia = linea.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (coincidencia && !process.env[coincidencia[1]]) {
      process.env[coincidencia[1]] = coincidencia[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const FLAGS_BOOLEANAS = new Set(['permitir-base-local', 'permitir-imagenes-pendientes']);

export function parsearFlags(argv: string[]): Map<string, string> {
  const resultado = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const [clave, valorIncluido] = argv[i].slice(2).split('=', 2);
    if (FLAGS_BOOLEANAS.has(clave) && valorIncluido === undefined) {
      resultado.set(clave, 'true');
      continue;
    }
    const valor = valorIncluido ?? argv[i + 1];
    if (!valor || valor.startsWith('--')) throw new Error(`Falta valor para --${clave}`);
    if (!valorIncluido) i++;
    resultado.set(clave, valor);
  }
  return resultado;
}

function fecha(valor: string | undefined, nombre: string, defecto?: Date): Date {
  if (!valor && defecto) return defecto;
  if (!valor) throw new Error(`Falta --${nombre}`);
  const resultado = new Date(`${valor}T00:00:00.000Z`);
  if (Number.isNaN(resultado.getTime())) throw new Error(`Fecha inválida en --${nombre}: ${valor}`);
  return resultado;
}

function entero(valor: string | undefined, nombre: string, defecto: number): number {
  if (!valor) return defecto;
  const resultado = Number.parseInt(valor, 10);
  if (!Number.isFinite(resultado) || resultado < 0)
    throw new Error(`Número inválido en --${nombre}`);
  return resultado;
}

export function cargarConfiguracion(argv = process.argv.slice(2)): ConfiguracionSimulador {
  const raiz = resolve(__dirname, '../..');
  cargarEnv(resolve(raiz, '.env.simulador'));
  const opciones = parsearFlags(argv);
  const apiUrl = process.env.SIMULADOR_API_URL;
  const databaseUrl = process.env.SIMULADOR_DATABASE_URL;
  if (!apiUrl || !databaseUrl) {
    throw new Error('Define SIMULADOR_API_URL y SIMULADOR_DATABASE_URL en el .env del simulador.');
  }
  if (!esBaseSegura(databaseUrl, opciones.has('permitir-base-local'))) {
    throw new Error('SIMULADOR_DATABASE_URL debe apuntar explícitamente a una base demo o test.');
  }

  const hoy = fecha(opciones.get('hasta'), 'hasta', inicioDelDia(new Date()));
  const inicioPorDefecto = new Date(hoy);
  inicioPorDefecto.setUTCFullYear(inicioPorDefecto.getUTCFullYear() - 5);
  const semilla = opciones.get('seed') ?? 'ojo-camba-feria';
  return {
    apiUrl: apiUrl.replace(/\/$/, ''),
    databaseUrl,
    permitirImagenesPendientes: opciones.has('permitir-imagenes-pendientes'),
    inicio: fecha(opciones.get('inicio'), 'inicio', inicioPorDefecto),
    hoy,
    semilla,
    ritmoMs: entero(opciones.get('ritmo-ms'), 'ritmo-ms', 80),
    maxReportesDia: entero(opciones.get('max-reportes-dia'), 'max-reportes-dia', 100),
    manifestPath: resolve(
      opciones.get('manifest') ?? 'assets/simulador-historico/imagenes/manifest-images.json',
    ),
    checkpointPath: resolve(
      opciones.get('checkpoint') ?? `var/simulador/checkpoints/${identificador(semilla)}.json`,
    ),
  };
}

export function identificador(semilla: string): string {
  const limpio = semilla
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return limpio.slice(0, 36) || 'feria';
}

/** Mantiene la protección para demo/producción; el escape es solo una flag local explícita. */
export function esBaseSegura(databaseUrl: string, permitirBaseLocal = false): boolean {
  return permitirBaseLocal || /demo|test/i.test(databaseUrl);
}

function inicioDelDia(valor: Date): Date {
  return new Date(Date.UTC(valor.getUTCFullYear(), valor.getUTCMonth(), valor.getUTCDate()));
}
