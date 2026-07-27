import { Injectable } from '@nestjs/common';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';

@Injectable()
export class GroqProvider extends OpenAiCompatibleProvider {
  readonly name = 'groq';
  readonly supportsVision = true;
}
