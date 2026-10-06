const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
for (const file of ['index.html', 'admin/index.html', 'admin/login.html']) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  assert.doesNotMatch(html, /<style\b|<script\s*>|\sstyle=/, `Inline code in ${file}`);
  for (const match of html.matchAll(/(?:src|href)="(\/?(?:js|css|admin)\/[^"?#]+\.(?:js|css))"/g)) {
    const asset = path.join(root, match[1].replace(/^\//, ''));
    assert.ok(fs.existsSync(asset), `Missing ${match[1]}`);
    if (asset.endsWith('.js')) new vm.Script(fs.readFileSync(asset, 'utf8'));
  }
}
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
for (const asset of ['./js/game.js', './js/analytics.js', './css/game.css'])
  assert.ok(worker.includes(asset), `Offline cache missing ${asset}`);
const artifact = path.join(os.tmpdir(), `watergame-artifact-check-${process.pid}.html`);
try {
  execFileSync(process.execPath, [path.join(__dirname, 'build-artifact.js'), artifact]);
  const html = fs.readFileSync(artifact, 'utf8');
  assert.ok(html.startsWith('<title>'));
  assert.doesNotMatch(html, /<script src="js\/|href="css\//);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 3);
  for (const script of scripts) new vm.Script(script[1]);
  assert.ok(html.includes(fs.readFileSync(path.join(root, 'css/game.css'), 'utf8')));
} finally {
  if (fs.existsSync(artifact)) fs.unlinkSync(artifact);
}
console.log('Passed: separate HTML/CSS/JS assets, offline cache, and standalone artifact output.');
