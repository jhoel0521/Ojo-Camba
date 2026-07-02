import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEstadoAnteriorActualizacionCaso1783000706064 implements MigrationInterface {
  name = 'AddEstadoAnteriorActualizacionCaso1783000706064';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "actualizaciones_caso" ADD "estado_anterior" character varying(50)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "actualizaciones_caso" DROP COLUMN "estado_anterior"`);
  }
}
