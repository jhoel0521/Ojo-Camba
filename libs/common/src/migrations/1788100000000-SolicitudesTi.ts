import { MigrationInterface, QueryRunner } from 'typeorm';

/** ISSUE-27: trazabilidad de promociones, bajas y conformación de cuadrillas. */
export class SolicitudesTi1788100000000 implements MigrationInterface {
  name = 'SolicitudesTi1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "solicitudes_ti" ("id" SERIAL NOT NULL, "tipo" character varying(40) NOT NULL, "referencia_carta" character varying(255) NOT NULL, "comentario" text, "ejecutado_por_usuario_id" integer NOT NULL, "resultado" character varying(30) NOT NULL DEFAULT 'aplicada', "cuadrilla_id" integer, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_solicitudes_ti" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "solicitud_ti_usuarios" ("id" SERIAL NOT NULL, "solicitud_id" integer NOT NULL, "usuario_id" integer NOT NULL, "roles_antes" jsonb NOT NULL, "roles_despues" jsonb NOT NULL, "participacion_cuadrilla" character varying(20), CONSTRAINT "PK_solicitud_ti_usuarios" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_solicitudes_ti_creado" ON "solicitudes_ti" ("creado_en" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_solicitud_ti_usuarios_solicitud" ON "solicitud_ti_usuarios" ("solicitud_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_solicitud_ti_usuarios_solicitud"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_solicitudes_ti_creado"`);
    await queryRunner.query(`DROP TABLE "solicitud_ti_usuarios"`);
    await queryRunner.query(`DROP TABLE "solicitudes_ti"`);
  }
}
