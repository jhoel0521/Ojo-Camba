import { cargarConfiguracion, identificador } from './config';
import { leerCheckpoint } from './checkpoint';
import { ApiOjoCamba } from './api';
import { Historiador } from './historiador';
import { cargarManifest } from './manifest';
import { SimuladorHistorico } from './simulador';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

async function main(): Promise<void> {
  const configuracion = cargarConfiguracion();
  const checkpoint = await leerCheckpoint(configuracion.checkpointPath);
  const corridaId = identificador(configuracion.semilla);
  if (checkpoint && checkpoint.corridaId !== corridaId) {
    throw new Error(
      `El checkpoint ${configuracion.checkpointPath} pertenece a "${checkpoint.corridaId}", no a "${corridaId}". ` +
        'Usa un checkpoint de la misma corrida o elimínalo explícitamente.',
    );
  }
  const api = new ApiOjoCamba(configuracion.apiUrl);
  const historiador = new Historiador(configuracion.databaseUrl);

  try {
    await api.verificarSalud();
    await historiador.iniciar();
    const [manifest, actores] = await Promise.all([
      cargarManifest(configuracion.manifestPath, configuracion.permitirImagenesPendientes),
      api.iniciarActoresDemo(),
    ]);
    const simulador = new SimuladorHistorico({
      api,
      historiador,
      actores,
      manifest,
      manifestPath: configuracion.manifestPath,
      parametros: configuracion,
      checkpointPath: configuracion.checkpointPath,
      corridaId,
    });
    const resumen = await simulador.ejecutar(checkpoint);
    const reporte = await historiador.generarReporte(corridaId);
    const rutaReporte = resolve(
      dirname(configuracion.checkpointPath),
      `simulacion-${corridaId}.json`,
    );
    await writeFile(rutaReporte, `${JSON.stringify({ resumen, ...reporte }, null, 2)}\n`, 'utf8');
    console.log(`Simulación ${corridaId} completada:`, resumen);
    console.log(`Reporte de validación: ${rutaReporte}`);
  } catch (error) {
    if (!checkpoint) {
      await historiador.limpiarCorrida(`sim-${corridaId}-`);
    }
    throw error;
  } finally {
    await historiador.cerrar();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
