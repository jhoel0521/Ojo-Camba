/**
 * Chequeo de alucinación numérica del Agente Explicador (Actividad 4).
 *
 * Portado del laboratorio en Python: extrae todos los números presentes en el
 * resultado técnico y marca los que aparecen en la explicación del LLM pero NO
 * en ese resultado. No bloquea la respuesta — sólo la señala para que un humano
 * la revise, ya que verificar la fidelidad de una explicación es tarea
 * exclusivamente humana.
 *
 * Equivalente a las funciones _numeros_en() y verificar_alucinacion_numerica()
 * del script original.
 */

// \d+(?:[.,]\d+)? — enteros y decimales con punto o coma (317.6, 1,5, 40).
const RE_NUMERO = /\d+(?:[.,]\d+)?/g;

/** El separador decimal se unifica a punto para que "317,6" y "317.6" sean el mismo número. */
function normalizar(num: string): string {
  return num.replace(',', '.');
}

/**
 * Recorre recursivamente un objeto/lista/valor y junta todos los números que
 * contiene (en claves de texto, strings anidados, etc.), normalizados.
 */
export function numerosEn(obj: unknown): Set<string> {
  const encontrados = new Set<string>();

  const recorrer = (valor: unknown): void => {
    if (valor === null || valor === undefined) return;
    if (Array.isArray(valor)) {
      valor.forEach(recorrer);
      return;
    }
    if (typeof valor === 'object') {
      Object.values(valor as Record<string, unknown>).forEach(recorrer);
      return;
    }
    const texto = String(valor);
    const matches = texto.match(RE_NUMERO);
    if (matches) matches.forEach((m) => encontrados.add(normalizar(m)));
  };

  recorrer(obj);
  return encontrados;
}

/**
 * Devuelve los números citados en la explicación que no están respaldados por el
 * resultado técnico. Preserva el orden de aparición y elimina duplicados para no
 * repetir el mismo número en el aviso al operador.
 */
export function verificarAlucinacionNumerica(explicacion: string, resultado: unknown): string[] {
  const respaldados = numerosEn(resultado);
  const citados = explicacion.match(RE_NUMERO) ?? [];

  const sospechosos: string[] = [];
  const yaVistos = new Set<string>();
  for (const num of citados) {
    if (respaldados.has(normalizar(num))) continue;
    if (yaVistos.has(num)) continue;
    yaVistos.add(num);
    sospechosos.push(num);
  }
  return sospechosos;
}
