// Regression check for the black ring rule and the level 2 home screen invitation.
// Run with: node tools/check-black-ring.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8');

function extract(name) {
  const start = script.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing ${name}`);
  const tail = script.slice(start);
  const end = tail.match(/\n  \}/);
  return tail.slice(0, end.index + end[0].length);
}

// A black ring threading onto a peg busts the level; a coloured one still just plinks.
const landing = script.match(/\/\/ any ring threads onto any peg[^]*?break;/)[0];
for (const [odd, phase, busts] of [
  [true, 'play', true],
  [false, 'play', false],
  [true, 'intro', false],
]) {
  let busted = 0,
    plinks = 0;
  const ctx = vm.createContext({
    p: { c: null, x: 100, tip: 200 },
    r: { odd, c: odd ? 'odd' : 'red', vy: 20 },
    pi: 0,
    phase,
    sparks: [],
    COLORS: { odd: ['#333'], red: ['#f00'] },
    sfx: { plink: () => plinks++ },
    blackRingLanded: () => busted++,
  });
  vm.runInContext(`for (const _ of [0]) { ${landing} }`, ctx);
  assert.equal(ctx.r.peg, 0, 'The ring threads onto the peg');
  assert.equal(busted, busts ? 1 : 0, `odd=${odd} phase=${phase}`);
  assert.equal(plinks, odd ? 0 : 1);
}

// The busted beat freezes play, then hands over to the lose card.
{
  const calls = [];
  const ctx = vm.createContext({
    phase: 'play',
    bustT: 0,
    shake: 0,
    sfx: { bust: () => calls.push('bust') },
    release: (i) => calls.push('release' + i),
    navigator: {},
  });
  vm.runInContext(extract('blackRingLanded'), ctx);
  ctx.blackRingLanded();
  assert.equal(ctx.phase, 'busted');
  assert.ok(ctx.bustT > 0.4 && ctx.bustT <= 1, 'Long enough to see the ring land');
  assert.deepEqual(calls, ['release0', 'release1', 'bust']);
  const tick = script.match(
    /if \(phase === 'busted' && \(bustT -= hr\) <= 0\) return finish\(false, 'black'\);/
  );
  assert.ok(tick, 'step() finishes a busted level');
  let lost = null;
  Object.assign(ctx, { hr: 0.1, finish: (won, why) => (lost = [won, why]) });
  for (let k = 0; k < 20 && !lost; k++) vm.runInContext(`(() => { ${tick[0]} })()`, ctx);
  assert.deepEqual(lost, [false, 'black']);
}
assert.match(
  script,
  /r\.eject = true; \/\/ every ring on a peg/,
  'MEGA lifts rings off the pegs too'
);
assert.match(script, /'Black ring!'/);

// Home screen invitation: once, only where installing is possible.
function invite({
  iOS = false,
  inAppAndroid = false,
  deferred = false,
  asked = false,
  standalone = false,
}) {
  const el = () => ({ hidden: true, innerHTML: '', textContent: '', focus() {} });
  const els = { homeLater: el() };
  let persisted = 0;
  const ctx = vm.createContext({
    standalone,
    canWorker: true,
    iOS,
    inAppAndroid,
    deferredInstall: deferred ? {} : null,
    save: { homeAsked: asked },
    persist: () => persisted++,
    homeScreen: el(),
    homeAdd: el(),
    homeSteps: el(),
    $: (id) => els[id],
    setTimeout: () => {},
  });
  vm.runInContext(extract('offerHomeScreen'), ctx);
  ctx.offerHomeScreen();
  return { shown: !ctx.homeScreen.hidden, ctx, persisted };
}
assert.equal(invite({}).shown, false, 'No install route, no promise');
assert.equal(invite({ deferred: true, asked: true }).shown, false, 'Only asked once');
assert.equal(invite({ deferred: true, standalone: true }).shown, false, 'Already installed');
{
  const { shown, ctx, persisted } = invite({ deferred: true });
  assert.ok(shown);
  assert.equal(ctx.homeAdd.hidden, false, 'One-tap install button');
  assert.equal(ctx.homeSteps.hidden, true);
  assert.equal(ctx.save.homeAsked, true);
  assert.equal(persisted, 1);
}
{
  const { shown, ctx } = invite({ iOS: true });
  assert.ok(shown);
  assert.equal(ctx.homeAdd.hidden, true, 'iOS has no prompt to trigger');
  assert.match(ctx.homeSteps.innerHTML, /Add to Home Screen/);
}
assert.match(invite({ inAppAndroid: true }).ctx.homeSteps.innerHTML, /Open in Chrome/);
assert.match(script, /if \(i === 1\) offerHomeScreen\(\);/, 'Offered when level 2 starts');

console.log('Black ring and home screen checks passed.');
