export function friendlyError(err: unknown): string {
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return 'Sin conexion. Verifica tu internet e intenta de nuevo.';
  }

  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes('400') || msg.includes('Bad Request')) {
    return 'Datos invalidos. Revisa los campos.';
  }

  if (msg.includes('401') || msg.includes('Unauthorized')) {
    return 'Sesion expirada. Vuelve a iniciar sesion.';
  }

  if (msg.includes('403') || msg.includes('Forbidden')) {
    return 'No tienes permisos para esta accion.';
  }

  if (msg.includes('404') || msg.includes('no encontrado')) {
    return 'No se encontro lo que buscas.';
  }

  if (msg.includes('409') || msg.includes('conflict')) {
    return 'Conflicto. El recurso ya existe o esta en uso.';
  }

  if (msg.includes('500') || msg.includes('Internal')) {
    return 'Error del servidor. Intenta de nuevo en unos minutos.';
  }

  return 'Algo salio mal. Intenta de nuevo.';
}
