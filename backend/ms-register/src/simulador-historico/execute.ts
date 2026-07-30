import { cargarConfiguracion, identificador } from './config';
import { leerCheckpoint } from './checkpoint';
import { ApiOjoCamba } from './api';
import { Historiador } from './historiador';
import { cargarManifest } from './manifest';
import { SimuladorHistorico } from './simulador';

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
    console.log(`Simulación ${corridaId} completada.`);
    console.table([
      { métrica: 'Reportes creados', total: resumen.reportes },
      { métrica: 'Casos de obra', total: resumen.grupos },
      { métrica: 'Casos finalizados', total: resumen.finalizados },
      { métrica: 'Casos derivados', total: resumen.derivados },
      { métrica: 'Reportes rechazados', total: resumen.rechazados },
      { métrica: 'Alertas de capacidad', total: reporte.alertasCapacidad },
    ]);
    console.table(reporte.porEstado);
    console.log(`Checkpoint de reanudación: ${configuracion.checkpointPath}`);
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
