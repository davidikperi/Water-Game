const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8');
const tail = script.slice(script.indexOf('function turtleBurst(')),
  end = tail.match(/\n  \}/);
let bubbles = 0,
  sounds = 0;
const context = vm.createContext({
  phase: 'play',
  rings: [
    { x: 100, y: 150, peg: -1, vx: 0, vy: 40, cool: 0 },
    { x: 150, y: 150, peg: -1, vx: 0, vy: 40, cool: 0 },
    { x: 300, y: 150, peg: -1, vx: 0, vy: 40, cool: 0 },
    { x: 100, y: 150, peg: 0, vx: 0, vy: 0, cool: 0 },
  ],
  spawnSplashBubbles(x, y, n) {
    bubbles += n;
  },
  sfx: {
    boop() {
      sounds++;
    },
  },
});
vm.runInContext(tail.slice(0, end.index + end[0].length), context);
const turtle = { x: 100, cy: 150, d: 1, active: true, burstCooldown: 0 };
assert.equal(context.turtleBurst(turtle), true);
assert.equal(context.rings[0].vy, -180);
assert.ok(context.rings[1].vy < 0);
assert.ok(context.rings[1].vx > 0);
assert.equal(context.rings[2].vy, 40);
assert.equal(context.rings[3].vy, 0);
assert.equal(turtle.burstCooldown, 2.5);
assert.equal(bubbles, 14);
assert.equal(sounds, 1);
assert.equal(context.turtleBurst(turtle), false);
assert.equal(bubbles, 14);
turtle.burstCooldown = 0;
context.phase = 'intro';
assert.equal(context.turtleBurst(turtle), false);
context.phase = 'play';
turtle.active = false;
assert.equal(context.turtleBurst(turtle), false);
turtle.active = true;
assert.equal(context.turtleBurst(turtle), true);
assert.match(script, /const MEGA_TIME = 60;/);
console.log(
  'Passed: nearby turtle bursts, cooldown, protected landed rings, and longer MEGA recharge.'
);
