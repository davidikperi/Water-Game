const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8');
let hour = 22;
const classes = new Set();
const context = vm.createContext({
  Date: class {
    getHours() {
      return hour;
    }
  },
  document: {
    documentElement: {
      classList: {
        toggle(name, on) {
          if (on) classes.add(name);
          else classes.delete(name);
        },
      },
    },
  },
  L: {},
  li: 0,
  TH: {},
  waterGrad: {},
  gameEl: { style: {} },
  plankton: [],
  W: 360,
  H: 480,
  TOP: 12,
  rnd: (a, b) => (a + b) / 2,
  pick: (a) => a[0],
});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'habitats.js'), 'utf8'), context);
vm.runInContext(
  script.slice(script.indexOf('const THEMES ='), script.indexOf('let TH =')),
  context
);
for (const [h, night] of [
  [0, true],
  [5, true],
  [6, false],
  [12, false],
  [17, false],
  [18, true],
  [23, true],
]) {
  assert.equal(context.isNightTime({ getHours: () => h }), night, `Hour ${h}`);
}
for (const i of [0, 4, 20, 60, 80, 119])
  assert.equal(context.themeFor(i).moon, true, 'All levels get moonlight at night');
const start = script.indexOf('function syncTimeOfDay('),
  tail = script.slice(start),
  end = tail.match(/\n  \}/);
vm.runInContext(tail.slice(0, end.index + end[0].length), context);
context.syncTimeOfDay();
assert.ok(classes.has('night-time'));
hour = 6;
context.syncTimeOfDay();
assert.ok(!classes.has('night-time'));
assert.equal(context.TH.top, '#8be6f3');
assert.equal(context.waterGrad, null);
assert.equal(context.themeFor(3).moon, true, 'Keep authored night-dive levels during the day');
hour = 18;
context.syncTimeOfDay();
assert.ok(classes.has('night-time'));
assert.equal(context.TH.moon, true);
assert.equal(context.plankton.length, 45);
console.log('Passed: local day/night boundaries, moonlit levels, and live theme changes.');
