const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8');
const start = script.indexOf('function ringGuidance(');
const tail = script.slice(start),
  end = tail.match(/\n  \}/);
const context = vm.createContext({
  phase: 'play',
  CATCH_X: 26,
  pegs: [{ x: 100, tip: 200, c: 'red' }],
});
vm.runInContext(tail.slice(0, end.index + end[0].length), context);
const ring = (changes = {}) => ({
  x: 128,
  y: 174,
  vx: 0,
  vy: 18,
  peg: -1,
  cool: 0,
  odd: false,
  c: 'red',
  ...changes,
});
assert.ok(context.ringGuidance(ring()) < 0, 'A nearby falling ring moves toward the tip');
assert.ok(context.ringGuidance(ring({ x: 72 })) > 0);
for (const changes of [
  { vy: -10 },
  { vy: 0 },
  { y: 203 },
  { y: 100 },
  { y: 142 },
  { x: 140 },
  { x: 170 },
  { c: 'blue' },
  { odd: true },
  { peg: 0 },
  { cool: 0.1 },
]) {
  assert.equal(context.ringGuidance(ring(changes)), 0, JSON.stringify(changes));
}
context.phase = 'intro';
assert.equal(context.ringGuidance(ring()), 0);
context.phase = 'play';
context.pegs = [{ x: 100, tip: 200, c: null }];
assert.ok(context.ringGuidance(ring({ c: 'blue' })) < 0, 'White poles accept any normal colour');
context.pegs = [
  { x: 100, tip: 200, c: 'blue' },
  { x: 160, tip: 200, c: 'red' },
];
assert.ok(context.ringGuidance(ring()) > 0, 'Ignore a nearby wrong-colour pole');
context.pegs = [{ x: 100, tip: 200, c: 'red' }];
function descend(h, assisted) {
  const r = ring({ x: 126.5 });
  for (let steps = 0; steps < 10000 && r.y < 202; steps++) {
    const ax = assisted ? context.ringGuidance(r) : 0;
    r.vx = (r.vx + ax * h) * Math.exp(-1.9 * h);
    r.vy = (r.vy + 62 * h) * Math.exp(-1.9 * h);
    r.x += r.vx * h;
    r.y += r.vy * h;
  }
  return r;
}
assert.ok(Math.abs(descend(1 / 120, false).x - 100) > 26, 'Unassisted near miss');
for (const h of [1 / 120, 1 / 240]) {
  const r = descend(h, true);
  assert.ok(Math.abs(r.x - 100) < 26, 'Guidance brings a near miss within the existing catch area');
  assert.ok(r.x > 100, 'Guidance does not snap the ring to the pole');
}
assert.ok(
  Math.abs(descend(1 / 120, true).x - descend(1 / 240, true).x) < 0.5,
  'Consistent across frame rates'
);
console.log(
  'Passed: gentle guidance, colour matching, falling-only assistance, and near-miss landing.'
);
