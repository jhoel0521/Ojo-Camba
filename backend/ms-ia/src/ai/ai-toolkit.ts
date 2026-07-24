import type { AiToolDefinition } from './ai-provider';

/**
 * Las herramientas que el asistente puede pedir, en formato neutral (patrón
 * AiToolkit de ISABEL2). Quien la implementa expone sus definiciones y sabe
 * ejecutarlas; el proveedor de LLM solo las traduce a su API.
 */
export interface AiToolkit {
  definitions(): AiToolDefinition[];

  /**
   * Ejecuta una herramienta y devuelve su resultado, que se le entrega de vuelta
   * al modelo. Una clave `redirect` en el resultado navega el navegador del
   * operador. Las explicaciones se apoyan en el motor simbólico, no en el LLM.
   */
  execute(name: string, input: Record<string, unknown>): Promise<Record<string, unknown>>;
}
