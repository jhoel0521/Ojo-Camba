import { Injectable } from '@nestjs/common';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';

@Injectable()
export class DeepSeekProvider extends OpenAiCompatibleProvider {
  readonly name = 'deepseek';
  readonly supportsVision = false;
}
