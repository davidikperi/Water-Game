// Run: node server.js. Neon is configured through the server-only DATABASE_URL.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createStorage } = require('./storage');
const ROOT = __dirname;
const credentialsPath = path.join(ROOT, '.admin-credentials.json');
if (!fs.existsSync(credentialsPath)) {
  fs.writeFileSync(
    credentialsPath,
    JSON.stringify(
      {
        code: 'admin-' + crypto.randomBytes(4).toString('hex'),
        password: crypto.randomBytes(18).toString('base64url'),
      },
      null,
      2
    ),
    { mode: 0o600 }
  );
}
if (process.argv.includes('--init')) {
  console.log('Temporary credentials saved in .admin-credentials.json');
  process.exit(0);
}
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
const store = createStorage(credentials);
const sessions = new Map(),
  attempts = new Map();
const SESSION_MS = 12 * 3600000;
function authorized(req) {
  const token = cookie(req, 'wg_admin'),
    expires = sessions.get(token);
  if (!expires || expires < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}
function cookie(req, key) {
  return (req.headers.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(key + '='))
    ?.slice(key.length + 1);
}
function setCookie(req, name, value, age) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${req.socket.encrypted || process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`;
}
function send(res, status, body, type = 'application/json', extra = {}) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}
async function body(req) {
  let bytes = 0,
    chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 16384) throw new Error('Body too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function serve(res, file) {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.png': 'image/png',
    '.webmanifest': 'application/manifest+json',
  };
  try {
    send(
      res,
      200,
      fs.readFileSync(path.join(ROOT, file)),
      types[path.extname(file)] || 'application/octet-stream'
    );
  } catch (_) {
    send(res, 404, { error: 'Not found' });
  }
}
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'POST') {
      if (
        req.headers.origin &&
        req.headers.origin !== `http://${req.headers.host}` &&
        req.headers.origin !== `https://${req.headers.host}`
      )
        return send(res, 403, { error: 'Origin rejected' });
      if (pathname === '/api/admin/login') {
        const ip = req.socket.remoteAddress,
          now = Date.now();
        let rate = attempts.get(ip);
        if (!rate || now > rate.until) {
          rate = { count: 0, until: now + 900000 };
          attempts.set(ip, rate);
        }
        if (rate.count >= 10) return send(res, 429, { error: 'Too many attempts' });
        rate.count++;
        const input = await body(req);
        if (
          typeof input.code !== 'string' ||
          typeof input.password !== 'string' ||
          input.code.length > 128 ||
          input.password.length > 256
        )
          return send(res, 401, { error: 'Invalid credentials' });
        if (!(await store.verifyAdmin(input.code, input.password)))
          return send(res, 401, { error: 'Invalid credentials' });
        attempts.delete(ip);
        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, now + SESSION_MS);
        return send(res, 200, { ok: true }, 'application/json', {
          'Set-Cookie': setCookie(req, 'wg_admin', token, SESSION_MS / 1000),
        });
      }
      if (pathname === '/api/admin/logout') {
        sessions.delete(cookie(req, 'wg_admin'));
        return send(res, 200, { ok: true }, 'application/json', {
          'Set-Cookie': setCookie(req, 'wg_admin', '', 0),
        });
      }
      if (pathname === '/api/events') {
        const input = await body(req),
          events = ['session', 'progress', 'start', 'win', 'lose'];
        if (
          !events.includes(input.event) ||
          !Array.isArray(input.stars) ||
          input.stars.length > 120 ||
          input.stars.some((s) => s !== null && (!Number.isInteger(s) || s < 0 || s > 3))
        )
          return send(res, 400, { error: 'Invalid event' });
        if (
          ['start', 'win', 'lose'].includes(input.event) &&
          (!Number.isInteger(input.level) || input.level < 0 || input.level >= 120)
        )
          return send(res, 400, { error: 'Invalid level' });
        const id = await store.record(input, cookie(req, 'wg_player'));
        return send(res, 200, { ok: true }, 'application/json', {
          'Set-Cookie': setCookie(req, 'wg_player', id, 31536000),
        });
      }
      return send(res, 404, { error: 'Not found' });
    }
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' });
    if (pathname === '/api/leaderboard') {
      const me = cookie(req, 'wg_player');
      const players = Object.values((await store.all()).players);
      const ranked = players
        .map((p) => ({
          name: p.name,
          stars: p.stars.reduce((sum, s) => sum + (s || 0), 0),
          levels: p.stars.filter((s) => s > 0).length,
          best: p.stars.reduce((best, s, i) => (s > 0 ? i + 1 : best), 0),
          me: p.id === me,
        }))
        .sort((a, b) => b.stars - a.stars || b.levels - a.levels || a.name.localeCompare(b.name));
      return send(res, 200, { rows: ranked.slice(0, 100), totalPlayers: players.length });
    }
    if (pathname === '/api/admin/players')
      return authorized(req)
        ? send(res, 200, await store.all())
        : send(res, 401, { error: 'Sign in required' });
    if (pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/index.html')
      return serve(res, authorized(req) ? 'admin/index.html' : 'admin/login.html');
    const file = pathname === '/' ? 'index.html' : pathname.slice(1);
    const publicFiles = [
      'index.html',
      'js/game.js',
      'js/habitats.js',
      'js/analytics.js',
      'css/game.css',
      'audio/bubbles-entry.wav',
      'audio/spongebob-transition-short.mp3',
      'admin/dashboard.js',
      'admin/dashboard.css',
      'admin/login.js',
      'admin/login.css',
      'sw.js',
      'manifest.webmanifest',
    ];
    if (publicFiles.includes(file) || /^icons\/[a-zA-Z0-9_-]+\.png$/.test(file))
      return serve(res, file);
    send(res, 404, { error: 'Not found' });
  } catch (error) {
    const invalid = error instanceof SyntaxError || error.message === 'Body too large';
    if (!res.headersSent)
      send(res, invalid ? 400 : 503, {
        error: invalid ? 'Invalid request' : 'Service temporarily unavailable',
      });
  }
});
if (require.main === module)
  store.ready
    .then(() =>
      server.listen(Number(process.env.PORT) || 3000, process.env.HOST || '127.0.0.1', () =>
        console.log(
          'Water Game: http://localhost:' +
            server.address().port +
            ' | Admin: /admin | Credentials: .admin-credentials.json'
        )
      )
    )
    .catch(async () => {
      console.error('Database initialization failed. Check DATABASE_URL and connectivity.');
      await store.close();
      process.exitCode = 1;
    });
server.on('close', () => {
  store.close();
});
module.exports = server;
