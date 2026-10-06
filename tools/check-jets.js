const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8');
const start = script.indexOf('const JET_TILT =');
const end = script.indexOf('// Gently steer a descending ring', start);
const context = vm.createContext({
  NOZ: [79, 281],
  JY: 476,
  DESIGN_H: 480,
  jets: [{ p: 1 }, { p: 0 }],
});
vm.runInContext(script.slice(start, end), context);
const left = context.jetForce(79, 476);
assert.ok(left[0] > 0, 'Left pump pushes inward');
assert.equal(left[1], -1650, 'Keep the original vertical lift');
context.jets = [{ p: 0 }, { p: 1 }];
const right = context.jetForce(281, 476);
assert.equal(right[0], -left[0], 'Right pump mirrors left');
assert.equal(right[1], left[1]);
assert.equal(right[2], left[2]);
context.jets = [{ p: 1 }, { p: 1 }];
assert.ok(Math.abs(context.jetForce(180, 260)[0]) < 1e-10, 'Both pumps balance at the centre');
context.jets = [{ p: 0 }, { p: 0 }];
assert.deepEqual(Array.from(context.jetForce(79, 400)), [0, 0, 0]);
context.jets = [{ p: 1 }, { p: 0 }];
assert.deepEqual(Array.from(context.jetForce(79, 500)), [0, 0, 0], 'No force below the nozzle');
function launch(side) {
  context.jets = [{ p: side === 0 ? 1 : 0 }, { p: side === 1 ? 1 : 0 }];
  const r = { x: context.NOZ[side], y: 465, vx: 0, vy: 0 },
    h = 1 / 120;
  for (let i = 0; i < 72; i++) {
    const [fx, fy] = context.jetForce(r.x, r.y);
    r.vx = (r.vx + fx * h) * Math.exp(-1.9 * h);
    r.vy = (r.vy + (62 + fy) * h) * Math.exp(-1.9 * h);
    r.x += r.vx * h;
    r.y += r.vy * h;
  }
  return r;
}
const a = launch(0),
  b = launch(1);
assert.ok(a.x > 109 && b.x < 251, 'Pumping carries rings across, rather than straight upward');
assert.ok(a.y < 400 && b.y < 400, 'Jets still lift rings');
assert.ok(Math.abs(a.x + b.x - 360) < 1e-8, 'Mirrored launches stay symmetric');
console.log('Passed: inward jets, preserved lift, balanced pumps, and sideways ring travel.');
