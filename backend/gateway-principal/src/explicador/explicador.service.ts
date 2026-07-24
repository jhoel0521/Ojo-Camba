import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { verificarAlucinacionNumerica } from './alucinacion';

export type TipoExplicacion = 'triaje' | 'ruta';

export interface ExplicarDto {
  tipo: TipoExplicacion;
  resultado: Record<string, unknown>;
}

export interface ExplicacionRespuesta {
  explicacion: string;
  /** Números citados por el LLM que no están en el resultado técnico (para revisión humana). */
  numerosSospechosos: string[];
}

/**
 * Prompt de sistema del Agente Explicador — mismo contenido y mismas 5 reglas que
 * el laboratorio en Python. El agente traduce, no decide.
 */
const SYSTEM_PROMPT = `Sos el "Agente Explicador" de Ojo Camba, una plataforma ciudadana de reporte de infraestructura urbana en Santa Cruz de la Sierra. Un sistema de apoyo a la decisión ya produjo un resultado técnico y tu única tarea es traducirlo a un lenguaje claro para un operador del Back Office. Seguí SIEMPRE estas cinco reglas:

1. Redactá 2 o 3 oraciones en español neutro y claro. Nada de jerga técnica: no uses términos como "estados explorados", "forward chaining", "encadenamiento", "nodos", "backtracking", "heurística" ni nombres de algoritmos.
2. Basá tu explicación ÚNICAMENTE en los datos presentes en el JSON que recibís. Está PROHIBIDO inventar cifras, porcentajes, nombres de instituciones, calles o cualquier dato que no aparezca en el JSON.
3. Si un dato no está en el JSON, decí que no está disponible; nunca lo completes con una suposición.
4. Vos no decidís por el operador: la decisión final es suya. Cerrá siempre dejándola en sus manos.
5. Mantené un tono profesional y a la vez cercano.`;

@Injectable()
export class ExplicadorService {
  private readonly logger = new Logger(ExplicadorService.name);

  // La clave vive sólo en el backend; jamás se expone al frontend.
  private readonly apiKey = process.env.GROQ_API_KEY;
  private readonly model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';
  private readonly baseUrl = process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1';

  async explicar(dto: ExplicarDto): Promise<ExplicacionRespuesta> {
    if (dto?.tipo !== 'triaje' && dto?.tipo !== 'ruta') {
      throw new BadRequestException('El campo "tipo" debe ser "triaje" o "ruta".');
    }
    if (!dto.resultado || typeof dto.resultado !== 'object' || Array.isArray(dto.resultado)) {
      throw new BadRequestException('El campo "resultado" es requerido y debe ser un objeto.');
    }
    if (!this.apiKey) {
      // Config del servidor, no del cliente: 500, no 4xx.
      throw new InternalServerErrorException(
        'El Agente Explicador no está configurado: falta GROQ_API_KEY en el servidor.',
      );
    }

    const explicacion = await this.pedirExplicacion(dto);
    const numerosSospechosos = verificarAlucinacionNumerica(explicacion, dto.resultado);
    return { explicacion, numerosSospechosos };
  }

  private async pedirExplicacion(dto: ExplicarDto): Promise<string> {
    const contexto =
      dto.tipo === 'triaje'
        ? 'El resultado proviene del triaje asistido que sugiere la gravedad de un reporte ciudadano.'
        : 'El resultado proviene del cálculo de la ruta sugerida para visitar los reportes de un Caso de Obra.';

    const userPrompt = `${contexto}\n\nResultado técnico (JSON):\n${JSON.stringify(dto.resultado)}`;

    let res: Awaited<ReturnType<typeof fetch>>;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          max_tokens: 320,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        }),
      });
    } catch (e) {
      this.logger.error(`Fallo de red al contactar a Groq: ${String(e)}`);
      throw new ServiceUnavailableException(
        'No se pudo contactar al servicio de IA. Intentá de nuevo en unos minutos.',
      );
    }

    if (!res.ok) {
      // Se registra el detalle en el servidor, pero no se filtra al cliente.
      const detalle = await res.text().catch(() => '');
      this.logger.error(`Groq respondió ${res.status}: ${detalle}`);
      throw new ServiceUnavailableException(
        res.status === 429
          ? 'El servicio de IA alcanzó su cuota por ahora. Intentá de nuevo en unos minutos.'
          : 'El servicio de IA no está disponible en este momento.',
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const texto = data.choices?.[0]?.message?.content?.trim();
    if (!texto) {
      throw new ServiceUnavailableException('El servicio de IA devolvió una respuesta vacía.');
    }
    return texto;
  }
}
