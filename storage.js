const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const root = __dirname;
if (process.env.WATERGAME_STORAGE !== 'file' && fs.existsSync(path.join(root, '.env')))
  process.loadEnvFile(path.join(root, '.env'));
function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}
function updatePlayer(p, input, id) {
  const now = Date.now();
  p ||= { id, joined: now, attempts: {}, wins: {}, sessions: 0, stars: [] };
  p.name = typeof input.name === 'string' ? input.name.slice(0, 16) : 'Unnamed diver';
  p.lastSeen = now;
  p.stars = input.stars;
  p.currentLevel = Number.isInteger(input.currentLevel)
    ? Math.min(120, Math.max(1, input.currentLevel))
    : 1;
  if (input.event === 'session') p.sessions++;
  if (input.event === 'start') p.attempts[input.level + 1] = (p.attempts[input.level + 1] || 0) + 1;
  if (input.event === 'win') p.wins[input.level + 1] = (p.wins[input.level + 1] || 0) + 1;
  if (input.event === 'lose') p.losses = (p.losses || 0) + 1;
  return p;
}
function createStorage(credentials) {
  const file = process.env.WATERGAME_DATA_PATH || path.join(root, '.watergame-data.json');
  const local = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { players: {} };
  const salt = crypto.randomBytes(16).toString('hex');
  const admin = {
    code_hash: hashCode(process.env.ADMIN_CODE || credentials.code),
    salt,
    password_hash: crypto
      .scryptSync(process.env.ADMIN_PASSWORD || credentials.password, salt, 64)
      .toString('hex'),
  };
  const enabled = process.env.WATERGAME_STORAGE !== 'file' && Boolean(process.env.DATABASE_URL);
  // Keep certificate verification explicit, including when the supplied URL uses sslmode=require.
  const connection = enabled ? new URL(process.env.DATABASE_URL) : null;
  if (connection) connection.searchParams.set('sslmode', 'verify-full');
  const pool = enabled
    ? new Pool({
        connectionString: connection.toString(),
        enableChannelBinding: true,
        max: 5,
        connectionTimeoutMillis: 10000,
      })
    : null;
  if (pool) pool.on('error', () => console.error('Database connection interrupted.'));
  const ready = (async () => {
    if (!pool) return;
    await pool.query(fs.readFileSync(path.join(root, 'database/schema.sql'), 'utf8'));
    // Seed the existing temporary login once, with only salted password hashes in Neon.
    await pool.query(
      'INSERT INTO watergame_admins(code_hash,password_hash,salt) SELECT $1,$2,$3 WHERE NOT EXISTS (SELECT 1 FROM watergame_admins) ON CONFLICT DO NOTHING',
      [admin.code_hash, admin.password_hash, admin.salt]
    );
    // Preserve previously recorded local players without overwriting Neon profiles.
    for (const p of Object.values(local.players))
      await pool.query(
        'INSERT INTO watergame_players(id,profile) VALUES($1,$2::jsonb) ON CONFLICT DO NOTHING',
        [p.id, JSON.stringify(p)]
      );
  })();
  return {
    mode: enabled ? 'Neon PostgreSQL' : 'local file',
    ready,
    async all() {
      await ready;
      if (!pool) return local;
      const { rows } = await pool.query('SELECT id,profile FROM watergame_players');
      return { players: Object.fromEntries(rows.map((r) => [r.id, r.profile])) };
    },
    async record(input, candidate) {
      await ready;
      const valid = candidate && /^[a-f0-9]{32}$/.test(candidate);
      if (!pool) {
        const id =
          valid && local.players[candidate] ? candidate : crypto.randomBytes(16).toString('hex');
        local.players[id] = updatePlayer(local.players[id], input, id);
        fs.writeFileSync(file + '.tmp', JSON.stringify(local));
        fs.renameSync(file + '.tmp', file);
        return id;
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const existing = valid
          ? await client.query('SELECT profile FROM watergame_players WHERE id=$1 FOR UPDATE', [
              candidate,
            ])
          : { rows: [] };
        const id = existing.rows.length ? candidate : crypto.randomBytes(16).toString('hex');
        const p = updatePlayer(existing.rows[0]?.profile, input, id);
        await client.query(
          'INSERT INTO watergame_players(id,profile) VALUES($1,$2::jsonb) ON CONFLICT(id) DO UPDATE SET profile=EXCLUDED.profile',
          [id, JSON.stringify(p)]
        );
        await client.query('COMMIT');
        return id;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    async verifyAdmin(code, password) {
      await ready;
      const stored = pool
        ? (
            await pool.query(
              'SELECT code_hash,password_hash,salt FROM watergame_admins WHERE code_hash=$1',
              [hashCode(code)]
            )
          ).rows[0]
        : admin;
      // Use a dummy hash for unknown codes so the password calculation still runs.
      const account = stored || admin;
      const actual = crypto.scryptSync(password, account.salt, 64);
      const matches = crypto.timingSafeEqual(actual, Buffer.from(account.password_hash, 'hex'));
      return Boolean(stored) && hashCode(code) === account.code_hash && matches;
    },
    async close() {
      await ready.catch(() => {});
      if (pool) await pool.end();
    },
  };
}
module.exports = { createStorage };
