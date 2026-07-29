import { basename, dirname } from 'node:path';
import { ApiOjoCamba, Actores } from './api';
import { Azar } from './azar';
import { evaluarCapacidad, META_VISITAS_DIARIAS } from './capacidad';
import { CasoEnCola, Checkpoint, guardarCheckpoint } from './checkpoint';
import { demandaDelDia } from './demanda';
import { Categoria, ImagenManifest, ManifestImagenes, ParametrosSimulador } from './domain';
import { EventosDelDia, Historiador } from './historiador';
import { imagenesDisponibles } from './manifest';

interface Resumen {
  reportes: number;
  grupos: number;
  finalizados: number;
  derivados: number;
  rechazados: number;
}

interface Dependencias {
  api: ApiOjoCamba;
  historiador: Historiador;
  actores: Actores;
  manifest: ManifestImagenes;
  manifestPath: string;
  parametros: ParametrosSimulador;
  checkpointPath: string;
  corridaId: string;
}

interface CuadrillaExistente {
  id: number;
  nombre: string;
}

const ESTADOS_SIGUIENTES: Record<CasoEnCola['estado'], CasoEnCola['estado'] | 'Finalizado'> = {
  Aceptado: 'ValidacionEnCampo',
  ValidacionEnCampo: 'EnTrabajo',
  EnTrabajo: 'Finalizado',
};

export class SimuladorHistorico {
  private readonly azar: Azar;
  private readonly directorioImagenes: string;
  private readonly categorias = new Map<Categoria, number>();
  private cola: CasoEnCola[] = [];
  private cuadrillas: number[] = [];
  private readonly cargaPorCuadrilla = new Map<number, number>();
  private resumen: Resumen = {
    reportes: 0,
    grupos: 0,
    finalizados: 0,
    derivados: 0,
    rechazados: 0,
  };

  constructor(private readonly deps: Dependencias) {
    this.azar = new Azar(deps.parametros.semilla);
    this.directorioImagenes = dirname(deps.manifestPath);
  }

  async ejecutar(checkpoint: Checkpoint | null): Promise<Resumen> {
    for (const [nombre, id] of await this.deps.historiador.categorias()) {
      this.categorias.set(nombre as Categoria, id);
    }
    if (checkpoint) {
      const proximaFecha = sumarDias(new Date(checkpoint.ultimaFecha), 1);
      await this.deps.historiador.limpiarDiaParcial(
        `sim-${this.deps.corridaId}-${proximaFecha.toISOString().slice(0, 10)}-`,
      );
    }
    this.restaurar(checkpoint);
    await this.reconciliarColaConEstadoPersistido();
    await this.asegurarCuadrillas();

    let fecha = checkpoint
      ? sumarDias(new Date(checkpoint.ultimaFecha), 1)
      : this.deps.parametros.inicio;
    while (fecha <= this.deps.parametros.hoy) {
      const eventos: EventosDelDia = {
        reportes: [],
        grupos: [],
        actualizaciones: [],
        derivaciones: [],
      };
      await this.crearYTriarDia(fecha, eventos);
      await this.visitarCola(fecha, eventos);
      await this.deps.historiador.fechar(eventos, fecha);
      await guardarCheckpoint(this.deps.checkpointPath, this.snapshot(fecha));
      if (this.deps.parametros.ritmoMs > 0) await pausa(this.deps.parametros.ritmoMs);
      fecha = sumarDias(fecha, 1);
    }
    return this.resumen;
  }

  private restaurar(checkpoint: Checkpoint | null): void {
    if (!checkpoint) return;
    this.cola = checkpoint.cola;
    this.cuadrillas = checkpoint.cuadrillas;
    for (const [cuadrillaId, carga] of checkpoint.cargaPorCuadrilla ?? []) {
      this.cargaPorCuadrilla.set(cuadrillaId, carga);
    }
    this.resumen = checkpoint.resumen;
  }

  private async reconciliarColaConEstadoPersistido(): Promise<void> {
    if (this.cola.length === 0) return;

    const colaReconciliada: CasoEnCola[] = [];
    for (const caso of this.cola) {
      const grupo = await this.deps.api.obtenerGrupo(caso.grupoId, this.deps.actores.coordinador);
      if (grupo.estado_actual === 'Finalizado') continue;
      if (
        grupo.estado_actual === 'Aceptado' ||
        grupo.estado_actual === 'ValidacionEnCampo' ||
        grupo.estado_actual === 'EnTrabajo'
      ) {
        caso.estado = grupo.estado_actual;
      }
      colaReconciliada.push(caso);
    }
    this.cola = colaReconciliada;
    this.cargaPorCuadrilla.clear();
    for (const caso of this.cola) {
      if (caso.cuadrillaId !== null) {
        this.cargaPorCuadrilla.set(
          caso.cuadrillaId,
          (this.cargaPorCuadrilla.get(caso.cuadrillaId) ?? 0) + caso.reportes,
        );
      }
    }
  }

  private async asegurarCuadrillas(): Promise<void> {
    const existentes = await this.deps.api.listarCuadrillas(this.deps.actores.it);
    const recuperadas = cuadrillasDeCorrida(existentes, this.deps.corridaId);
    this.cuadrillas = [...new Set([...this.cuadrillas, ...recuperadas])];
    while (this.cuadrillas.length < 4) {
      const indice = this.cuadrillas.length + 1;
      const creada = await this.deps.api.crearCuadrilla(
        `Simulador ${this.deps.corridaId} - cuadrilla ${indice}`,
        this.deps.actores.it,
      );
      await this.deps.api.asignarTecnico(
        creada.id,
        this.deps.actores.tecnico,
        this.deps.actores.it,
      );
      this.cuadrillas.push(creada.id);
    }
  }

  private async crearYTriarDia(fecha: Date, eventos: EventosDelDia): Promise<void> {
    const demanda = demandaDelDia(fecha, this.deps.parametros, this.azar);
    const candidatos = imagenesDisponibles(this.deps.manifest, fecha.getUTCMonth() + 1);
    const reportes: Array<{
      id: number;
      imagen: ImagenManifest;
      zona: number;
      lat: number;
      lng: number;
    }> = [];
    let imagenViral: ImagenManifest | null = null;
    for (let indice = 0; indice < demanda.cantidad; indice++) {
      if (indice % 2 === 0) imagenViral = this.elegirImagen(candidatos, demanda.lluvioso);
      const imagen = imagenViral as ImagenManifest;
      const categoriaId = this.categorias.get(imagen.categoria);
      if (!categoriaId)
        throw new Error(`No existe la categoría ${imagen.categoria} en la base demo.`);
      const zona = Math.floor(indice / 2) % 12;
      const coordenada = coordenadaEnZona(zona, this.azar);
      const creada = await this.deps.api.crearReporte(
        imagen,
        this.directorioImagenes,
        categoriaId,
        `sim-${this.deps.corridaId}-${fecha.toISOString().slice(0, 10)}-${indice}`,
        coordenada.lat,
        coordenada.lng,
      );
      eventos.reportes.push(creada.id);
      reportes.push({ id: creada.id, imagen, zona, ...coordenada });
      this.resumen.reportes++;
    }

    const agrupables = new Map<string, typeof reportes>();
    for (const reporte of reportes) {
      if (reporte.imagen.triaje.resultado === 'rechazar') {
        await this.deps.api.rechazarReporte(reporte.id, this.deps.actores.backoffice);
        this.resumen.rechazados++;
        continue;
      }
      const clave = `${reporte.imagen.categoria}:${reporte.zona}`;
      agrupables.set(clave, [...(agrupables.get(clave) ?? []), reporte]);
    }

    for (const lote of agrupables.values()) {
      if (lote.length < 2) {
        const reporte = lote[0];
        await this.deps.api.aceptarReporte(
          reporte.id,
          this.deps.actores.backoffice,
          this.categorias.get(reporte.imagen.categoria) as number,
          reporte.imagen.triaje.gravedad,
        );
        continue;
      }
      const grupo = await this.deps.api.crearGrupo(
        lote.map((reporte) => reporte.id),
        this.deps.actores.backoffice,
        this.categorias.get(lote[0].imagen.categoria) as number,
      );
      eventos.grupos.push(grupo.id);
      this.cola.push({
        grupoId: grupo.id,
        cuadrillaId: null,
        categoriaId: this.categorias.get(lote[0].imagen.categoria) as number,
        reportes: lote.length,
        estado: 'Aceptado',
        destino:
          lote[0].imagen.triaje.resultado === 'derivar' ? lote[0].imagen.triaje.destino : null,
        motivo: lote[0].imagen.triaje.motivo,
        lat: lote[0].lat,
        lng: lote[0].lng,
      });
      this.resumen.grupos++;
    }
  }

  private async visitarCola(fecha: Date, eventos: EventosDelDia): Promise<void> {
    const visitadasPorCuadrilla = new Map<number, number>();
    for (const caso of [...this.cola]) {
      if (caso.cuadrillaId === null) await this.asignarCaso(caso, eventos);
      if (caso.cuadrillaId === null) continue;
      const visitas = visitadasPorCuadrilla.get(caso.cuadrillaId) ?? 0;
      if (visitas >= META_VISITAS_DIARIAS) continue;
      visitadasPorCuadrilla.set(caso.cuadrillaId, visitas + 1);
      if (caso.estado === 'EnTrabajo' && this.azar.siguiente() < 0.25) {
        const reencolado = await this.deps.api.actualizarCaso(
          caso.grupoId,
          this.deps.actores.tecnico,
          {
            comentario:
              'Visita realizada; se reencola para continuar el trabajo en la próxima jornada.',
            lat_actualizada: caso.lat,
            lng_actualizada: caso.lng,
          },
        );
        eventos.actualizaciones.push(reencolado.id);
        continue;
      }
      const siguiente = ESTADOS_SIGUIENTES[caso.estado];
      const actualizacion = await this.deps.api.actualizarCaso(
        caso.grupoId,
        this.deps.actores.tecnico,
        {
          comentario: `Simulación histórica: ${caso.motivo}`,
          estado_nuevo: siguiente,
          lat_actualizada: caso.lat,
          lng_actualizada: caso.lng,
        },
      );
      eventos.actualizaciones.push(actualizacion.id);
      if (siguiente === 'ValidacionEnCampo' && caso.destino) {
        const derivacion = await this.deps.api.derivarCaso(
          caso.grupoId,
          this.deps.actores.tecnico,
          caso.destino,
          caso.motivo,
        );
        eventos.derivaciones.push(derivacion.id);
        this.resumen.derivados++;
      }
      if (siguiente === 'Finalizado') {
        this.cola = this.cola.filter((pendiente) => pendiente.grupoId !== caso.grupoId);
        this.cargaPorCuadrilla.set(
          caso.cuadrillaId,
          Math.max(
            0,
            (this.cargaPorCuadrilla.get(caso.cuadrillaId) ?? caso.reportes) - caso.reportes,
          ),
        );
        this.resumen.finalizados++;
      } else {
        caso.estado = siguiente;
      }
    }
  }

  private async asignarCaso(caso: CasoEnCola, eventos: EventosDelDia): Promise<void> {
    for (const cuadrillaId of this.cuadrillas) {
      const capacidad = evaluarCapacidad(
        this.cargaPorCuadrilla.get(cuadrillaId) ?? 0,
        caso.reportes,
      );
      if (!capacidad.admiteAsignacion) continue;
      try {
        await this.deps.api.asignarCuadrilla(
          caso.grupoId,
          cuadrillaId,
          this.deps.actores.coordinador,
        );
        caso.cuadrillaId = cuadrillaId;
        this.cargaPorCuadrilla.set(
          cuadrillaId,
          (this.cargaPorCuadrilla.get(cuadrillaId) ?? 0) + caso.reportes,
        );
        if (capacidad.alertaPreventiva) {
          const alerta = await this.deps.api.actualizarCaso(
            caso.grupoId,
            this.deps.actores.tecnico,
            {
              comentario: 'Alerta preventiva: la cuadrilla alcanzó 8 reportes abiertos.',
              recursos_solicitados: capacidad.requiereApoyo
                ? 'Solicitud de apoyo: capacidad máxima alcanzada.'
                : null,
            },
          );
          eventos.actualizaciones.push(alerta.id);
        }
        return;
      } catch {
        // La regla de negocio respondió que la cuadrilla está al límite.
      }
    }
    if (this.cuadrillas.length >= 20) return;
    const creada = await this.deps.api.crearCuadrilla(
      `Simulador ${this.deps.corridaId} - cuadrilla ${this.cuadrillas.length + 1}`,
      this.deps.actores.it,
    );
    await this.deps.api.asignarTecnico(creada.id, this.deps.actores.tecnico, this.deps.actores.it);
    this.cuadrillas.push(creada.id);
    await this.deps.api.asignarCuadrilla(caso.grupoId, creada.id, this.deps.actores.coordinador);
    caso.cuadrillaId = creada.id;
    this.cargaPorCuadrilla.set(creada.id, caso.reportes);
    const alerta = await this.deps.api.actualizarCaso(caso.grupoId, this.deps.actores.tecnico, {
      comentario: 'Solicitud de apoyo aprobada: crecimiento de cuadrilla por carga sostenida.',
      recursos_solicitados: 'Nueva cuadrilla de apoyo por alcanzar capacidad máxima.',
    });
    eventos.actualizaciones.push(alerta.id);
  }

  private elegirImagen(candidatos: ImagenManifest[], lluvioso: boolean): ImagenManifest {
    const pesos: Record<Categoria, number> = lluvioso
      ? { bache: 5, alcantarillado: 5, residuos: 4, luminaria: 2, trafico: 2, otro: 1 }
      : { bache: 4, alcantarillado: 1, residuos: 3, luminaria: 3, trafico: 3, otro: 2 };
    const bolsa = candidatos.flatMap((imagen) =>
      Array.from({ length: pesos[imagen.categoria] }, () => imagen),
    );
    return this.azar.elegir(bolsa);
  }

  private snapshot(fecha: Date): Checkpoint {
    return {
      version: 1,
      corridaId: this.deps.corridaId,
      ultimaFecha: fecha.toISOString(),
      cuadrillas: this.cuadrillas,
      cargaPorCuadrilla: [...this.cargaPorCuadrilla.entries()],
      cola: this.cola,
      resumen: this.resumen,
    };
  }
}

function coordenadaEnZona(zona: number, azar: Azar): { lat: number; lng: number } {
  const fila = Math.floor(zona / 4);
  const columna = zona % 4;
  return {
    lat: -17.78 + fila * 0.025 + (azar.siguiente() - 0.5) * 0.001,
    lng: -63.19 + columna * 0.025 + (azar.siguiente() - 0.5) * 0.001,
  };
}

function sumarDias(fecha: Date, dias: number): Date {
  const resultado = new Date(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return resultado;
}

function pausa(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const nombreCheckpoint = (ruta: string): string => basename(ruta);

/**
 * Al reanudar una corrida interrumpida, reutiliza las cuadrillas que el API ya
 * alcanzó a crear aunque todavía no hubieran quedado en el checkpoint.
 */
export function cuadrillasDeCorrida(cuadrillas: CuadrillaExistente[], corridaId: string): number[] {
  const prefijo = `Simulador ${corridaId} - cuadrilla `;
  return cuadrillas
    .map((cuadrilla) => ({ ...cuadrilla, indice: Number(cuadrilla.nombre.slice(prefijo.length)) }))
    .filter(
      (cuadrilla) => cuadrilla.nombre.startsWith(prefijo) && Number.isInteger(cuadrilla.indice),
    )
    .sort((a, b) => a.indice - b.indice)
    .map((cuadrilla) => cuadrilla.id);
}
