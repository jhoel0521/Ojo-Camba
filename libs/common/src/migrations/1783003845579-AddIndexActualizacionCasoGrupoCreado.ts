import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexActualizacionCasoGrupoCreado1783003845579 implements MigrationInterface {
  name = 'AddIndexActualizacionCasoGrupoCreado1783003845579';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_13f960aa9ff442287ca1cd171b" ON "actualizaciones_caso" ("grupo_id", "creado_en") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_13f960aa9ff442287ca1cd171b"`);
  }
}
