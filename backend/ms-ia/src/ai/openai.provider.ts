import { Injectable } from '@nestjs/common';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';

@Injectable()
export class OpenAiProvider extends OpenAiCompatibleProvider {
  readonly name = 'openai';
  readonly supportsVision = true;
}
