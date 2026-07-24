/**
 * Contrato neutral de proveedores de LLM (patrón inspirado en ISABEL2).
 *
 * El asistente habla contra esta interfaz sin saber si detrás está Groq,
 * Anthropic u otro. Cada proveedor traduce estos tipos neutrales a su propio
 * formato de API (Groq/OpenAI envuelve las herramientas en `function`; Anthropic
 * usa `input_schema`). Hoy solo hay GroqProvider, pero sumar otro es implementar
 * esta interfaz y registrarlo.
 */

export type AiRole = 'user' | 'assistant' | 'tool';

/** Una herramienta que el modelo pidió ejecutar. */
export interface AiToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AiMessage {
  role: AiRole;
  content: string;
  /** Presente cuando el turno del asistente pide ejecutar herramientas. */
  toolCalls?: AiToolCall[];
  /** Presente en mensajes de resultado de herramienta (role='tool'). */
  toolCallId?: string;
  /** Nombre de la herramienta, en los mensajes role='tool'. */
  name?: string;
}

/** Definición neutral de herramienta: `parameters` es un JSON Schema de objeto. */
export interface AiToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AiChatParams {
  system: string;
  messages: AiMessage[];
  tools: AiToolDefinition[];
}

/** Respuesta del proveedor: el mensaje del asistente (puede traer toolCalls). */
export interface AiChatResult {
  message: AiMessage;
}

export interface AiProvider {
  /** Identificador estable, p. ej. 'groq'. */
  readonly name: string;
  /** true si el proveedor tiene su credencial configurada y puede usarse. */
  isConfigured(): boolean;
  chat(params: AiChatParams): Promise<AiChatResult>;
}
