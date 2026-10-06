const fs = require('node:fs');
const path = require('node:path');
const { createStorage } = require('../storage');
const credentials = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '.admin-credentials.json'), 'utf8')
);
const store = createStorage(credentials);
(async () => {
  try {
    await store.ready;
    if (store.mode !== 'Neon PostgreSQL') throw new Error('DATABASE_URL is not configured');
    const { Pool } = require('pg');
    const connection = new URL(process.env.DATABASE_URL);
    connection.searchParams.set('sslmode', 'verify-full');
    const pool = new Pool({
      connectionString: connection.toString(),
      enableChannelBinding: true,
      connectionTimeoutMillis: 10000,
    });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const id = 'setup-check-' + require('node:crypto').randomUUID();
      await client.query('INSERT INTO watergame_players(id,profile) VALUES($1,$2::jsonb)', [
        id,
        JSON.stringify({ id, stars: [3] }),
      ]);
      const { rows } = await client.query('SELECT profile FROM watergame_players WHERE id=$1', [
        id,
      ]);
      if (rows[0]?.profile.stars[0] !== 3)
        throw new Error('Database read/write verification failed');
    } finally {
      await client.query('ROLLBACK');
      client.release();
      await pool.end();
    }
    const data = await store.all();
    if (!(await store.verifyAdmin(credentials.code, credentials.password)))
      throw new Error('Admin verification failed');
    console.log(
      `Connected to ${store.mode}; schema initialized; ${Object.keys(data.players).length} players; read/write and admin login verified.`
    );
  } finally {
    await store.close();
  }
})().catch((error) => {
  console.error('Neon setup failed:', error.code || error.name);
  process.exitCode = 1;
});
