// Trim the original MP3 directly; keep its stereo sound, pitch, and speed.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ffmpeg = require('ffmpeg-static');
const input = process.argv[2] || path.join(__dirname, '..', 'audio', 'transition-reference.mp3');
const output = path.join(__dirname, '..', 'audio', 'spongebob-transition-short.mp3');
const decoded = spawnSync(
  ffmpeg,
  ['-v', 'error', '-i', input, '-f', 'f32le', '-ac', '1', '-ar', '44100', 'pipe:1'],
  { windowsHide: true, maxBuffer: 20 * 1024 * 1024 }
);
if (decoded.status !== 0) throw new Error(decoded.stderr.toString());
// Remove leading silence only, then take a continuous 300 ms section.
let start = 0;
for (let offset = 0; offset < decoded.stdout.length; offset += 4) {
  if (Math.abs(decoded.stdout.readFloatLE(offset)) > 0.015) {
    start = Math.max(0, offset / 4 / 44100 - 0.005);
    break;
  }
}
const trimmed = spawnSync(
  ffmpeg,
  [
    '-v',
    'error',
    '-y',
    '-ss',
    String(start),
    '-i',
    input,
    '-t',
    '0.3',
    '-c:a',
    'libmp3lame',
    '-q:a',
    '2',
    output,
  ],
  { windowsHide: true }
);
if (trimmed.status !== 0) throw new Error(trimmed.stderr.toString());
if (!fs.statSync(output).size) throw new Error('Empty output');
console.log(`Trimmed original MP3 at ${start.toFixed(3)}s to 300 ms without sound processing.`);
