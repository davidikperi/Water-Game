// Makes a copy of index.html for the claude.ai artifact viewer, which wraps pages in its own
// <html>/<head>/<body> and can't serve the manifest or icon files.
// Usage: node tools/build-artifact.js <output.html>
const fs = require('fs');
const path = require('path');

const out = process.argv[2];
if (!out) {
  console.error('Usage: node tools/build-artifact.js <output.html>');
  process.exit(1);
}

let s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
s = s.replace(
  /<link rel="stylesheet" href="(css\/[^"]+)"\s*\/?\s*>/g,
  (_, file) =>
    '<style>\n' + fs.readFileSync(path.join(__dirname, '..', file), 'utf8') + '\n</style>'
);
s = s.replace(
  /<script src="(js\/[^"]+)"><\/script>/g,
  (_, file) =>
    '<script>\n' + fs.readFileSync(path.join(__dirname, '..', file), 'utf8') + '\n</script>'
);
s = s.replace(
  'audio/spongebob-transition-short.mp3',
  'data:audio/mpeg;base64,' +
    fs
      .readFileSync(path.join(__dirname, '..', 'audio', 'spongebob-transition-short.mp3'))
      .toString('base64')
);
const drop = [
  /^\s*<!doctype html>\s*$/im,
  /^\s*<html[^>]*>\s*$/im,
  /^\s*<head>\s*$/im,
  /^\s*<\/head>\s*$/im,
  /^\s*<body>\s*$/im,
  /^\s*<\/body>\s*$/im,
  /^\s*<\/html>\s*$/im,
  /^\s*<meta charset[^>]*>\s*$/im,
  /^\s*<meta name="viewport"[^>]*>\s*$/im,
  /^\s*<link rel="manifest"[^>]*>\s*$/im,
  /^\s*<link rel="icon"[^>]*>\s*$/im,
  /^\s*<link rel="apple-touch-icon"[^>]*>\s*$/im,
];
for (const re of drop) {
  if (!re.test(s)) throw new Error('Expected line not found: ' + re);
  s = s.replace(re, '');
}
s = s.replace(/\n{3,}/g, '\n\n').replace(/^\s+/, '');
if (!s.startsWith('<title>')) throw new Error('Artifact page must start with its <title>');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, s);
console.log('wrote', out);
