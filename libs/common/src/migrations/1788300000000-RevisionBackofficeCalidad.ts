import { MigrationInterface, QueryRunner } from 'typeorm';

/** ISSUE-30: admisión/descarte auditables y calidad de rechazos de campo. */
export class RevisionBackofficeCalidad1788300000000 implements MigrationInterface {
  name = 'RevisionBackofficeCalidad1788300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reportes"
        ADD COLUMN IF NOT EXISTS "admitido_por_usuario_id" integer,
        ADD COLUMN IF NOT EXISTS "admitido_en" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "motivo_descarte_digital" character varying(80),
        ADD COLUMN IF NOT EXISTS "descartado_por_usuario_id" integer,
        ADD COLUMN IF NOT EXISTS "descartado_en" TIMESTAMP WITH TIME ZONE
    `);
    await queryRunner.query(`
      ALTER TABLE "grupos_reportes"
        ADD COLUMN IF NOT EXISTS "categoria_rechazo_campo_id" integer,
        ADD COLUMN IF NOT EXISTS "rechazado_campo_por_usuario_id" integer,
        ADD COLUMN IF NOT EXISTS "rechazado_campo_en" TIMESTAMP WITH TIME ZONE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "grupos_reportes"
        DROP COLUMN IF EXISTS "rechazado_campo_en",
        DROP COLUMN IF EXISTS "rechazado_campo_por_usuario_id",
        DROP COLUMN IF EXISTS "categoria_rechazo_campo_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "reportes"
        DROP COLUMN IF EXISTS "descartado_en",
        DROP COLUMN IF EXISTS "descartado_por_usuario_id",
        DROP COLUMN IF EXISTS "motivo_descarte_digital",
        DROP COLUMN IF EXISTS "admitido_en",
        DROP COLUMN IF EXISTS "admitido_por_usuario_id"
    `);
  }
}
