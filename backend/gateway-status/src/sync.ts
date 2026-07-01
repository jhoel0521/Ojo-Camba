import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PingLog } from '@ojo-camba/common';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://ojocamba:ojocamba_secret@localhost:5432/ojocamba';

const ds = new DataSource({
  type: 'postgres',
  url: DATABASE_URL,
  synchronize: true,
  logging: true,
  entities: [PingLog],
});

ds.initialize()
  .then(() => ds.synchronize())
  .then(() => {
    console.log('Entity schemas synchronized OK');
    return ds.destroy();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
