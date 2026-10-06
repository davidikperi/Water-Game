// Sample the user's reference without changing its pitch or playback speed.
// Run: node tools/sample-transition.js
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ffmpeg = require('ffmpeg-static');
const root = path.join(__dirname, '..', 'audio');
const rate = 44100,
  length = Math.round(rate * 0.3);
const decoded = spawnSync(
  ffmpeg,
  [
    '-v',
    'error',
    '-i',
    path.join(root, 'transition-reference.mp3'),
    '-f',
    'f32le',
    '-ac',
    '1',
    '-ar',
    String(rate),
    'pipe:1',
  ],
  { windowsHide: true, maxBuffer: 20 * 1024 * 1024 }
);
if (decoded.status !== 0)
  throw new Error(decoded.stderr.toString() || 'Unable to decode reference');
const samples = Array.from({ length: decoded.stdout.length / 4 }, (_, i) =>
  decoded.stdout.readFloatLE(i * 4)
);
if (samples.length < length) throw new Error('Reference must be at least 300 ms');
// Pick an active 300 ms section, then round its edges to avoid edit clicks.
let energy = 0,
  bestEnergy = -1,
  bestStart = 0;
for (let i = 0; i < samples.length; i++) {
  energy += samples[i] ** 2;
  if (i >= length) energy -= samples[i - length] ** 2;
  if (i >= length - 1 && energy > bestEnergy) {
    bestEnergy = energy;
    bestStart = i - length + 1;
  }
}
const output = samples.slice(bestStart, bestStart + length);
for (let i = 0; i < length; i++)
  output[i] *= Math.min(1, i / (rate * 0.008), (length - 1 - i) / (rate * 0.012));
const peak = output.reduce((max, s) => Math.max(max, Math.abs(s)), 0);
if (!peak) throw new Error('Silent reference');
const wav = Buffer.alloc(44 + length * 2);
wav.write('RIFF', 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(length * 2, 40);
for (let i = 0; i < length; i++)
  wav.writeInt16LE(Math.round((output[i] / peak) * 0.6 * 32767), 44 + i * 2);
fs.writeFileSync(path.join(root, 'bubbles-entry.wav'), wav);
console.log(
  `Sampled 300 ms at ${(bestStart / rate).toFixed(3)}s from the user-provided clip; original speed and pitch preserved.`
);
