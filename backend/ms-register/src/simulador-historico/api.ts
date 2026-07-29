import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { ImagenManifest } from './domain';

export interface Sesion {
  token: string;
  usuarioId: number;
}

export interface Actores {
  backoffice: Sesion;
  tecnico: Sesion;
  coordinador: Sesion;
  it: Sesion;
}

export class ApiOjoCamba {
  constructor(private readonly baseUrl: string) {}

  async verificarSalud(): Promise<void> {
    await this.request('/health');
  }

  async iniciarActoresDemo(): Promise<Actores> {
    const [backoffice, tecnico, coordinador, it] = await Promise.all([
      this.login('moderador2@ojocamba.bo', 'mod123'),
      this.login('tecnico@ojocamba.bo', 'tec123'),
      this.login('admin@ojocamba.bo', 'admin123'),
      this.login('it@ojocamba.bo', 'it123'),
    ]);
    return { backoffice, tecnico, coordinador, it };
  }

  async crearReporte(
    imagen: ImagenManifest,
    directorioImagenes: string,
    categoriaId: number,
    deviceId: string,
    lat: number,
    lng: number,
  ): Promise<{ id: number }> {
    const ruta = resolve(directorioImagenes, imagen.archivo);
    const contenido = await readFile(ruta);
    const extension = extname(ruta).slice(1).replace('jpg', 'jpeg') || 'jpeg';
    return this.request('/reportes', {
      method: 'POST',
      body: {
        device_id: deviceId,
        lat,
        lng,
        categoria_id: categoriaId,
        gravedad: imagen.triaje.gravedad,
        imagen_base64: `data:image/${extension};base64,${contenido.toString('base64')}`,
      },
    });
  }

  aceptarReporte(
    reporteId: number,
    sesion: Sesion,
    categoriaId: number,
    gravedad: string,
  ): Promise<void> {
    return this.request(`/admin/reports/${reporteId}/accept`, {
      method: 'POST',
      token: sesion.token,
      body: { categoria_id: categoriaId, gravedad },
    });
  }

  rechazarReporte(reporteId: number, sesion: Sesion): Promise<void> {
    return this.request(`/admin/reports/${reporteId}/reject`, {
      method: 'POST',
      token: sesion.token,
    });
  }

  crearGrupo(reporteIds: number[], sesion: Sesion, categoriaId: number): Promise<{ id: number }> {
    return this.request('/admin/groups', {
      method: 'POST',
      token: sesion.token,
      body: { report_ids: reporteIds, categoria_id: categoriaId },
    });
  }

  obtenerGrupo(grupoId: number, sesion: Sesion): Promise<{ id: number; estado_actual: string }> {
    return this.request(`/admin/groups/${grupoId}`, { token: sesion.token });
  }

  asignarCuadrilla(grupoId: number, cuadrillaId: number, coordinador: Sesion): Promise<void> {
    return this.request(`/admin/groups/${grupoId}/cuadrilla`, {
      method: 'POST',
      token: coordinador.token,
      body: { cuadrilla_id: cuadrillaId, usuario_id: coordinador.usuarioId },
    });
  }

  actualizarCaso(
    grupoId: number,
    tecnico: Sesion,
    cuerpo: Record<string, unknown>,
  ): Promise<{ id: number }> {
    return this.request(`/operacion/tecnico/groups/${grupoId}/updates`, {
      method: 'POST',
      token: tecnico.token,
      body: cuerpo,
    });
  }

  derivarCaso(
    grupoId: number,
    tecnico: Sesion,
    destino: string,
    motivo: string,
  ): Promise<{ id: number }> {
    return this.request(`/operacion/tecnico/groups/${grupoId}/derivaciones`, {
      method: 'POST',
      token: tecnico.token,
      body: { entidad_destino: destino, motivo, evidencia_url: 'simulador/evidencia-de-campo.jpg' },
    });
  }

  crearCuadrilla(nombre: string, it: Sesion): Promise<{ id: number }> {
    return this.request('/admin/cuadrillas', { method: 'POST', token: it.token, body: { nombre } });
  }

  listarCuadrillas(it: Sesion): Promise<Array<{ id: number; nombre: string }>> {
    return this.request('/admin/cuadrillas', { token: it.token });
  }

  asignarTecnico(cuadrillaId: number, tecnico: Sesion, it: Sesion): Promise<void> {
    return this.request(`/operacion/cuadrillas/${cuadrillaId}/miembros`, {
      method: 'POST',
      token: it.token,
      body: { usuario_id: tecnico.usuarioId, es_responsable: true },
    });
  }

  private async login(email: string, password: string): Promise<Sesion> {
    const resultado = await this.request<{ access_token: string; user: { id: number } }>(
      '/auth/login',
      {
        method: 'POST',
        body: { email, password },
      },
    );
    return { token: resultado.access_token, usuarioId: resultado.user.id };
  }

  private async request<T>(
    ruta: string,
    opciones: { method?: string; token?: string; body?: unknown } = {},
  ): Promise<T> {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${this.baseUrl}${ruta}`, {
        method: opciones.method ?? 'GET',
        headers: {
          ...(opciones.body ? { 'content-type': 'application/json' } : {}),
          ...(opciones.token ? { authorization: `Bearer ${opciones.token}` } : {}),
        },
        body: opciones.body ? JSON.stringify(opciones.body) : undefined,
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      const detalle = error instanceof Error ? error.message : 'error desconocido';
      throw new Error(
        `${opciones.method ?? 'GET'} ${ruta} no respondió en 30 segundos: ${detalle}`,
      );
    }
    if (!respuesta.ok) {
      throw new Error(
        `${opciones.method ?? 'GET'} ${ruta} falló (${respuesta.status}): ${await respuesta.text()}`,
      );
    }
    return (await respuesta.json()) as T;
  }
}
