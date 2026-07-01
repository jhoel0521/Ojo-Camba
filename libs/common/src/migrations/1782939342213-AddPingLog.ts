import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPingLog1782939342213 implements MigrationInterface {
  name = 'AddPingLog1782939342213';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ping_log" ("id" SERIAL NOT NULL, "servicio" character varying(50) NOT NULL, "estado" character varying(10) NOT NULL, "latencia_ms" integer, "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f96138086b83a1b1095e104df85" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_da1e2cb3172b91c23ad7278da9" ON "ping_log" ("servicio", "creado_en") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_da1e2cb3172b91c23ad7278da9"`);
    await queryRunner.query(`DROP TABLE "ping_log"`);
  }
}
