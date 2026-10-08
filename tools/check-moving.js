// Regression check for swaying-peg levels. Run with: node tools/check-moving.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8');
const from = script.indexOf('  const TAU'),
  to = script.indexOf('  const LEVELS =');
const LEVELS = new Function(
  script.slice(from, to) +
    '; return Array.from({ length: LEVEL_COUNT }, (_, i) => makeLevel(i + 1));'
)();

const moving = LEVELS.map((L, i) => ({ L, n: i + 1 })).filter(({ L }) => L.moving);
assert.ok(moving.length >= 12 && moving.length <= 30, `${moving.length} moving levels`);
let lastAmp = 0;
for (const { L, n } of moving) {
  assert.ok(n > 40, `Level ${n}: moving pegs start in the Kelp Forest`);
  assert.ok(!L.speed && !L.current && !L.pumps, `Level ${n}: one water hazard at a time`);
  assert.equal(L.odd, 1, `Level ${n}: a single black ring`);
  assert.match(L.hint, /The pegs sway!/);
  const [a, b] = L.pegs;
  assert.equal(a.amp, b.amp);
  assert.ok(a.amp >= 14 && a.amp <= 34 && a.amp >= lastAmp, `Level ${n}: gentle, growing sway`);
  assert.ok(Math.abs((2 * Math.PI) / a.spd - 7) <= 2.01, `Level ${n}: 5–9 s per sway`);
  assert.equal(b.ph - a.ph, Math.PI, `Level ${n}: pegs sway in opposite directions`);
  lastAmp = a.amp;
}
assert.ok(
  LEVELS.every((L) => L.moving || L.pegs.every((p) => !p.amp)),
  'Other levels keep still pegs'
);
assert.match(script, /'<span class="tag moving">MOVING<\/span>'/, 'Map tags moving levels');

console.log(
  `Passed: ${moving.length} swaying-peg levels from level ${moving[0].n}, gentle ramp, one hazard at a time.`
);
