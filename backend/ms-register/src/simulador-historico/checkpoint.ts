import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

export interface CasoEnCola {
  grupoId: number;
  cuadrillaId: number | null;
  categoriaId: number;
  reportes: number;
  estado: 'Aceptado' | 'ValidacionEnCampo' | 'EnTrabajo';
  destino: string | null;
  motivo: string;
  lat: number;
  lng: number;
}

export interface Checkpoint {
  version: 1;
  corridaId: string;
  ultimaFecha: string;
  cuadrillas: number[];
  cargaPorCuadrilla: Array<[number, number]>;
  cola: CasoEnCola[];
  resumen: {
    reportes: number;
    grupos: number;
    finalizados: number;
    derivados: number;
    rechazados: number;
  };
}

export async function leerCheckpoint(ruta: string): Promise<Checkpoint | null> {
  if (!existsSync(ruta)) return null;
  return JSON.parse(await readFile(ruta, 'utf8')) as Checkpoint;
}

export async function guardarCheckpoint(ruta: string, checkpoint: Checkpoint): Promise<void> {
  await mkdir(dirname(ruta), { recursive: true });
  return writeFile(ruta, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
}
