// Build a 300 ms entry effect from the CC0 source documented in audio/CREDITS.md.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'audio');
const wav = fs.readFileSync(path.join(root, 'bubbles-source.wav'));
let format, bytes;
for (let offset = 12; offset + 8 <= wav.length;) {
  const id = wav.toString('ascii', offset, offset + 4),
    size = wav.readUInt32LE(offset + 4);
  if (id === 'fmt ')
    format = {
      type: wav.readUInt16LE(offset + 8),
      channels: wav.readUInt16LE(offset + 10),
      rate: wav.readUInt32LE(offset + 12),
      bits: wav.readUInt16LE(offset + 22),
    };
  if (id === 'data') bytes = wav.subarray(offset + 8, offset + 8 + size);
  offset += 8 + size + (size % 2);
}
if (!format || format.type !== 1 || format.bits !== 16 || !bytes)
  throw new Error('Expected 16-bit PCM WAV');
const frames = bytes.length / (2 * format.channels),
  samples = new Float32Array(frames);
for (let i = 0; i < frames; i++) {
  for (let ch = 0; ch < format.channels; ch++)
    samples[i] += bytes.readInt16LE((i * format.channels + ch) * 2) / 32768 / format.channels;
}
// Locate the strongest short stretch of the natural bubble resonance.
const window = Math.min(frames, Math.floor(format.rate * 0.12));
let energy = 0,
  bestEnergy = -1,
  bestStart = 0;
for (let i = 0; i < frames; i++) {
  energy += samples[i] ** 2;
  if (i >= window) energy -= samples[i - window] ** 2;
  if (i >= window - 1 && energy > bestEnergy) {
    bestEnergy = energy;
    bestStart = i - window + 1;
  }
}
const rate = 44100,
  output = new Float32Array(Math.round(rate * 0.3));
const ratios = [1, 1.12, 1.26];
for (let b = 0; b < 3; b++) {
  const start = Math.round(b * 0.1 * rate),
    length = Math.round(0.09 * rate);
  for (let i = 0; i < length; i++) {
    const position = bestStart + (i / rate) * format.rate * ratios[b],
      index = Math.floor(position),
      fraction = position - index;
    if (index + 1 >= frames) break;
    const fade = Math.min(1, i / (rate * 0.006), (length - 1 - i) / (rate * 0.01));
    output[start + i] =
      ((samples[index] || 0) * (1 - fraction) + (samples[index + 1] || 0) * fraction) * fade;
  }
}
const peak = output.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
if (!peak) throw new Error('Silent source');
const result = Buffer.alloc(44 + output.length * 2);
result.write('RIFF', 0);
result.writeUInt32LE(result.length - 8, 4);
result.write('WAVEfmt ', 8);
result.writeUInt32LE(16, 16);
result.writeUInt16LE(1, 20);
result.writeUInt16LE(1, 22);
result.writeUInt32LE(rate, 24);
result.writeUInt32LE(rate * 2, 28);
result.writeUInt16LE(2, 32);
result.writeUInt16LE(16, 34);
result.write('data', 36);
result.writeUInt32LE(output.length * 2, 40);
for (let i = 0; i < output.length; i++)
  result.writeInt16LE(Math.round((output[i] / peak) * 0.6 * 32767), 44 + i * 2);
fs.writeFileSync(path.join(root, 'bubbles-entry.wav'), result);
console.log(
  `Built 300 ms sampled water effect from ${Math.round((frames / format.rate) * 1000)} ms source.`
);
