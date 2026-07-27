import { MigrationInterface, QueryRunner } from 'typeorm';

export class GeminiFlashLite1787100000000 implements MigrationInterface {
  name = 'GeminiFlashLite1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "ai_provider_configs" SET "text_model" = 'gemini-3.5-flash-lite', "vision_model" = 'gemini-3.5-flash-lite', "actualizado_en" = now() WHERE "provider" = 'gemini' AND ("text_model" = 'gemini-2.5-flash' OR "vision_model" = 'gemini-2.5-flash')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "ai_provider_configs" SET "text_model" = 'gemini-2.5-flash', "vision_model" = 'gemini-2.5-flash', "actualizado_en" = now() WHERE "provider" = 'gemini' AND "text_model" = 'gemini-3.5-flash-lite' AND "vision_model" = 'gemini-3.5-flash-lite'`,
    );
  }
}
