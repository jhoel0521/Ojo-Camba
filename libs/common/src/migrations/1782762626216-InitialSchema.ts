import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1782762626216 implements MigrationInterface {
  name = 'InitialSchema1782762626216';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "reportes" ("id" SERIAL NOT NULL, "device_id" character varying(255) NOT NULL, "usuario_id" integer, "categoria_id" integer NOT NULL, "grupo_id" integer, "lat" numeric(10,7) NOT NULL, "lng" numeric(10,7) NOT NULL, "h3_res_8" character varying(15) NOT NULL, "h3_res_11" character varying(15) NOT NULL, "h3_res_13" character varying(15) NOT NULL, "estado" character varying(50) NOT NULL DEFAULT 'Reportado', "gravedad" character varying(20) NOT NULL DEFAULT 'Media', "url_imagen" character varying(500) NOT NULL, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4204634633cb4099bc06b27a17e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "dispositivos" ("device_id" character varying(255) NOT NULL, "is_banned" boolean NOT NULL DEFAULT false, "motivo_ban" character varying(255), "ultimo_uso" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_1347b288fb847634547cdef4bd2" PRIMARY KEY ("device_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "categorias" ("id" SERIAL NOT NULL, "nombre" character varying(100) NOT NULL, "icono" character varying(50), CONSTRAINT "UQ_ccdf6cd1a34ea90a7233325063d" UNIQUE ("nombre"), CONSTRAINT "PK_3886a26251605c571c6b4f861fe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "grupos_reportes" ("id" SERIAL NOT NULL, "codigo_obra" character varying(50) NOT NULL, "estado_actual" character varying(50) NOT NULL DEFAULT 'Aceptado', "fecha_estimada_fin" date, "creado_por_usuario_id" integer NOT NULL, "categoria_id" integer, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_ca654452d94e370e5d978da08dc" UNIQUE ("codigo_obra"), CONSTRAINT "PK_998e3372aa8480512d36d969ef1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "actualizaciones_caso" ("id" SERIAL NOT NULL, "reporte_id" integer, "grupo_id" integer, "usuario_id" integer NOT NULL, "estado_nuevo" character varying(50), "comentario" text NOT NULL, "recursos_solicitados" character varying(255), "fecha_estimada_fin" date, "lat_actualizada" numeric(10,7), "lng_actualizada" numeric(10,7), "url_imagen" character varying(500), "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b3072450e5dec3ce4530cd88092" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "usuarios" ("id" SERIAL NOT NULL, "nombre" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255), "puntos" integer NOT NULL DEFAULT '0', "nivel_id" integer, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_446adfc18b35418aac32ae0b7b5" UNIQUE ("email"), CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" SERIAL NOT NULL, "nombre" character varying(100) NOT NULL, CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "usuario_roles" ("usuario_id" integer NOT NULL, "rol_id" integer NOT NULL, CONSTRAINT "PK_43e0c343408b4c5c79be51e7202" PRIMARY KEY ("usuario_id", "rol_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" SERIAL NOT NULL, "usuario_id" integer NOT NULL, "token" character varying(255) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_4542dd2f38a61354a040ba9fd57" UNIQUE ("token"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "niveles" ("id" SERIAL NOT NULL, "nombre" character varying(100) NOT NULL, "puntos_requeridos" integer NOT NULL, "url_sticker" character varying(500), CONSTRAINT "UQ_2411030bc12c5a5174dd754ab1a" UNIQUE ("nombre"), CONSTRAINT "PK_bbd85fa595a6c63d479d35f8a2b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "historial_puntos" ("id" SERIAL NOT NULL, "usuario_id" integer NOT NULL, "report_id" integer, "puntos" integer NOT NULL, "motivo" character varying(255), "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2ad6a7e9e8a944ebf073aa6295a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c1123edd3f3dd8da0809cd3fee" ON "historial_puntos" ("report_id") WHERE report_id IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario_roles" ADD CONSTRAINT "FK_f4660653ecea0eef621bae52097" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario_roles" ADD CONSTRAINT "FK_0a60de73dab09515692949c13a5" FOREIGN KEY ("rol_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_c8349fdadc1bc791125bdd8c855" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_c8349fdadc1bc791125bdd8c855"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario_roles" DROP CONSTRAINT "FK_0a60de73dab09515692949c13a5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usuario_roles" DROP CONSTRAINT "FK_f4660653ecea0eef621bae52097"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_c1123edd3f3dd8da0809cd3fee"`);
    await queryRunner.query(`DROP TABLE "historial_puntos"`);
    await queryRunner.query(`DROP TABLE "niveles"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "usuario_roles"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "usuarios"`);
    await queryRunner.query(`DROP TABLE "actualizaciones_caso"`);
    await queryRunner.query(`DROP TABLE "grupos_reportes"`);
    await queryRunner.query(`DROP TABLE "categorias"`);
    await queryRunner.query(`DROP TABLE "dispositivos"`);
    await queryRunner.query(`DROP TABLE "reportes"`);
  }
}
