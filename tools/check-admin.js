const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const file = path.join(os.tmpdir(), 'watergame-admin-test-' + process.pid + '.json');
process.env.WATERGAME_DATA_PATH = file;
process.env.WATERGAME_STORAGE = 'file';
process.env.ADMIN_CODE = 'test-admin';
process.env.ADMIN_PASSWORD = 'test-password';
const server = require('../server');
(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const request = (url, options) => fetch(base + url, options);
  const post = (url, value, cookie = '') =>
    request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(value),
    });
  try {
    for (const [asset, type] of [
      ['/js/game.js', 'text/javascript'],
      ['/js/habitats.js', 'text/javascript'],
      ['/js/analytics.js', 'text/javascript'],
      ['/css/game.css', 'text/css'],
      ['/admin/dashboard.js', 'text/javascript'],
      ['/admin/dashboard.css', 'text/css'],
      ['/admin/login.js', 'text/javascript'],
      ['/admin/login.css', 'text/css'],
    ]) {
      const response = await request(asset);
      assert.equal(response.status, 200, `Missing asset: ${asset}`);
      assert.ok(response.headers.get('content-type').startsWith(type), `Wrong type: ${asset}`);
      assert.equal(
        await response.text(),
        fs.readFileSync(path.join(__dirname, '..', asset.slice(1)), 'utf8')
      );
    }
    assert.equal((await request('/api/admin/players')).status, 401);
    assert.match(await (await request('/admin')).text(), /Login code/);
    assert.equal((await request('/.admin-credentials.json')).status, 404);
    assert.equal((await request('/.watergame-data.json')).status, 404);
    assert.equal((await request('/.env')).status, 404);
    assert.equal((await request('/storage.js')).status, 404);
    assert.equal((await request('/database/schema.sql')).status, 404);
    assert.equal(
      (await post('/api/admin/login', { code: 'test-admin', password: 'wrong' })).status,
      401
    );
    const login = await post('/api/admin/login', { code: 'test-admin', password: 'test-password' });
    assert.equal(login.status, 200);
    assert.match(login.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    const adminCookie = login.headers.get('set-cookie').split(';')[0];
    const dashboard = await request('/admin', { headers: { Cookie: adminCookie } });
    assert.match(await dashboard.text(), /Diver dashboard/);
    assert.equal(dashboard.headers.get('cache-control'), 'no-store');
    const event = { event: 'session', name: '<script>Test</script>', stars: [], currentLevel: 1 };
    const first = await post('/api/events', event);
    assert.equal(first.status, 200);
    const playerCookie = first.headers.get('set-cookie').split(';')[0];
    await post('/api/events', { ...event, event: 'start', level: 0 }, playerCookie);
    await post('/api/events', { ...event, event: 'win', level: 0, stars: [3] }, playerCookie);
    await post(
      '/api/events',
      { ...event, event: 'progress', name: 'Renamed diver', stars: [3] },
      playerCookie
    );
    const data = await (
      await request('/api/admin/players', { headers: { Cookie: adminCookie } })
    ).json();
    const sandbox = vm.createContext({});
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, '..', 'js', 'analytics.js'), 'utf8'),
      sandbox
    );
    const summary = sandbox.WaterAnalytics.summarize(data, 120);
    assert.equal(summary.total, 1);
    assert.equal(summary.active, 1);
    assert.equal(summary.sessions, 1);
    assert.equal(summary.stars, 3);
    assert.equal(summary.cleared, 1);
    assert.equal(summary.levels[0].attempts, 1);
    assert.equal(summary.levels[0].wins, 1);
    assert.equal(summary.players[0].name, 'Renamed diver');
    const another = await post('/api/events', { ...event, name: 'Another diver', stars: [3, 3] });
    assert.equal(another.status, 200);
    await post('/api/events', { ...event, name: 'New diver', stars: [] });
    const shared = await request('/api/leaderboard', { headers: { Cookie: playerCookie } });
    assert.equal(shared.status, 200);
    const leaderboard = await shared.json();
    assert.equal(leaderboard.totalPlayers, 3);
    assert.equal(leaderboard.rows.length, 3);
    assert.equal(leaderboard.rows[0].name, 'Another diver');
    assert.equal(leaderboard.rows[0].stars, 6);
    assert.equal(leaderboard.rows[0].levels, 2);
    assert.equal(leaderboard.rows[0].me, false);
    assert.equal(leaderboard.rows[1].me, true);
    assert.equal(leaderboard.rows[2].stars, 0, 'New players also appear');
    for (const row of leaderboard.rows)
      assert.deepEqual(Object.keys(row).sort(), ['best', 'levels', 'me', 'name', 'stars']);
    assert.equal((await post('/api/events', { ...event, event: 'start', level: -1 })).status, 400);
    const crossOrigin = await request('/api/admin/login', {
      method: 'POST',
      headers: { Origin: 'https://unrelated.example' },
      body: '{}',
    });
    assert.equal(crossOrigin.status, 403);
    await post('/api/admin/logout', {}, adminCookie);
    assert.equal(
      (await request('/api/admin/players', { headers: { Cookie: adminCookie } })).status,
      401
    );
    console.log(
      'Passed: admin login/logout, private routes, event validation, player deduplication, and dashboard totals.'
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
