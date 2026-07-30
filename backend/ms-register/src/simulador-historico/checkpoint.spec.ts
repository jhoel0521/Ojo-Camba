import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Checkpoint, guardarCheckpoint } from './checkpoint';

describe('checkpoint del simulador', () => {
  it('crea la carpeta de checkpoints cuando aún no existe', async () => {
    const directorioTemporal = await mkdtemp(join(tmpdir(), 'ojo-camba-checkpoint-'));
    const ruta = join(directorioTemporal, 'var', 'simulador', 'checkpoints', 'feria.json');
    const checkpoint: Checkpoint = {
      version: 1,
      corridaId: 'feria',
      ultimaFecha: '2026-07-30T00:00:00.000Z',
      cuadrillas: [],
      cargaPorCuadrilla: [],
      cola: [],
      resumen: { reportes: 3, grupos: 1, finalizados: 1, derivados: 0, rechazados: 0 },
    };

    try {
      await guardarCheckpoint(ruta, checkpoint);
      await expect(readFile(ruta, 'utf8')).resolves.toContain('"corridaId": "feria"');
    } finally {
      await rm(directorioTemporal, { recursive: true, force: true });
    }
  });
});
