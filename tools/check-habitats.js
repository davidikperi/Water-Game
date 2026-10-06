const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = vm.createContext({
  W: 360,
  H: 480,
  TOP: 12,
  li: 0,
  TH: { weeds: ['#00aa88'], glow: 0 },
  rnd: (a, b) => (a + b) / 2,
  pick: (a) => a[0],
  fish: [],
  turtles: [],
  jellies: [],
  crabs: [],
  stars: [],
  weeds: [],
  plankton: [],
});
vm.runInContext(fs.readFileSync(path.join(root, 'js/habitats.js'), 'utf8'), context);
const source = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8');
const tail = source.slice(source.indexOf('function spawnCreatures(')),
  end = tail.match(/\n  \}/);
vm.runInContext(tail.slice(0, end.index + end[0].length), context);
let paths = 0;
const canvas = new Proxy(
  {},
  { get: (_, key) => (key === 'beginPath' ? () => paths++ : () => {}), set: () => true }
);
const scenes = new Set(),
  species = new Set(),
  palettes = new Set();
for (let level = 0; level < 120; level++) {
  const habitat = context.WaterHabitats.profile(level);
  scenes.add(habitat.scenery);
  palettes.add(habitat.nightPalette.join(','));
  for (const width of [360, 800]) {
    context.W = width;
    context.li = level;
    context.spawnCreatures();
    assert.equal(context.turtles.length, habitat.turtles);
    assert.equal(context.crabs.length, habitat.crabs);
    assert.ok(context.fish.length > 0 && context.fish.length <= 16);
    for (const f of context.fish) {
      species.add(f.species);
      assert.ok(habitat.fish.includes(f.species));
      assert.equal(context.WaterHabitats.drawSwimmer(canvas, f, 0.5), f.species !== 'reef');
    }
    for (const night of [false, true])
      context.WaterHabitats.drawBackground(canvas, habitat, width, 480, 0.5, night);
  }
}
assert.equal(scenes.size, 6);
assert.equal(species.size, 5);
assert.ok(palettes.size >= 6);
assert.ok(paths > 100);
assert.notEqual(context.WaterHabitats.profile(0).seed, context.WaterHabitats.profile(1).seed);
console.log(
  'Passed: all 120 habitat profiles, distinct scenery/species, night palettes, and creature spawning.'
);
