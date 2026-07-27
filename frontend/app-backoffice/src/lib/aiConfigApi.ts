import { fetchAPI } from './api';

export type AiProviderName = 'groq' | 'gemini' | 'deepseek' | 'openai';

export interface AiProviderConfig {
  id: number;
  provider: AiProviderName;
  enabled: boolean;
  priority: number;
  base_url: string;
  text_model: string | null;
  vision_model: string | null;
  has_api_key: boolean;
  actualizado_en: string;
}

export interface AiProviderChanges {
  enabled: boolean;
  priority: number;
  base_url: string;
  text_model: string | null;
  vision_model: string | null;
  api_key?: string;
  clear_api_key?: boolean;
}

export interface AiProviderTestResult {
  ok: boolean;
  provider: string;
  message: string;
}

export function listAiProviders(): Promise<AiProviderConfig[]> {
  return fetchAPI<AiProviderConfig[]>('/config/ia/providers');
}

export function updateAiProvider(
  provider: AiProviderName,
  changes: AiProviderChanges,
): Promise<AiProviderConfig> {
  return fetchAPI<AiProviderConfig>(`/config/ia/providers/${provider}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
}

export function testAiProvider(provider: AiProviderName): Promise<AiProviderTestResult> {
  return fetchAPI<AiProviderTestResult>(`/config/ia/providers/${provider}/test`, {
    method: 'POST',
  });
}
