import { MigrationInterface, QueryRunner } from 'typeorm';

/** ISSUE-29: visitas asignables, propuestas de campo y datos base para rutas. */
export class VisitasCaso1788200000000 implements MigrationInterface {
  name = 'VisitasCaso1788200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "grupos_reportes" ADD "prioridad" smallint NOT NULL DEFAULT 3`,
    );
    await queryRunner.query(
      `ALTER TABLE "cuadrillas" ADD "lat_base" numeric(10,7), ADD "lng_base" numeric(10,7)`,
    );
    await queryRunner.query(
      `CREATE TABLE "visitas_caso" ("id" SERIAL NOT NULL, "grupo_id" integer NOT NULL, "cuadrilla_id" integer NOT NULL, "tecnico_id" integer, "asignado_por_usuario_id" integer, "fecha_planificada" date, "orden_ruta" integer, "llegada_en" TIMESTAMP WITH TIME ZONE, "lat_llegada" numeric(10,7), "lng_llegada" numeric(10,7), "cerrada_en" TIMESTAMP WITH TIME ZONE, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_visitas_caso" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_visitas_caso_tecnico_fecha" ON "visitas_caso" ("tecnico_id", "fecha_planificada")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_visitas_caso_cuadrilla_ruta" ON "visitas_caso" ("cuadrilla_id", "fecha_planificada", "orden_ruta")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_visitas_caso_grupo_abierta" ON "visitas_caso" ("grupo_id") WHERE "cerrada_en" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "propuestas_visita" ("id" SERIAL NOT NULL, "visita_id" integer NOT NULL, "estado_propuesto" character varying(50) NOT NULL, "comentario" text NOT NULL, "entidad_destino" character varying(160), "categoria_rechazo_id" integer, "evidencia_url" character varying(500), "propuesto_por_usuario_id" integer NOT NULL, "decision" character varying(20) NOT NULL DEFAULT 'Pendiente', "decidido_por_usuario_id" integer, "motivo_decision" text, "decidida_en" TIMESTAMP WITH TIME ZONE, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_propuestas_visita" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_propuestas_visita_visita_creado" ON "propuestas_visita" ("visita_id", "creado_en")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_propuestas_visita_decision_creado" ON "propuestas_visita" ("decision", "creado_en")`,
    );
    await queryRunner.query(
      `UPDATE "grupos_reportes" SET "estado_actual" = 'PendienteAsignacion' WHERE "estado_actual" = 'Aceptado'`,
    );
    await queryRunner.query(
      `UPDATE "grupos_reportes" SET "estado_actual" = 'ValidacionCampo' WHERE "estado_actual" = 'ValidacionEnCampo'`,
    );
    await queryRunner.query(
      `UPDATE "actualizaciones_caso" SET "estado_anterior" = 'PendienteAsignacion' WHERE "estado_anterior" = 'Aceptado'`,
    );
    await queryRunner.query(
      `UPDATE "actualizaciones_caso" SET "estado_nuevo" = 'PendienteAsignacion' WHERE "estado_nuevo" = 'Aceptado'`,
    );
    await queryRunner.query(
      `UPDATE "actualizaciones_caso" SET "estado_anterior" = 'ValidacionCampo' WHERE "estado_anterior" = 'ValidacionEnCampo'`,
    );
    await queryRunner.query(
      `UPDATE "actualizaciones_caso" SET "estado_nuevo" = 'ValidacionCampo' WHERE "estado_nuevo" = 'ValidacionEnCampo'`,
    );
    await queryRunner.query(
      `ALTER TABLE "grupos_reportes" ALTER COLUMN "estado_actual" SET DEFAULT 'PendienteAsignacion'`,
    );
    await queryRunner.query(
      `INSERT INTO "visitas_caso" ("grupo_id", "cuadrilla_id") SELECT "id", "cuadrilla_id" FROM "grupos_reportes" WHERE "cuadrilla_id" IS NOT NULL AND "estado_actual" NOT IN ('Finalizado', 'Derivado', 'RechazadoCampo')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_propuestas_visita_decision_creado"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_propuestas_visita_visita_creado"`);
    await queryRunner.query(`DROP TABLE "propuestas_visita"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_visitas_caso_grupo_abierta"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_visitas_caso_cuadrilla_ruta"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_visitas_caso_tecnico_fecha"`);
    await queryRunner.query(`DROP TABLE "visitas_caso"`);
    await queryRunner.query(
      `ALTER TABLE "cuadrillas" DROP COLUMN "lng_base", DROP COLUMN "lat_base"`,
    );
    await queryRunner.query(`ALTER TABLE "grupos_reportes" DROP COLUMN "prioridad"`);
  }
}
