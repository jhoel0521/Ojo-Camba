import { ServiceUnavailableException } from '@nestjs/common';
import { AiProviderRegistry } from './ai-provider.registry';

const SETTINGS = {
  provider: 'groq',
  apiKey: 'test',
  baseUrl: 'https://example.test',
  textModel: 'model',
  visionModel: 'vision',
};

describe('AiProviderRegistry', () => {
  it('usa el siguiente respaldo cuando falla el proveedor prioritario', async () => {
    const groq = {
      name: 'groq',
      supportsVision: true,
      chat: jest.fn().mockRejectedValue(new ServiceUnavailableException('cuota')),
    };
    const gemini = {
      name: 'gemini',
      supportsVision: true,
      chat: jest.fn().mockResolvedValue({ message: { role: 'assistant', content: 'respaldo' } }),
    };
    const configuration = {
      getEnabled: jest.fn().mockResolvedValue([SETTINGS, { ...SETTINGS, provider: 'gemini' }]),
    };
    const registry = new AiProviderRegistry(
      configuration as never,
      groq as never,
      gemini as never,
      { name: 'deepseek', supportsVision: false } as never,
      { name: 'openai', supportsVision: true } as never,
    );

    const result = await registry.chat({
      system: 's',
      messages: [{ role: 'user', content: 'hola' }],
      tools: [],
    });

    expect(result.message.content).toBe('respaldo');
    expect(groq.chat).toHaveBeenCalledTimes(1);
    expect(gemini.chat).toHaveBeenCalledTimes(1);
  });
});
