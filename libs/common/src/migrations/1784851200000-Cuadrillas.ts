import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 5: modelo de cuadrillas y especialidades + asignación del Caso de Obra.
 *
 * Primera migración incremental del proyecto (la anterior es el InitialSchema),
 * así que corre sobre una base con datos: por eso `cuadrilla_id` entra como
 * nullable y sin backfill — los casos existentes quedan sin asignar, que es
 * exactamente lo que representan hoy.
 *
 * Sin FOREIGN KEY sobre categoria_id/especialidad_id/cuadrilla_id, siguiendo la
 * convención del esquema inicial (solo usuario_roles y refresh_tokens usan FK).
 */
export class Cuadrillas1784851200000 implements MigrationInterface {
  name = 'Cuadrillas1784851200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "especialidades" ("id" SERIAL NOT NULL, "nombre" character varying(100) NOT NULL, "categoria_id" integer, CONSTRAINT "UQ_especialidades_nombre" UNIQUE ("nombre"), CONSTRAINT "PK_especialidades_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "cuadrillas" ("id" SERIAL NOT NULL, "nombre" character varying(100) NOT NULL, "especialidad_id" integer, "activa" boolean NOT NULL DEFAULT true, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_cuadrillas_nombre" UNIQUE ("nombre"), CONSTRAINT "PK_cuadrillas_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "grupos_reportes" ADD "cuadrilla_id" integer`);
    // La consulta caliente es "carga actual por cuadrilla" (casos activos
    // agrupados por cuadrilla_id), que corre en cada recomendación.
    await queryRunner.query(
      `CREATE INDEX "IDX_grupos_reportes_cuadrilla" ON "grupos_reportes" ("cuadrilla_id") WHERE cuadrilla_id IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_grupos_reportes_cuadrilla"`);
    await queryRunner.query(`ALTER TABLE "grupos_reportes" DROP COLUMN "cuadrilla_id"`);
    await queryRunner.query(`DROP TABLE "cuadrillas"`);
    await queryRunner.query(`DROP TABLE "especialidades"`);
  }
}
