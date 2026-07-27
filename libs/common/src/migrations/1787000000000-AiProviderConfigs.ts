import { MigrationInterface, QueryRunner } from 'typeorm';

export class AiProviderConfigs1787000000000 implements MigrationInterface {
  name = 'AiProviderConfigs1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ai_provider_configs" ("id" SERIAL NOT NULL, "provider" character varying(30) NOT NULL, "enabled" boolean NOT NULL DEFAULT false, "priority" integer NOT NULL DEFAULT 100, "api_key_encrypted" text, "base_url" character varying(500) NOT NULL, "text_model" character varying(200), "vision_model" character varying(200), "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_ai_provider_configs_provider" UNIQUE ("provider"), CONSTRAINT "PK_ai_provider_configs" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ai_provider_configs"`);
  }
}
