# Water bubble audio

## Current entry sound

`transition-reference.mp3` is the user-provided `spongebob-bubble-transition.mp3`.
The current game plays `spongebob-transition-short.mp3`: a continuous 300 ms cut
after leading silence, with its original pitch, speed, and stereo sound.
Rebuild it with `node tools/trim-transition.js`.
`bubbles-entry.wav` is the previous processed excerpt and is no longer played.
This user-provided reference is separate from the CC0 source below.

## Previous CC0 source

Source: **Bubble Sound Effects** by BMacZero / Brian MacIntosh.

- Source page: https://opengameart.org/content/bubble-sound-effects
- Original file: https://opengameart.org/sites/default/files/bubbles-single1.wav
- License: CC0 1.0 — https://creativecommons.org/publicdomain/zero/1.0/

`bubbles-source.wav` is the unmodified download. The previous entry effect used three
short excerpts with slight pitch increases, rounded fades, and normalization.
The resulting effect is 300 ms long. Rebuild with `node tools/build-bubble-audio.js`.
