export function friendlyError(err: unknown): string {
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return 'Sin conexion. Verifica tu internet e intenta de nuevo.';
  }

  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes('413') || msg.includes('too large')) {
    return 'La foto es muy grande. Intenta con una de menor tamano.';
  }

  if (msg.includes('400') || msg.includes('Bad Request')) {
    return 'Faltan datos obligatorios. Completa todos los campos.';
  }

  if (msg.includes('401') || msg.includes('Unauthorized')) {
    return 'Credenciales incorrectas. Verifica tu email y contrasena.';
  }

  if (msg.includes('404')) {
    return 'No se encontro lo que buscas.';
  }

  if (msg.includes('409') || msg.includes('ya esta registrado')) {
    return 'Este email ya esta registrado. Inicia sesion o usa otro.';
  }

  if (msg.includes('500') || msg.includes('Internal')) {
    return 'Error del servidor. Intenta de nuevo en unos minutos.';
  }

  if (msg.includes('tiempo') || msg.includes('timeout') || msg.includes('agotado')) {
    return 'El servidor tardo mucho en responder. Intenta de nuevo.';
  }

  return 'Algo salio mal. Intenta de nuevo.';
}
