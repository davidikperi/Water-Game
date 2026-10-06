const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const { spawnSync } = require('node:child_process');
const decoded = spawnSync(
  require('ffmpeg-static'),
  [
    '-v',
    'error',
    '-i',
    path.join(root, 'audio/spongebob-transition-short.mp3'),
    '-f',
    'f32le',
    '-ac',
    '1',
    '-ar',
    '44100',
    'pipe:1',
  ],
  { windowsHide: true }
);
assert.equal(decoded.status, 0);
assert.equal(decoded.stdout.length / 4 / 44100, 0.3);
let peak = 0;
for (let offset = 0; offset < decoded.stdout.length; offset += 4) {
  const value = decoded.stdout.readFloatLE(offset);
  assert.ok(Number.isFinite(value));
  peak = Math.max(peak, Math.abs(value));
}
assert.ok(peak > 0.01, 'The trimmed MP3 is audible');
let plays = 0;
const context = vm.createContext({
  save: { muted: false },
  Audio: class {
    constructor(url) {
      assert.equal(url, 'audio/spongebob-transition-short.mp3');
    }
    cloneNode() {
      return {
        volume: 0,
        play() {
          plays++;
          return Promise.resolve();
        },
      };
    }
  },
});
const source = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8');
vm.runInContext(
  source.slice(source.indexOf('const entrySound ='), source.indexOf('const sfx =')),
  context
);
context.waterEntry();
assert.equal(plays, 1);
context.save.muted = true;
context.waterEntry();
assert.equal(plays, 1);
console.log('Passed: shortened original MP3 duration, audible audio, and mute handling.');
