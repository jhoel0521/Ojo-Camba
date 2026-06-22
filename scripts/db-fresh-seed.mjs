import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://ojocamba:ojocamba_secret@localhost:5432/ojocamba';

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function fresh() {
  const client = await pool.connect();
  try {
    console.log('Dropping public schema...');
    await client.query('DROP SCHEMA public CASCADE');
    console.log('Creating public schema...');
    await client.query('CREATE SCHEMA public');
    console.log('Restoring extensions...');
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis SCHEMA public CASCADE');
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis_raster SCHEMA public');
    await client.query('CREATE EXTENSION IF NOT EXISTS h3 SCHEMA public');
    await client.query('CREATE EXTENSION IF NOT EXISTS h3_postgis SCHEMA public');
    console.log('Schema fresh OK');
  } finally {
    client.release();
    await pool.end();
  }
}

fresh().catch((err) => {
  console.error('Error during fresh:', err);
  process.exit(1);
});
