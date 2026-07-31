import { MigrationInterface, QueryRunner } from 'typeorm';

/** ISSUE-32: decisiones humanas sobre las recomendaciones de capacidad. */
export class DecisionesRecomendacion1788400000000 implements MigrationInterface {
  name = 'DecisionesRecomendacion1788400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "decisiones_recomendacion" (
        "id" SERIAL NOT NULL,
        "zona_h3" character varying(15) NOT NULL,
        "categoria_id" integer,
        "nivel" character varying(20) NOT NULL,
        "accion" character varying(20) NOT NULL,
        "motivo" text NOT NULL,
        "decidido_por_usuario_id" integer NOT NULL,
        "recomendacion_original" text NOT NULL,
        "factores" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "riesgo" numeric(10,3) NOT NULL,
        "casos_estimados" numeric(10,2) NOT NULL,
        "reportes_estimados" numeric(10,2),
        "confianza" character varying(20),
        "version_modelo" character varying(50),
        "version_dataset" character varying(50),
        "periodo_desde" date NOT NULL,
        "periodo_hasta" date NOT NULL,
        "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_decisiones_recomendacion" PRIMARY KEY ("id")
      )
    `);
    // Reconstruir la precision retrospectiva recorre por zona y semana.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_decisiones_zona_periodo"
        ON "decisiones_recomendacion" ("zona_h3", "periodo_desde")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_decisiones_usuario_creado"
        ON "decisiones_recomendacion" ("decidido_por_usuario_id", "creado_en")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_decisiones_usuario_creado"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_decisiones_zona_periodo"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "decisiones_recomendacion"`);
  }
}
