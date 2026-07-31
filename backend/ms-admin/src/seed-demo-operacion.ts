import { NestFactory } from '@nestjs/core';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import {
  ActualizacionCaso,
  Cuadrilla,
  CuadrillaMiembro,
  EstadoCaso,
  EstadoReporte,
  GrupoReporte,
  Reporte,
  Usuario,
  VisitaCaso,
} from '@ojo-camba/common';
import { AppModule } from './app.module';
import { construirAsignacionesJornadaDemo, validarFechaJornada } from './demo-operacion/jornada';

const NOMBRE_CUADRILLA = 'Cuadrilla Demo Ojo Camba';
const EMAIL_ADMIN = 'admin@ojocamba.bo';
const EMAIL_RESPONSABLE = 'jefe.cuadrilla@ojocamba.bo';
const EMAILS_TECNICOS = [EMAIL_RESPONSABLE, 'tecnico.1@ojocamba.bo', 'tecnico.2@ojocamba.bo'];
const TOTAL_CASOS = 6;

function leerFecha(): string {
  const indice = process.argv.indexOf('--fecha');
  return validarFechaJornada(indice >= 0 ? process.argv[indice + 1] : undefined);
}

async function usuariosDemo(manager: EntityManager) {
  const usuarios = await manager.getRepository(Usuario).find({
    where: EMAILS_TECNICOS.concat(EMAIL_ADMIN).map((email) => ({ email })),
  });
  const porEmail = new Map(usuarios.map((usuario) => [usuario.email, usuario]));
  const faltantes = EMAILS_TECNICOS.concat(EMAIL_ADMIN).filter((email) => !porEmail.has(email));
  if (faltantes.length > 0) {
    throw new Error(
      `Faltan las cuentas demo (${faltantes.join(', ')}). Ejecuta primero: pnpm db:seed:auth`,
    );
  }
  return porEmail;
}

async function asegurarCuadrilla(manager: EntityManager, responsables: Map<string, Usuario>) {
  const cuadrillaRepo = manager.getRepository(Cuadrilla);
  let cuadrilla = await cuadrillaRepo.findOne({ where: { nombre: NOMBRE_CUADRILLA } });
  if (!cuadrilla) {
    cuadrilla = cuadrillaRepo.create({
      nombre: NOMBRE_CUADRILLA,
      especialidad_id: null,
      activa: true,
      lat_base: -17.7833,
      lng_base: -63.1821,
    });
  } else {
    cuadrilla.activa = true;
    cuadrilla.lat_base = -17.7833;
    cuadrilla.lng_base = -63.1821;
  }
  cuadrilla = await cuadrillaRepo.save(cuadrilla);

  const miembroRepo = manager.getRepository(CuadrillaMiembro);
  for (const email of EMAILS_TECNICOS) {
    const usuario = responsables.get(email)!;
    await miembroRepo.save(
      miembroRepo.create({
        cuadrilla_id: cuadrilla.id,
        usuario_id: usuario.id,
        es_responsable: email === EMAIL_RESPONSABLE,
      }),
    );
  }
  return cuadrilla;
}

async function asegurarCasosJornada(
  manager: EntityManager,
  fecha: string,
  cuadrillaId: number,
  administradorId: number,
) {
  const grupoRepo = manager.getRepository(GrupoReporte);
  const reporteRepo = manager.getRepository(Reporte);
  const prefijo = `DEMO-${fecha.replaceAll('-', '')}-`;
  const existentes = await grupoRepo
    .createQueryBuilder('grupo')
    .where('grupo.codigo_obra LIKE :prefijo', { prefijo: `${prefijo}%` })
    .orderBy('grupo.codigo_obra', 'ASC')
    .getMany();

  if (existentes.length >= TOTAL_CASOS) return existentes.slice(0, TOTAL_CASOS);

  const fuentes = await reporteRepo.find({
    where: { grupo_id: IsNull() },
    take: TOTAL_CASOS * 2,
    order: { creado_en: 'DESC' },
  });
  const fuentesDisponibles =
    fuentes.length > 0
      ? fuentes
      : await reporteRepo.find({ take: TOTAL_CASOS * 2, order: { creado_en: 'DESC' } });
  if (fuentesDisponibles.length === 0) {
    throw new Error(
      'No hay reportes históricos para construir la jornada. Ejecuta primero el simulador histórico.',
    );
  }

  const casos = [...existentes];
  for (let indice = existentes.length; indice < TOTAL_CASOS; indice += 1) {
    const fuenteA = fuentesDisponibles[(indice * 2) % fuentesDisponibles.length];
    const fuenteB = fuentesDisponibles[(indice * 2 + 1) % fuentesDisponibles.length];
    const grupo = await grupoRepo.save(
      grupoRepo.create({
        codigo_obra: `${prefijo}${String(indice + 1).padStart(2, '0')}`,
        estado_actual: EstadoCaso.PlanificadoVisita,
        fecha_estimada_fin: fecha,
        creado_por_usuario_id: administradorId,
        categoria_id: fuenteA.categoria_id,
        cuadrilla_id: cuadrillaId,
        prioridad: indice < 2 ? 1 : 3,
      }),
    );
    for (const [posicion, fuente] of [fuenteA, fuenteB].entries()) {
      await reporteRepo.save(
        reporteRepo.create({
          device_id: `demo-jornada-${fecha}-${indice + 1}-${posicion + 1}`,
          usuario_id: null,
          categoria_id: fuente.categoria_id,
          grupo_id: grupo.id,
          lat: Number(fuente.lat) + posicion * 0.00005,
          lng: Number(fuente.lng) + posicion * 0.00005,
          h3_res_8: fuente.h3_res_8,
          h3_res_11: fuente.h3_res_11,
          h3_res_13: fuente.h3_res_13,
          estado: EstadoReporte.Aceptado,
          gravedad: fuente.gravedad,
          url_imagen: fuente.url_imagen,
        }),
      );
    }
    casos.push(grupo);
  }
  return casos;
}

async function ejecutar(fecha: string) {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const dataSource = app.get(DataSource);
  try {
    const resumen = await dataSource.transaction(async (manager) => {
      const usuarios = await usuariosDemo(manager);
      const cuadrilla = await asegurarCuadrilla(manager, usuarios);
      const casos = await asegurarCasosJornada(
        manager,
        fecha,
        cuadrilla.id,
        usuarios.get(EMAIL_ADMIN)!.id,
      );
      const visitaRepo = manager.getRepository(VisitaCaso);
      const actualizacionRepo = manager.getRepository(ActualizacionCaso);
      const asignaciones = construirAsignacionesJornadaDemo(casos.length);

      for (const [indice, caso] of casos.entries()) {
        const asignacion = asignaciones[indice];
        const tecnico = usuarios.get(asignacion.emailTecnico)!;
        let visita = await visitaRepo.findOne({
          where: { grupo_id: caso.id, cerrada_en: IsNull() },
        });
        if (!visita) {
          visita = visitaRepo.create({ grupo_id: caso.id, cuadrilla_id: cuadrilla.id });
        }
        visita.cuadrilla_id = cuadrilla.id;
        visita.tecnico_id = tecnico.id;
        visita.asignado_por_usuario_id = usuarios.get(EMAIL_RESPONSABLE)!.id;
        visita.fecha_planificada = fecha;
        visita.orden_ruta = asignacion.ordenRuta;
        await visitaRepo.save(visita);

        caso.cuadrilla_id = cuadrilla.id;
        caso.estado_actual =
          indice === 0 ? EstadoCaso.ValidacionCampo : EstadoCaso.PlanificadoVisita;
        await manager.getRepository(GrupoReporte).save(caso);
        const comentario = `Jornada demo ${fecha}: parada ${asignacion.ordenRuta} asignada a ${tecnico.nombre}.`;
        const trazabilidadExistente = await actualizacionRepo.findOne({
          where: { grupo_id: caso.id, comentario },
        });
        if (!trazabilidadExistente) {
          await actualizacionRepo.save(
            actualizacionRepo.create({
              grupo_id: caso.id,
              usuario_id: usuarios.get(EMAIL_RESPONSABLE)!.id,
              comentario,
              estado_anterior: null,
              estado_nuevo: null,
            }),
          );
        }
      }
      return { cuadrilla, casos: casos.length, visitas: asignaciones.length };
    });
    console.log(`Jornada demo lista para ${fecha}.`);
    console.log(`Cuadrilla: ${resumen.cuadrilla.nombre} (#${resumen.cuadrilla.id}).`);
    console.log(`Casos: ${resumen.casos}; visitas asignadas: ${resumen.visitas}.`);
    console.log(
      'Cuentas: jefe.cuadrilla@ojocamba.bo, tecnico.1@ojocamba.bo y tecnico.2@ojocamba.bo (cuadrilla123).',
    );
  } finally {
    await app.close();
  }
}

async function main() {
  await ejecutar(leerFecha());
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(
      `Seed de jornada demo falló: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
}
