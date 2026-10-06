// Run with: node tools/check-music.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8');
const audioSource = html.slice(
  html.indexOf('let actx = null;'),
  html.indexOf('let noiseBuf = null;')
);
const musicSource = html.slice(
  html.indexOf('const music = {'),
  html.indexOf('function toggleMusic()')
);
let resumes = 0,
  timers = 0;
const context = {
  state: 'running',
  currentTime: 0,
  destination: {},
  resume() {
    resumes++;
    this.state = 'running';
    return Promise.resolve();
  },
  createGain() {
    return {
      connect() {},
      gain: {
        cancelScheduledValues() {},
        setValueAtTime() {},
        exponentialRampToValueAtTime() {},
      },
    };
  },
};
const sandbox = vm.createContext({
  save: { muted: true, music: true },
  gameEl: { hidden: true },
  window: {
    AudioContext: function () {
      return context;
    },
  },
  setTimeout() {
    timers++;
    return timers;
  },
});
vm.runInContext(audioSource + musicSource + '\nmusic.schedule = () => {};', sandbox);
assert.equal(vm.runInContext('audio()', sandbox), null, 'Effects stay muted');
vm.runInContext('music.start()', sandbox);
assert.equal(vm.runInContext('music.playing', sandbox), true, 'Music starts with effects muted');
assert.equal(timers, 1);
for (const state of ['suspended', 'interrupted']) {
  context.state = state;
  vm.runInContext('music.start()', sandbox);
  assert.equal(context.state, 'running', 'A subsequent gesture resumes playback');
}
assert.equal(resumes, 2);
assert.equal(timers, 1, 'Resuming does not start duplicate music loops');
vm.runInContext('save.music = false; music.playing = false; music.start()', sandbox);
assert.equal(vm.runInContext('music.playing', sandbox), false, 'Music off stays off');
vm.runInContext('save.muted = false', sandbox);
assert.equal(vm.runInContext('audio()', sandbox), context, 'Effects work with music off');
console.log(
  'Passed: independent music/effects settings and suspended/interrupted playback recovery.'
);
