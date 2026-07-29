import { MigrationInterface, QueryRunner } from 'typeorm';

/** ISSUE-26: operación municipal, responsables de cuadrilla y auditoría. */
export class OperacionMunicipal1788000000000 implements MigrationInterface {
  name = 'OperacionMunicipal1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "cuadrilla_miembros" ("cuadrilla_id" integer NOT NULL, "usuario_id" integer NOT NULL, "es_responsable" boolean NOT NULL DEFAULT false, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cuadrilla_miembros" PRIMARY KEY ("cuadrilla_id", "usuario_id"), CONSTRAINT "UQ_cuadrilla_miembros_usuario" UNIQUE ("cuadrilla_id", "usuario_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "configuracion_operativa" ("id" SERIAL NOT NULL, "clave" character varying(100) NOT NULL, "valor" integer NOT NULL, "descripcion" text NOT NULL, "actualizado_por_usuario_id" integer, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_configuracion_operativa_clave" UNIQUE ("clave"), CONSTRAINT "PK_configuracion_operativa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "derivaciones_caso" ("id" SERIAL NOT NULL, "grupo_id" integer NOT NULL, "entidad_destino" character varying(160) NOT NULL, "motivo" text NOT NULL, "evidencia_url" character varying(500) NOT NULL, "confirmado_por_usuario_id" integer NOT NULL, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_derivaciones_caso" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_derivaciones_caso_grupo_creado" ON "derivaciones_caso" ("grupo_id", "creado_en")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_cuadrilla_un_responsable" ON "cuadrilla_miembros" ("cuadrilla_id") WHERE "es_responsable" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_cuadrilla_un_responsable"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_derivaciones_caso_grupo_creado"`);
    await queryRunner.query(`DROP TABLE "derivaciones_caso"`);
    await queryRunner.query(`DROP TABLE "configuracion_operativa"`);
    await queryRunner.query(`DROP TABLE "cuadrilla_miembros"`);
  }
}
