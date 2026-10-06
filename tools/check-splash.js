// Regression check for turtle collisions accidentally opening the level transition.
// Run with: node tools/check-splash.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8');
new vm.Script(script); // Check the entire game's JavaScript syntax.

function extract(name) {
  const start = script.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing ${name}`);
  const tail = script.slice(start);
  const end = tail.match(/\n  \}/);
  assert.ok(end, `Missing end of ${name}`);
  return tail.slice(0, end.index + end[0].length);
}

for (const reduceMotion of [false, true]) {
  const timers = [];
  const elements = {};
  const wipe = { hidden: true, className: '', style: { setProperty() {} } };
  let soundCount = 0;
  const context = vm.createContext({
    bubbles: [],
    rings: [{ peg: -1 }],
    turtles: [{ active: true, x: 100, cy: 150, s: 16, d: 1, v: 22, hit: 0 }],
    bump: () => true,
    rnd: (a, b) => (a + b) / 2,
    sfx: {
      entry() {},
      boop() {
        soundCount++;
      },
    },
    wipe,
    reduceMotion,
    whoosh() {},
    $: (id) => (elements[id] ||= {}),
    setTimeout: (fn, delay) => timers.push({ fn, delay }),
  });
  // Load both functions together, as the game does: this caught the name collision.
  vm.runInContext(extract('spawnSplashBubbles') + '\n' + extract('splash'), context);
  const collision = script.match(
    /\/\/ loose rings bounce off the turtle[^]*?(?=for \(const c of crabs\))/
  )[0];
  vm.runInContext(collision, context);
  assert.equal(context.bubbles.length, 4);
  assert.equal(soundCount, 1);
  assert.equal(timers.length, 0, 'A collision must not start a transition timer');
  assert.equal(wipe.hidden, true, 'A collision must not cover the game');

  // Verify that play still advances and counts down after the collision.
  Object.assign(context, {
    shake: 0,
    hr: 0.05,
    phase: 'play',
    megaCharge: 0,
    MEGA_TIME: 8,
    timeLeft: 30,
    pegs: [],
    goal: 6,
    winT: 0,
    pumpsLeft: Infinity,
    jets: [{ p: 0 }, { p: 0 }],
    idleT: 0,
    finish() {
      throw new Error('Unexpected level completion');
    },
  });
  const clock = script
    .slice(
      script.indexOf('shake = Math.max(0, shake - hr);'),
      script.indexOf('// Push a free ring')
    )
    .trim()
    .replace(/\}\s*$/, '');
  vm.runInContext(`(() => { ${clock} })()`, context);
  assert.equal(context.timeLeft, 29.95);

  let started = 0;
  context.startNext = () => started++;
  vm.runInContext("splash(100, 150, 'DIVING INTO', '2', 'Next level', startNext)", context);
  assert.equal(wipe.hidden, false);
  assert.equal(timers[0].delay, reduceMotion ? 250 : 1050);
  timers.shift().fn();
  assert.equal(started, 1);
  assert.equal(wipe.className, 'out');
  timers.shift().fn();
  assert.equal(wipe.hidden, true);
}
console.log(
  'Passed: turtle collisions, countdown continuity, and normal/reduced-motion level transitions.'
);
