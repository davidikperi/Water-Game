(() => {
  'use strict';

  /* ================= Constants ================= */
  const TAU = Math.PI * 2;
  const DESIGN_W = 360,
    DESIGN_H = 480; // the smallest world the levels are built for; the screen adds space around it
  const RX = 17; // ring radius
  const RING_REST = 5;
  const G = 62; // sinking acceleration in water
  const PEG_GAP = 76; // peg tip distance from centre
  const NOZ_GAP = 101; // jet distance from centre
  const LEAN = 48; // sideways lean of each peg: bases sit near the centre, tips lean out (a V)
  let CATCH_X = 26; // horizontal catch distance from a peg tip (set per level)
  const COLORS = {
    red: ['#ef3b3b', '#a51d1d'],
    yellow: ['#ffd23f', '#c79a00'],
    green: ['#33c96a', '#1b8743'],
    blue: ['#3b6ff0', '#1f43a8'],
    purple: ['#9b5cf6', '#6531b8'],
    orange: ['#ff8a1f', '#c25800'],
    pink: ['#ff5fa8', '#c02a70'],
    odd: ['#3b3846', '#16141c'], // black spoiler ring
  };
  const CYCLE = ['red', 'yellow', 'green', 'blue', 'orange', 'purple', 'pink'];

  // Every level has two pegs.
  const P2 = (extra, a, b) => [
    Object.assign({ off: -PEG_GAP, depth: 188, c: a }, extra),
    Object.assign({ off: PEG_GAP, depth: 188, c: b }, extra, extra.amp ? { ph: Math.PI } : {}),
  ];
  const many = (n, ...cols) => cols.flatMap((c) => Array(n).fill(c));
  /* Levels are generated, so the count can grow by raising LEVEL_COUNT. Difficulty ramps steadily with d (0 to 1):
   taller pegs, smaller catch zone, more rings, less time per ring. Pegs never pull rings in.
   Every 5th level is a speed round: white pegs, lots of rings, land a target number before time runs out.
   Normal levels rotate objectives and always carry black "odd" rings: landing one on a peg loses the level. */
  const LEVEL_COUNT = 120;
  const PEG_COLOURS = [
    ['red', 'blue'],
    ['yellow', 'green'],
    ['pink', 'blue'],
    ['red', 'orange'],
    ['purple', 'yellow'],
    ['blue', 'green'],
    ['orange', 'pink'],
    ['green', 'purple'],
  ];
  const NAME_A = [
    'Calm',
    'Bubbly',
    'Sunny',
    'Breezy',
    'Misty',
    'Wavy',
    'Swirly',
    'Choppy',
    'Glassy',
    'Stormy',
    'Deep',
    'Wild',
  ];
  const NAME_B = [
    'Lagoon',
    'Reef',
    'Cove',
    'Bay',
    'Creek',
    'Harbour',
    'Shallows',
    'Tide',
    'Pond',
    'Current',
    'Rapids',
    'Trench',
  ];
  function makeLevel(n) {
    // n is 1-based
    const d = (n - 1) / (LEVEL_COUNT - 1);
    const L = { depth: Math.round(188 + 45 * d), catchX: 34 - 16 * d, odd: 0 };
    if (n % 5 === 0) {
      const r = n / 5,
        dr = (r - 1) / Math.max(1, Math.floor(LEVEL_COUNT / 5) - 1);
      const count = 16 + 2 * Math.min(r, 10);
      L.speed = true;
      L.name = `Speed Round ${r}`;
      L.target = Math.round(count * (0.3 + 0.4 * dr));
      L.time = Math.round(75 - 35 * dr);
      L.rings = Array.from({ length: count }, (_, k) => CYCLE[k % CYCLE.length]);
      L.pegs = P2({ depth: L.depth });
      L.hint = `Speed round! White pegs take any ring. Land ${L.target} of ${count} rings before the clock runs out.`;
      return L;
    }
    const k = n - Math.floor(n / 5); // position among normal levels
    const count = Math.min(22, 6 + Math.floor(n / 6));
    const type = n <= 2 ? 'all' : ['all', 'match', 'count'][k % 3];
    L.odd = 1 + ((k * 7 + 3) % (2 + Math.floor(n / 25))); // varies level to level; the possible maximum grows (2, 3, 4...)
    L.name = `${NAME_A[k % NAME_A.length]} ${NAME_B[Math.floor(k / NAME_A.length) % NAME_B.length]}`;
    L.time = Math.round(count * (14 - 9 * d) + 20);
    L.oddCatch = 0.4 + 0.6 * d; // black rings land less easily early on, as easily as any ring by the end
    if (type === 'match') {
      const [c1, c2] = PEG_COLOURS[k % PEG_COLOURS.length];
      L.rings = many(Math.ceil(count / 2), c1, c2);
      L.pegs = P2({ depth: L.depth }, c1, c2);
      L.hint = 'Put each ring on the peg with its own colour.';
      L.time = Math.round(L.time * 1.8); // finding the right peg takes longer
    } else {
      L.rings = Array.from({ length: count }, (_, j) => CYCLE[(j + k) % CYCLE.length]);
      L.pegs = P2({ depth: L.depth });
      if (type === 'count') {
        L.target = Math.round(count * (0.8 + 0.15 * d));
        L.hint = `Land ${L.target} of the ${count} rings.`;
      } else L.hint = `Get all ${count} rings onto the pegs.`;
    }
    if (n > 12 && k % 4 === 1) {
      L.current = Math.round(6 + 22 * d);
      L.hint += ' A current sways the water.';
    }
    if (n > 20 && k % 5 === 3) {
      L.pumps = Math.round(count * 9 * (1.3 - 0.4 * d));
      L.hint += ` Only ${L.pumps} pumps.`;
    }
    // From the Kelp Forest on, some levels sway their pegs side to side (never alongside a current or pump limit).
    if (n > 40 && k % 4 === 3 && !L.pumps) {
      const m = (n - 41) / (LEVEL_COUNT - 41);
      const amp = Math.round(14 + 20 * m),
        spd = TAU / (9 - 4 * m); // a full sway every 9 s, down to 5 s
      L.pegs.forEach((p, i) => Object.assign(p, { amp, spd, ph: i ? Math.PI : 0 })); // opposite directions
      L.moving = true;
      L.odd = 1; // a sliding tip can catch a sinking black ring, so keep it to one, and harder to land
      L.oddCatch *= 0.6;
      L.hint += ' The pegs sway!';
    }
    L.hint += ` Keep the black ${L.odd === 1 ? 'ring' : 'rings'} off the pegs: one landing ends the level!`;
    return L;
  }
  const LEVELS = Array.from({ length: LEVEL_COUNT }, (_, i) => makeLevel(i + 1));

  // Each zone of 20 levels has its own water; some levels in the brighter zones are night dives.
  const THEMES = [
    {
      name: 'Sunny Shallows',
      top: '#8be6f3',
      mid: '#33b6db',
      bot: '#1670ad',
      sand: '#f2c66b',
      weeds: ['#1f9e6a', '#22a874', '#178a5c'],
      ray: 0.09,
      rayCol: '#ffffff',
    },
    {
      name: 'Coral Garden',
      top: '#a4f2e4',
      mid: '#2fc2c9',
      bot: '#157e9c',
      sand: '#f8d08e',
      weeds: ['#ff7aa8', '#ff9a5c', '#ffb3c9'],
      ray: 0.09,
      rayCol: '#fffbe0',
    },
    {
      name: 'Kelp Forest',
      top: '#b4ecc2',
      mid: '#3aa88a',
      bot: '#195a5e',
      sand: '#d8c07a',
      weeds: ['#2e8b57', '#3fae6a', '#226b45'],
      ray: 0.11,
      rayCol: '#fff4b8',
    },
    {
      name: 'Twilight Reef',
      top: '#c2a8f4',
      mid: '#6a6fd6',
      bot: '#2b2d8c',
      sand: '#caa98e',
      weeds: ['#9b6bd6', '#c38ae6', '#ff8fc8'],
      ray: 0.07,
      rayCol: '#ffd6f0',
    },
    {
      name: 'Deep Trench',
      top: '#3f72b4',
      mid: '#1f3f80',
      bot: '#0b183c',
      sand: '#6d7898',
      weeds: ['#2c8f9a', '#3aa8a0', '#4f7bd0'],
      ray: 0.04,
      rayCol: '#bfe0ff',
      glow: 30,
    },
    {
      name: 'Abyss Glow',
      top: '#1f2d6e',
      mid: '#11164a',
      bot: '#050720',
      sand: '#383d66',
      weeds: ['#38f0c8', '#7a6bff', '#ff5fd2'],
      ray: 0,
      rayCol: '#ffffff',
      glow: 60,
      night: true,
    },
  ];
  const NIGHT = {
    top: '#22346f',
    mid: '#141f58',
    bot: '#080f33',
    ray: 0.05,
    rayCol: '#cfe0ff',
    glow: 45,
    night: true,
    moon: true,
  };
  // Follow the player's device clock: night runs from 6 pm until 6 am.
  function isNightTime(date = new Date()) {
    const hour = date.getHours();
    return hour >= 18 || hour < 6;
  }
  let nightNow = isNightTime();

  function themeFor(i) {
    const z = Math.min(THEMES.length - 1, Math.floor(i / 20)),
      base = THEMES[z];
    const habitat = WaterHabitats.profile(i);
    const n = i + 1;
    if (nightNow || (z < 4 && !(n % 5 === 0) && n % 6 === 4)) {
      // a night dive every few levels in the brighter zones
      return Object.assign({}, base, NIGHT, {
        top: habitat.nightPalette[0],
        mid: habitat.nightPalette[1],
        bot: habitat.nightPalette[2],
        name: 'Night ' + base.name.split(' ').pop(),
        weeds: base.weeds,
        sand: base.sand,
      });
    }
    return base;
  }
  let TH = THEMES[0],
    plankton = [];
  let goal = 0; // rings that must land this level
  const SPEED = 1.5; // ring and water physics run this much faster than real time; the clock does not
  const STAR3 = 0.35,
    STAR2 = 0.1; // fraction of time left

  /* ================= World geometry (resizes with the screen) ================= */
  let W = DESIGN_W,
    H = DESIGN_H,
    CX = W / 2,
    TOP = 12,
    JY = H - 4;
  let NOZ = [CX - NOZ_GAP, CX + NOZ_GAP];
  let FK = [];
  function buildFloor() {
    const edge = Math.min(70, 38 + Math.max(0, NOZ[0]) * 0.12);
    FK = [
      [0, H - edge],
      [NOZ[0], H - 8],
      [CX, H - 32],
      [NOZ[1], H - 8],
      [W, H - edge],
    ];
  }
  buildFloor();
  function floorY(x) {
    for (let i = 1; i < FK.length; i++) {
      if (x <= FK[i][0]) {
        const [x0, y0] = FK[i - 1],
          [x1, y1] = FK[i];
        return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
      }
    }
    return FK[FK.length - 1][1];
  }
  const wrapA = (a) => {
    while (a > Math.PI / 2) a -= Math.PI;
    while (a <= -Math.PI / 2) a += Math.PI;
    return a;
  };

  /* ================= Storage ================= */
  const KEY = 'watergame.v2';
  let save = { stars: [], muted: false };
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && Array.isArray(s.stars)) save = Object.assign(save, s);
  } catch (e) {}
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(save));
    } catch (e) {}
  }
  if (!save.playerId) {
    save.playerId =
      window.crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : 'diver-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    persist();
  }
  function track(event, level) {
    if (window.WaterAnalytics) WaterAnalytics.record(save, event, level);
  }
  track('session');
  const unlocked = (i) => i === 0 || (save.stars[i - 1] || 0) > 0;

  /* ================= Audio ================= */
  let actx = null;
  function audio(forMusic = false) {
    if (forMusic ? save.music === false : save.muted) return null;
    if (!actx) {
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        return null;
      }
    }
    if (actx.state === 'suspended' || actx.state === 'interrupted') actx.resume().catch(() => {});
    return actx;
  }
  let noiseBuf = null;
  function whoosh() {
    const a = audio();
    if (!a) return;
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = a.createBufferSource();
    src.buffer = noiseBuf;
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.4;
    const t = a.currentTime;
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(260, t + 0.35);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t);
    src.stop(t + 0.45);
  }
  // A short underwater jet, with irregular rising bubbles rather than an airy swoosh.
  function pumpWater() {
    const a = audio();
    if (!a) return;
    if (!noiseBuf) {
      noiseBuf = a.createBuffer(1, Math.ceil(a.sampleRate * 0.5), a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = a.currentTime,
      src = a.createBufferSource(),
      filter = a.createBiquadFilter(),
      g = a.createGain();
    src.buffer = noiseBuf;
    filter.type = 'lowpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(1700, t);
    filter.frequency.exponentialRampToValueAtTime(380, t + 0.32);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.28, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
    src.connect(filter).connect(g).connect(a.destination);
    src.start(t);
    src.stop(t + 0.4);
    for (let i = 0; i < 6; i++) {
      const bt = t + i * 0.046 + Math.random() * 0.016;
      const o = a.createOscillator(),
        bg = a.createGain(),
        f = 260 + Math.random() * 480;
      o.type = 'sine';
      o.frequency.setValueAtTime(f, bt);
      o.frequency.exponentialRampToValueAtTime(f * 1.9, bt + 0.045);
      bg.gain.setValueAtTime(0.0001, bt);
      bg.gain.exponentialRampToValueAtTime(0.065, bt + 0.008);
      bg.gain.exponentialRampToValueAtTime(0.0001, bt + 0.075);
      o.connect(bg).connect(a.destination);
      o.start(bt);
      o.stop(bt + 0.08);
    }
  }
  function tone(freq, start, dur, type, vol, slideTo) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + start;
    const o = a.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  const entrySound = new Audio('audio/spongebob-transition-short.mp3');
  entrySound.preload = 'auto';
  function waterEntry() {
    if (save.muted) return;
    const sound = entrySound.cloneNode();
    sound.volume = 0.7;
    sound.play().catch(() => {});
  }
  const sfx = {
    entry() {
      waterEntry();
    },
    plink() {
      tone(880, 0, 0.12, 'triangle', 0.18, 1320);
      tone(1320, 0.07, 0.18, 'sine', 0.12);
    },
    bonk() {
      tone(240, 0, 0.12, 'square', 0.05, 160);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25, 'triangle', 0.16));
    },
    boop(pitch) {
      tone(420 * pitch, 0, 0.09, 'sine', 0.09, 620 * pitch);
    },
    mega() {
      whoosh();
      tone(110, 0, 0.5, 'sawtooth', 0.08, 440);
      const a = audio();
      if (a) setTimeout(whoosh, 90);
    },
    bust() {
      tone(150, 0, 0.22, 'square', 0.09, 70);
      tone(95, 0.05, 0.35, 'sawtooth', 0.07, 45);
    },
    lose() {
      tone(330, 0, 0.3, 'sawtooth', 0.06, 160);
      tone(220, 0.25, 0.45, 'sawtooth', 0.05, 110);
    },
  };

  /* ================= DOM ================= */
  const $ = (id) => document.getElementById(id);
  const menuEl = $('menu'),
    gameEl = $('game'),
    overlay = $('overlay'),
    tank = $('tank');
  const canvas = $('c'),
    ctx = canvas.getContext('2d');
  const hudLevel = $('hudLevel'),
    hudRings = $('hudRings'),
    hudPumps = $('hudPumps'),
    hudTime = $('hudTime');
  const pumpBtns = [$('bL'), $('bR')];

  const fmt = (s) => {
    s = Math.max(0, Math.ceil(s));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  const starStr = (n) => '★'.repeat(n) + '<span class="off">' + '★'.repeat(3 - n) + '</span>';

  function renderMenu() {
    let total = 0,
      nextIdx = -1;
    LEVELS.forEach((L, i) => {
      const st = save.stars[i] || 0;
      total += st;
      if (nextIdx < 0 && unlocked(i) && !st) nextIdx = i;
    });
    $('playBtn').innerHTML =
      total === 0
        ? 'TAP TO START!'
        : `TAP TO CONTINUE!<small>LEVEL ${(nextIdx >= 0 ? nextIdx : LEVELS.length - 1) + 1}</small>`;
    if (save.name)
      ($('playBtn').insertAdjacentHTML('afterbegin', '<small class="hi"></small>'),
        ($('playBtn').querySelector('.hi').textContent = 'HI, ' + save.name.toUpperCase() + '!'));
    $('playBtn').onclick = () => startFromTitle();
  }

  function syncSoundBtns() {
    for (const id of ['soundBtnMenu', 'mapSound', 'soundBtnGame']) {
      const b = $(id);
      b.classList.toggle('off', save.muted);
      b.setAttribute('aria-label', save.muted ? 'Sound effects off' : 'Sound effects on');
    }
    for (const id of ['musicBtnMenu', 'mapMusic']) {
      const b = $(id);
      b.classList.toggle('off', save.music === false);
      b.setAttribute('aria-label', save.music === false ? 'Music off' : 'Music on');
    }
  }
  function toggleSound() {
    save.muted = !save.muted;
    persist();
    syncSoundBtns();
    if (!save.muted) audio();
  }
  $('soundBtnMenu').addEventListener('click', toggleSound);
  $('soundBtnGame').addEventListener('click', toggleSound);

  const fsBtn = $('fsBtn');
  if (document.fullscreenEnabled) {
    fsBtn.hidden = false;
    fsBtn.addEventListener('click', () => {
      try {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else document.documentElement.requestFullscreen().catch(() => {});
      } catch (e) {}
    });
  }

  let resetArmed = false;
  $('resetBtn').addEventListener('click', (e) => {
    const b = e.currentTarget;
    if (!resetArmed) {
      resetArmed = true;
      b.textContent = 'Tap again to erase all stars';
      b.classList.add('warn');
      b.classList.remove('ghost');
      setTimeout(() => {
        resetArmed = false;
        b.textContent = 'Reset progress';
        b.classList.remove('warn');
        b.classList.add('ghost');
      }, 3500);
      return;
    }
    save.stars = [];
    save.at = 0;
    avatarAt = 0;
    persist();
    resetArmed = false;
    b.textContent = 'Progress erased';
    b.classList.remove('warn');
    b.classList.add('ghost');
    setTimeout(() => {
      b.textContent = 'Reset progress';
    }, 1500);
    renderMenu();
  });

  /* ================= Game state ================= */
  let L = null,
    li = 0;
  let rings = [],
    pegs = [],
    bubbles = [],
    sparks = [];
  let fish = [],
    jellies = [],
    turtles = [],
    crabs = [],
    stars = [],
    weeds = [];
  let jets = [
    { held: false, t: 0, p: 0 },
    { held: false, t: 0, p: 0 },
  ];
  let phase = 'menu'; // intro | play | busted | won | lost | paused (busted: a black ring just landed)
  let simT = 0,
    timeLeft = 0,
    pumpsLeft = Infinity,
    winT = 0,
    idleT = 0,
    bustT = 0,
    running = false;

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function placePegs() {
    for (const p of pegs) {
      p.bx = CX + p.off;
      p.tip = H - p.depth;
    }
    updatePegs();
  }
  function updatePegs() {
    for (const p of pegs) {
      p.x = p.bx + (p.amp ? p.amp * Math.sin(simT * p.spd + p.ph) : 0);
      p.sx = p.x - Math.sign(p.off) * LEAN; // base sits nearer the centre
      p.sy = floorY(p.sx) - 4;
      // rings sit perpendicular to the rod
      p.ang = wrapA(Math.atan2(p.tip - p.sy, p.x - p.sx) + Math.PI / 2);
    }
  }
  const rodX = (p, y) => p.sx + ((p.x - p.sx) * (p.sy - y)) / (p.sy - p.tip);

  function spawnCreatures() {
    const area = W * H;
    const habitat = WaterHabitats.profile(li);
    const fishCols = habitat.colours.map((c) => [c, '#fff2d6']);
    fish = Array.from(
      { length: Math.min(16, habitat.count + Math.round(area / 90000)) },
      (_, i) => {
        const [c, c2] = pick(fishCols);
        const y = rnd(TOP + 40, H - 210);
        return {
          x: rnd(0, W),
          y,
          cy: y,
          d: Math.random() < 0.5 ? -1 : 1,
          s: rnd(8, 16),
          v: rnd(14, 34),
          c,
          c2,
          ph: rnd(0, 6),
          boost: 0,
          hit: 0,
          species:
            i % 3 === 0
              ? habitat.species
              : habitat.fish[(i + habitat.variant) % habitat.fish.length],
        };
      }
    );
    jellies = Array.from({ length: habitat.jelly + (habitat.jelly && W > 600 ? 1 : 0) }, () => ({
      x: rnd(30, W - 30),
      y: rnd(TOP + 60, H * 0.45),
      cy: 0,
      squish: 0,
      hit: 0,
      s: rnd(12, 18),
      c: pick(['rgba(255,150,220,.8)', 'rgba(200,170,255,.8)', 'rgba(255,255,255,.7)']),
      ph: rnd(0, 6),
      vx: rnd(-6, 6),
    }));
    turtles = Array.from({ length: habitat.turtles }, (_, i) => ({
      active: false,
      wait: rnd(5, 15) + i * 12,
      burstCooldown: 0,
      x: -60,
      y: 0,
      cy: 0,
      hit: 0,
      d: 1,
      s: 16,
      v: 22,
      ph: rnd(0, 6),
    })); // appears sooner in turtle habitats
    crabs = Array.from({ length: habitat.crabs }, () => ({
      x: rnd(30, W - 30),
      d: 1,
      v: 16,
      t: rnd(1, 4),
      ph: 0,
    }));
    const nStars = habitat.zone < 4 ? Math.max(2, Math.round(W / 180)) : 0;
    stars = Array.from({ length: nStars }, (_, i) => {
      const x = ((i + 0.5) * W) / nStars + rnd(-30, 30);
      return { x, rot: rnd(0, 6), s: rnd(7, 10), c: pick(['#ff8a1f', '#ff5fa8', '#ffd23f']) };
    });
    const nWeeds = Math.round(habitat.weeds * Math.max(1, W / 360));
    weeds = Array.from({ length: nWeeds }, (_, i) => ({
      x: ((i + rnd(0.2, 0.8)) * W) / nWeeds,
      h: rnd(70, 170),
      c: pick(TH.weeds),
    }));
    plankton = Array.from({ length: TH.glow || 0 }, () => ({
      x: rnd(0, W),
      y: rnd(TOP, H - 40),
      r: rnd(0.8, 2.2),
      ph: rnd(0, 6),
      v: rnd(-4, 4),
      c: pick(['#7ffcff', '#a6ffcf', '#c9a7ff', '#ffffff']),
    }));
  }

  function startLevel(i) {
    audio();
    li = i;
    L = LEVELS[i];
    TH = themeFor(i);
    gameEl.style.background = TH.mid;
    menuEl.hidden = true;
    mapEl.hidden = true;
    gameEl.hidden = false;
    $('howSheet').hidden = true;
    avatarAt = i;
    save.at = i;
    document.documentElement.classList.add('playing');
    simT = 0;
    layout(true);
    pegs = L.pegs.map((p) => ({
      off: p.off,
      depth: p.depth,
      c: p.c || null,
      amp: p.amp || 0,
      spd: p.spd || 0,
      ph: p.ph || 0,
    }));
    placePegs();
    CATCH_X = L.catchX;
    goal = L.target || L.rings.length;
    const cols = L.rings.concat(Array(L.odd).fill('odd'));
    for (let k = cols.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [cols[k], cols[j]] = [cols[j], cols[k]];
    }
    rings = cols.map((c, k) => {
      const x = NOZ[k % 2] + (Math.random() - 0.5) * 50;
      return {
        x,
        y: floorY(x) - RING_REST - Math.random() * 40,
        py: 0,
        vx: 0,
        vy: 0,
        a: (Math.random() - 0.5) * 2.4,
        av: 0,
        phi: Math.random() * 6,
        c,
        odd: c === 'odd',
        peg: -1,
        flash: 0,
        open: 0,
        cool: 0,
      };
    });
    bubbles = [];
    sparks = [];
    spawnCreatures();
    jets.forEach((j) => {
      j.held = false;
      j.t = 0;
      j.p = 0;
    });
    pumpBtns.forEach((b) => b.classList.remove('down'));
    timeLeft = L.time;
    pumpsLeft = L.pumps || Infinity;
    winT = 0;
    idleT = 0;
    bustT = 0;
    megaCharge = 1;
    shake = 0;
    hudLevel.textContent = `Level ${i + 1} · ${L.name}`;
    hudPumps.hidden = !L.pumps;
    showIntro();
    running = true;
    if (i === 1) offerHomeScreen(); // reaching level 2: invite them to keep the game one tap away
  }

  function backToMenu() {
    openMap();
  } // leaving a level goes to the level map
  $('backBtn').addEventListener('click', backToMenu);
  $('restartBtn').addEventListener('click', () => startLevel(li));

  /* ================= Overlays ================= */
  function showOverlay(html, kind) {
    overlay.classList.toggle('win', kind === 'win');
    overlay.innerHTML =
      kind === 'win' ? `<div class="celebrate">${html}</div>` : `<div class="ocard">${html}</div>`;
    overlay.hidden = false;
    overlay
      .querySelectorAll('[data-act]')
      .forEach((b) => b.addEventListener('click', () => act(b.dataset.act)));
    const p = overlay.querySelector('[data-primary]');
    if (p) setTimeout(() => p.focus({ preventScroll: true }), 30);
  }
  function act(a) {
    if (a === 'start') {
      track('start', li);
      music.duck();
      overlay.hidden = true;
      $('zones').hidden = true;
      phase = 'play';
      audio();
      keepAwake(true);
    } else if (a === 'retry') startLevel(li);
    else if (a === 'next')
      openMap({ travelTo: Math.min(li + 1, LEVELS.length - 1), start: true }); // swim to the next level first
    else if (a === 'menu') backToMenu();
    else if (a === 'resume') {
      overlay.hidden = true;
      phase = 'play';
    }
  }
  function showIntro() {
    phase = 'intro';
    const t3 = fmt(L.time * (1 - STAR3)),
      t2 = fmt(L.time * (1 - STAR2));
    const best = save.stars[li] || 0;
    showOverlay(`
    <span class="eyebrow">Level ${li + 1} of ${LEVELS.length} · ${TH.name}</span>
    <h3>${L.name}</h3>
    <p>${L.hint}</p>
    <p class="targets">★★★ finish within ${t3} · ★★ within ${t2}<br>Time limit ${fmt(L.time)}${L.pumps ? ` · ${L.pumps} pumps` : ''}${best ? ` · Best ${'★'.repeat(best)}` : ''}</p>
    <div class="actions"><button class="btn big" data-act="start" data-primary type="button">Start</button></div>
    <span class="keys">${isTouch ? 'Press the yellow pumps, or tap the left or right half of the water. The orange MEGA button blasts every loose ring upward, then recharges.' : 'Keys: A or ← left pump · L or → right pump · Space for MEGA burst. You can also click either half of the water.'}</span>`);
    $('zones').hidden = !isTouch;
  }
  function showWin(st) {
    const last = li === LEVELS.length - 1;
    const cols = ['#ffd23f', '#ff5fa8', '#33c96a', '#3b6ff0', '#ff8a1f', '#9b5cf6', '#ffffff'];
    const confetti = Array.from(
      { length: 36 },
      () =>
        `<i style="left:${rnd(0, 100).toFixed(1)}%;background:${pick(cols)};--dx:${rnd(-60, 60).toFixed(0)}px;--rot:${rnd(360, 1080).toFixed(0)}deg;animation-duration:${rnd(2.2, 3.8).toFixed(2)}s;animation-delay:${rnd(0.3, 1.2).toFixed(2)}s"></i>`
    ).join('');
    showOverlay(
      `
    <div class="rays" aria-hidden="true"></div>
    <div class="badge-star" aria-hidden="true"><span class="shine"></span><span class="num">${li + 1}</span></div>
    <div class="ribbon">${L.speed ? 'Speed Round Cleared!' : 'Level Completed!'}</div>
    <div class="win-stars" role="img" aria-label="${st} of 3 stars">${[1, 2, 3].map((k) => `<span class="${k <= st ? 'on' : ''}">★</span>`).join('')}</div>
    <p class="win-sub">Level ${li + 1} · ${L.name}<br>Done in <b>${fmt(L.time - timeLeft)}</b></p>
    ${last ? '<p class="win-sub">You have finished every level. Go back and collect any missing stars.</p>' : ''}
    <div class="win-actions">
      ${
        last
          ? '<button class="gbtn green" data-act="menu" data-primary type="button">Levels</button>'
          : `<button class="gbtn green" data-act="next" data-primary type="button">Next level<small>LEVEL ${li + 2}</small></button>`
      }
      <button class="gbtn blue" data-act="retry" type="button">Replay</button>
      ${last ? '' : '<button class="win-link" data-act="menu" type="button">All levels</button>'}
    </div>
    <div class="confetti" aria-hidden="true">${confetti}</div>`,
      'win'
    );
  }
  function showLose(reason) {
    showOverlay(`
    <span class="eyebrow">Level ${li + 1}</span>
    <h3>${reason === 'black' ? 'Black ring!' : reason === 'pumps' ? 'Out of pumps' : 'Time up'}</h3>
    <p>${reason === 'black' ? 'A black ring landed on a peg. Keep them off the pegs and try again.' : `${rings.filter(counts).length} of ${goal} rings landed. Try again.`}</p>
    <div class="actions">
      <button class="btn big" data-act="retry" data-primary type="button">Try again</button>
      <button class="btn ghost" data-act="menu" type="button">Levels</button>
    </div>`);
  }

  /* ================= Input ================= */
  function press(i) {
    if (phase !== 'play' || jets[i].held) return;
    if (pumpsLeft <= 0) return;
    pumpsLeft--;
    jets[i].held = true;
    jets[i].t = 0;
    pumpBtns[i].classList.add('down');
    pumpWater();
    if (navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch (e) {}
    }
  }
  function release(i) {
    jets[i].held = false;
    pumpBtns[i].classList.remove('down');
  }
  pumpBtns.forEach((b, i) => {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try {
        b.setPointerCapture(e.pointerId);
      } catch (_) {}
      press(i);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) =>
      b.addEventListener(ev, () => release(i))
    );
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  // Touch the water itself: left half fires the left jet, right half the right jet. Several fingers at once are fine.
  const tapSide = new Map();
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const side = e.clientX - r.left < r.width / 2 ? 0 : 1;
    tapSide.set(e.pointerId, side);
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}
    press(side);
  });
  const endTap = (e) => {
    const s = tapSide.get(e.pointerId);
    if (s === undefined) return;
    tapSide.delete(e.pointerId);
    if (![...tapSide.values()].includes(s)) release(s);
  };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) =>
    canvas.addEventListener(ev, endTap)
  );
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  const isTouch = window.matchMedia && matchMedia('(pointer: coarse)').matches;

  // keep the screen awake while a level is open (phones dim otherwise); fine if refused
  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && !wakeLock && navigator.wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          wakeLock = null;
        });
      } else if (!on && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch (e) {
      wakeLock = null;
    }
  }

  const megaBtn = $('megaBtn'),
    megaWell = $('megaWell'),
    megaLabel = $('megaLabel');
  megaBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    megaBurst();
  });
  megaBtn.addEventListener('click', (e) => {
    if (e.detail === 0) megaBurst();
  }); // keyboard activation
  megaBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  const MEGA_KEYS = { ' ': 1, w: 1, arrowup: 1, s: 1 };

  const KEYMAP = { a: 0, arrowleft: 0, z: 0, l: 1, arrowright: 1, m: 1 };
  addEventListener('keydown', (e) => {
    if (gameEl.hidden) return;
    const kk = e.key.toLowerCase();
    if (MEGA_KEYS[kk] && phase === 'play') {
      e.preventDefault();
      if (!e.repeat) megaBurst();
      return;
    }
    const k = KEYMAP[kk];
    if (k !== undefined) {
      e.preventDefault();
      if (!e.repeat) press(k);
    }
  });
  addEventListener('keyup', (e) => {
    const k = KEYMAP[e.key.toLowerCase()];
    if (k !== undefined) release(k);
  });
  addEventListener('blur', () => {
    release(0);
    release(1);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && phase === 'play') {
      phase = 'paused';
      release(0);
      release(1);
      showOverlay(`<span class="eyebrow">Paused</span><h3>Take a breath</h3>
      <div class="actions"><button class="btn big" data-act="resume" data-primary type="button">Resume</button>
      <button class="btn ghost" data-act="menu" type="button">Levels</button></div>`);
    }
  });

  /* ================= Physics ================= */
  const JET_TILT = 0.22; // about 12 degrees inward; vertical lift stays the same
  const jetDirection = (j) => (j === 0 ? 1 : -1);
  const jetCenter = (j, y) => NOZ[j] + jetDirection(j) * Math.max(0, JY - y) * JET_TILT;

  function jetForce(x, y) {
    let fx = 0,
      fy = 0,
      turb = 0;
    for (let j = 0; j < 2; j++) {
      const p = jets[j].p;
      if (p < 0.01) continue;
      const dy = JY - y;
      if (dy < -10) continue;
      const dx = x - jetCenter(j, y);
      const w = 26 + Math.max(0, dy) * 0.3;
      const f = Math.exp(-(dx * dx) / (w * w)) * Math.max(0, 1 - dy / (DESIGN_H * 1.08)) * p;
      fy -= 1650 * f;
      fx += (jetDirection(j) * 1650 * JET_TILT + (dx / w) * 240) * f;
      turb += f;
    }
    return [fx, fy, turb];
  }

  // Gently steer a descending ring toward the nearest compatible tip.
  // Forces fade at the edge of the small guidance area; landing still uses the normal catch rules.
  function ringGuidance(r) {
    if (phase !== 'play' || r.peg >= 0 || r.odd || r.cool > 0 || r.vy <= 0) return 0;
    const width = CATCH_X + 8,
      height = 36;
    let target = null,
      nearest = Infinity;
    for (const p of pegs) {
      if (p.c && p.c !== r.c) continue;
      const above = p.tip + 2 - r.y,
        dx = p.x - r.x;
      if (above <= 0 || above >= height || Math.abs(dx) >= width) continue;
      const distance = Math.hypot(dx, above);
      if (distance < nearest) {
        target = p;
        nearest = distance;
      }
    }
    if (!target) return 0;
    const dx = target.x - r.x,
      above = target.tip + 2 - r.y;
    const strength = 0.25 * (1 - Math.abs(dx) / width) * (1 - above / height);
    return Math.max(-30, Math.min(30, (dx * 12 - r.vx * 2.4) * strength));
  }

  function step(hReal) {
    const h = hReal * SPEED; // physics time
    simT += hReal;
    updatePegs();

    for (let j = 0; j < 2; j++) {
      const J = jets[j];
      if (J.held) J.t += h;
      const target = J.held ? (J.t < 0.32 ? 1 : 0.38) : 0;
      J.p += (target - J.p) * Math.min(1, h * 20);
      if (J.p > 0.05 && Math.random() < J.p * 0.9) {
        bubbles.push({
          x: NOZ[j] + (Math.random() - 0.5) * 14,
          y: JY - 4,
          vx: jetDirection(j) * 80 * J.p + (Math.random() - 0.5) * 60,
          vy: -120 - Math.random() * 260 * J.p,
          r: 1.5 + Math.random() * 3.5,
          life: 1,
        });
      }
    }
    if (Math.random() < h * (1 + W / 300))
      bubbles.push({
        x: Math.random() * W,
        y: H - 20,
        vx: 0,
        vy: -30,
        r: 1 + Math.random() * 2,
        life: 1.4,
      });

    for (const r of rings) {
      r.py = r.y;
      if (r.flash > 0) r.flash -= h;
      r.open += ((r.peg >= 0 ? 1 : 0) - r.open) * Math.min(1, h * 8);
      if (r.peg < 0) {
        const [fx, fy, tb] = jetForce(r.x, r.y);
        let ax = fx + (Math.random() - 0.5) * 500 * tb,
          ay = G + fy;
        if (L.current) ax += L.current * Math.sin(simT * 0.55);
        const fl = floorY(r.x) - RING_REST;
        if (r.y > fl - 18) {
          const nx = r.x < CX ? NOZ[0] : NOZ[1];
          ax += (nx - r.x) * 2.2;
        }
        // Only assist while sinking; upward pump force keeps full control of the ring.
        if (ay > 0) ax += ringGuidance(r);
        r.vx += ax * h;
        r.vy += ay * h;
        const d = Math.exp(-1.9 * h);
        r.vx *= d;
        r.vy *= d;
        r.av += ((Math.random() - 0.5) * 900 * tb - 3.2 * Math.sin(2 * r.a)) * h;
        r.av *= Math.exp(-2.2 * h);
        const sp = Math.hypot(r.vx, r.vy);
        if (sp > 520) {
          r.vx *= 520 / sp;
          r.vy *= 520 / sp;
        }
        r.x += r.vx * h;
        r.y += r.vy * h;
        r.a = wrapA(r.a + r.av * h);
        r.phi += (r.av * 0.7 + 0.4) * h;

        if (r.x < RX + 2) {
          r.x = RX + 2;
          r.vx = Math.abs(r.vx) * 0.4;
        }
        if (r.x > W - RX - 2) {
          r.x = W - RX - 2;
          r.vx = -Math.abs(r.vx) * 0.4;
        }
        if (r.y < TOP) {
          r.y = TOP;
          r.vy = Math.abs(r.vy) * 0.3;
        }
        const fl2 = floorY(r.x) - RING_REST;
        if (r.y > fl2) {
          r.y = fl2;
          if (r.vy > 0) r.vy *= -0.15;
          r.vx *= 0.96;
          r.av *= 0.9;
          r.a *= 0.97;
        }

        if (r.cool > 0) r.cool -= h;
        for (let pi = 0; pi < pegs.length; pi++) {
          const p = pegs[pi],
            dx = r.x - p.x;
          // a ring only goes on from the top: it must sink down through the tip line while over the knob.
          // Rings that drift in from the side below the tip pass by (the tank has depth).
          const tipLine = p.tip + 2;
          if (
            r.vy > 0 &&
            r.py < tipLine &&
            r.y >= tipLine &&
            Math.abs(dx) < (r.odd ? CATCH_X * L.oddCatch : CATCH_X) &&
            r.cool <= 0
          ) {
            // any ring threads onto any peg; only matching colours count toward the goal
            r.peg = pi;
            r.vx = 0;
            r.vy = Math.max(r.vy, 10);
            r.flash = 0.5;
            if (r.odd) {
              if (phase === 'play') blackRingLanded();
            } else if (phase === 'play' || phase === 'intro') sfx.plink();
            for (let k = 0; k < (r.odd ? 18 : 10); k++)
              sparks.push({
                x: p.x,
                y: p.tip,
                vx: (Math.random() - 0.5) * (r.odd ? 220 : 140),
                vy: -Math.random() * 120,
                life: 1,
                c: r.odd && k % 2 ? '#ff4d4d' : COLORS[r.c][0],
              });
            break;
          }
        }
      } else {
        // threaded: slide along the leaning rod
        const p = pegs[r.peg];
        const [, fy] = jetForce(r.x, r.y);
        r.vy += (G + fy * 0.25) * h;
        r.vy *= Math.exp(-2.5 * h);
        if (r.eject) r.vy = Math.min(r.vy, -300); // MEGA: ride up the rod and off the tip
        r.y += r.vy * h;
        r.vx = 0;
        r.x += (rodX(p, r.y) - r.x) * Math.min(1, h * 14);
        r.a += (p.ang - r.a) * Math.min(1, h * 6);
        r.av = 0;
        r.phi += 0.3 * h;
        if (r.y < p.tip - 22) {
          r.peg = -1;
          r.cool = 0.8;
          if (r.eject) {
            r.eject = false;
            r.vy = -260;
            r.vx = Math.sign(p.x - p.sx) * 70 + (Math.random() - 0.5) * 40; // carry on along the lean
          } else r.vx = (Math.random() - 0.5) * 30;
        }
      }
    }

    // stack threaded rings down each rod
    for (let pi = 0; pi < pegs.length; pi++) {
      const p = pegs[pi];
      const on = rings.filter((r) => r.peg === pi).sort((a, b) => b.y - a.y);
      on.forEach((r, k) => {
        const fl = p.sy - 6 - k * 9;
        if (r.y > fl) {
          r.y = fl;
          if (r.vy > 0) r.vy = 0;
        }
      });
    }

    // ring-ring contacts: impulse bounce with restitution, glancing friction and spin.
    // Rings stacked on a peg act as fixed obstacles for loose ones.
    const MIN = RX * 1.45,
      E = 0.55;
    for (let i = 0; i < rings.length; i++)
      for (let j = i + 1; j < rings.length; j++) {
        const a = rings[i],
          b = rings[j],
          aFix = a.peg >= 0,
          bFix = b.peg >= 0;
        if (aFix && bFix) continue;
        // a loose ring sliding along the floor slips past a stack, so it can always roll back to a jet
        if ((aFix && b.y > floorY(b.x) - 30) || (bFix && a.y > floorY(a.x) - 30)) continue;
        const dx = b.x - a.x,
          dy = b.y - a.y;
        if (dx > MIN || dx < -MIN || dy > MIN || dy < -MIN) continue;
        const dd = Math.hypot(dx, dy);
        if (dd < 0.01 || dd >= MIN) continue;
        const nx = dx / dd,
          ny = dy / dd,
          over = MIN - dd;
        const wa = aFix ? 0 : bFix ? 1 : 0.5,
          wb = 1 - wa;
        a.x -= nx * over * wa;
        a.y -= ny * over * wa;
        b.x += nx * over * wb;
        b.y += ny * over * wb;
        const rvx = b.vx - a.vx,
          rvy = b.vy - a.vy,
          vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          const jn = -(1 + E) * vn,
            tx = -ny,
            ty = nx,
            vt = rvx * tx + rvy * ty,
            jt = -vt * 0.15;
          a.vx -= (jn * nx + jt * tx) * wa;
          a.vy -= (jn * ny + jt * ty) * wa;
          b.vx += (jn * nx + jt * tx) * wb;
          b.vy += (jn * ny + jt * ty) * wb;
          a.av += vt * 0.03 * wa;
          b.av -= vt * 0.03 * wb;
        }
      }

    for (const b of bubbles) {
      b.vx *= 0.97;
      b.vy = b.vy * 0.985 - 40 * h;
      b.x += (b.vx + Math.sin(simT * 6 + b.r * 9) * 12) * h;
      b.y += b.vy * h;
      b.life -= h * 0.35;
    }
    bubbles = bubbles.filter((b) => b.y > 6 && b.life > 0).slice(-320);
    for (const s of sparks) {
      s.vy += 160 * h;
      s.x += s.vx * h;
      s.y += s.vy * h;
      s.life -= h * 1.6;
    }
    sparks = sparks.filter((s) => s.life > 0);

    // creatures
    const hr = hReal;
    for (const f of fish) {
      f.boost = (f.boost || 0) * Math.exp(-1.8 * hr);
      f.hit = Math.max(0, (f.hit || 0) - hr);
      f.x += f.d * f.v * (1 + 2.5 * f.boost) * hr;
      f.cy = f.y + Math.sin(simT * 1.3 + f.ph) * 5;
      if (f.x > W + 40 || f.x < -40) {
        f.d = -f.d;
        f.y = rnd(TOP + 40, H - 210);
        f.x = f.d > 0 ? -40 : W + 40;
        f.boost = 0;
      }
    }
    for (const t of turtles) {
      t.hit = Math.max(0, (t.hit || 0) - hr);
      t.burstCooldown = Math.max(0, (t.burstCooldown || 0) - hr);
      if (!t.active) {
        t.wait -= hr;
        if (t.wait <= 0) {
          t.active = true;
          t.d = Math.random() < 0.5 ? -1 : 1;
          t.x = t.d > 0 ? -50 : W + 50;
          t.y = rnd(H * 0.3, H * 0.55);
        }
        continue;
      }
      t.x += t.d * t.v * hr;
      t.cy = t.y + Math.sin(simT * 0.7 + t.ph) * 8;
      if (t.x > W + 60 || t.x < -60) {
        t.active = false;
        t.wait = rnd(25, 45);
      }
    }
    for (const j of jellies) {
      j.squish = (j.squish || 0) * Math.exp(-5 * hr);
      j.hit = Math.max(0, (j.hit || 0) - hr);
      j.x += j.vx * hr;
      if (j.x < 20 || j.x > W - 20) j.vx = -j.vx;
      j.cy = j.y + Math.sin(simT * 0.8 + j.ph) * 14;
    }

    // loose rings bounce off the turtle (the only creature they hit)
    for (const r of rings) {
      if (r.peg >= 0) continue;
      for (const t of turtles)
        if (t.active && bump(r, t.x, t.cy, t.s * 1.05, t.d * t.v, 0.6) && t.hit <= 0) {
          turtleBurst(t);
        }
    }
    for (const c of crabs) {
      c.t -= hr;
      if (c.t <= 0) {
        c.d = Math.random() < 0.5 ? -1 : 1;
        c.t = rnd(1.5, 4);
        c.v = Math.random() < 0.25 ? 0 : rnd(10, 22);
      }
      c.x += c.d * c.v * hr;
      if (c.x < 20) {
        c.x = 20;
        c.d = 1;
      }
      if (c.x > W - 20) {
        c.x = W - 20;
        c.d = -1;
      }
      c.ph += c.v * hr * 0.5;
    }

    shake = Math.max(0, shake - hr);
    if (phase === 'busted' && (bustT -= hr) <= 0) return finish(false, 'black');
    if (phase === 'play') {
      megaCharge = Math.min(1, megaCharge + hr / MEGA_TIME);
      timeLeft -= hr;
      const placed = rings.filter((r) => counts(r) && r.y > pegs[r.peg].tip + 10).length;
      const done = placed >= goal && !rings.some((r) => r.odd && r.peg >= 0);
      winT = done ? winT + hr : 0;
      if (winT > 0.6) return finish(true);
      if (timeLeft <= 0) return finish(false, 'time');
      if (pumpsLeft <= 0 && jets[0].p < 0.02 && jets[1].p < 0.02) {
        idleT += hr;
        if (idleT > 3) return finish(false, 'pumps');
      } else idleT = 0;
    }
  }

  // A turtle hit gives nearby loose rings a small lift, weaker than a MEGA burst.
  function turtleBurst(t) {
    if (!t.active || t.burstCooldown > 0 || phase !== 'play') return false;
    t.burstCooldown = 2.5;
    t.hit = 0.6;
    const radius = 110;
    for (const r of rings) {
      if (r.peg >= 0) continue;
      const dx = r.x - t.x,
        distance = Math.hypot(dx, r.y - t.cy);
      if (distance >= radius) continue;
      const strength = Math.max(0.25, 1 - distance / radius);
      r.vy = Math.min(r.vy, 0) - 180 * strength;
      r.vx += ((dx / radius) * 70 + t.d * 20) * strength;
      r.cool = Math.max(r.cool, 0.16);
    }
    spawnSplashBubbles(t.x, t.cy, 14);
    sfx.boop(0.9);
    return true;
  }

  // Push a free ring out of a round body and bounce it. Returns true on contact.
  // bounce: how much of the incoming speed comes back (jellyfish are springy, > 1).
  function bump(r, cx, cy, rad, bodyVx, bounce) {
    const R = rad + RX * 0.7;
    const dx = r.x - cx,
      dy = r.y - cy,
      d2 = dx * dx + dy * dy;
    if (d2 >= R * R || d2 < 0.01) return false;
    const d = Math.sqrt(d2),
      nx = dx / d,
      ny = dy / d;
    r.x = cx + nx * R;
    r.y = cy + ny * R;
    const vn = (r.vx - bodyVx) * nx + r.vy * ny;
    if (vn < 0) {
      const out = Math.max(-vn * bounce, 55);
      r.vx += (out - vn) * nx;
      r.vy += (out - vn) * ny;
      r.av += (Math.random() - 0.5) * 8;
    }
    return true;
  }
  function spawnSplashBubbles(x, y, n) {
    for (let k = 0; k < n; k++)
      bubbles.push({
        x: x + rnd(-6, 6),
        y: y + rnd(-6, 6),
        vx: rnd(-50, 50),
        vy: rnd(-90, -30),
        r: rnd(1.5, 3),
        life: 0.8,
      });
  }

  /* MEGA BURST: every jet on the floor fires at once and throws all loose rings upward. Recharges over time. */
  const MEGA_TIME = 60; // seconds to recharge
  let megaCharge = 1,
    shake = 0;
  function megaBurst() {
    if (phase !== 'play' || megaCharge < 1) return;
    megaCharge = 0;
    shake = 0.45;
    for (const r of rings) {
      if (r.peg >= 0) {
        r.eject = true; // every ring on a peg slides up and off the top too
        continue;
      }
      r.vy = Math.min(r.vy, 0) - rnd(340, 470);
      r.vx += rnd(-110, 110);
      r.av += rnd(-7, 7);
      r.cool = 0.25;
    }
    for (const f of fish) {
      f.boost = 1;
    }
    for (let k = 0; k < 90; k++) {
      const x = rnd(0, W);
      bubbles.push({
        x,
        y: floorY(x) - rnd(0, 10),
        vx: rnd(-40, 40),
        vy: -rnd(250, 560),
        r: rnd(2, 5.5),
        life: 1.2,
      });
    }
    sfx.mega();
    if (navigator.vibrate) {
      try {
        navigator.vibrate([30, 40, 60]);
      } catch (e) {}
    }
  }

  // A ring counts toward the goal only on a white peg or a peg of its own colour.
  const counts = (r) => r.peg >= 0 && !r.odd && (!pegs[r.peg].c || pegs[r.peg].c === r.c);

  // A black ring on a peg ends the level: a short beat so the player sees it land, then the lose card.
  function blackRingLanded() {
    phase = 'busted';
    bustT = 0.8;
    shake = 0.4;
    release(0);
    release(1);
    sfx.bust();
    if (navigator.vibrate) {
      try {
        navigator.vibrate([60, 40, 120]);
      } catch (e) {}
    }
  }

  function finish(won, reason) {
    release(0);
    release(1);
    if (won) {
      phase = 'won';
      const frac = timeLeft / L.time;
      const st = frac >= STAR3 ? 3 : frac >= STAR2 ? 2 : 1;
      if (st > (save.stars[li] || 0)) {
        save.stars[li] = st;
        persist();
      }
      track('win', li);
      pushScore();
      sfx.win();
      showWin(st);
    } else {
      phase = 'lost';
      track('lose', li);
      sfx.lose();
      showLose(reason);
    }
  }

  /* ================= Layout ================= */
  let scale = 1,
    dpr = 1,
    waterGrad = null;
  function layout(fresh) {
    const cw = tank.clientWidth,
      ch = tank.clientHeight;
    if (!cw || !ch) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    // fit the design area, then extend the world to fill the rest of the screen
    scale = Math.min(cw / DESIGN_W, ch / DESIGN_H);
    const nW = cw / scale,
      nH = ch / scale;
    const dx = nW / 2 - CX,
      dy = nH - H;
    W = nW;
    H = nH;
    CX = W / 2;
    JY = H - 4;
    NOZ = [CX - NOZ_GAP, CX + NOZ_GAP];
    TOP = Math.max(12, 70 / scale); // keep rings clear of the HUD
    buildFloor();
    waterGrad = null;
    if (!fresh) {
      for (const r of rings) {
        r.x += dx;
        r.y += dy;
      }
      for (const b of bubbles) {
        b.x += dx;
        b.y += dy;
      }
      placePegs();
      spawnCreatures();
    }
  }
  if (window.ResizeObserver)
    new ResizeObserver(() => {
      if (!gameEl.hidden) layout(false);
    }).observe(tank);
  else
    addEventListener('resize', () => {
      if (!gameEl.hidden) layout(false);
    });

  /* ================= Rendering ================= */
  function drawRing(r, part) {
    // a ring threaded on a leaning peg tilts toward the player, so its hole shows more
    const ry = RX * ((0.3 + 0.1 * Math.sin(r.phi)) * (1 - r.open) + 0.6 * r.open);
    let a0 = 0,
      a1 = TAU;
    if (part === 'back') {
      a0 = Math.PI;
      a1 = TAU;
    } else if (part === 'front') {
      a0 = 0;
      a1 = Math.PI;
    }
    const [col, dark] = COLORS[r.c];
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.lineCap = 'round';
    if (r.flash > 0) {
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 28 * r.flash;
    }
    ctx.lineWidth = 7;
    ctx.strokeStyle = dark;
    ctx.beginPath();
    ctx.ellipse(0, 1.3, RX, ry, r.a, a0, a1);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 5.2;
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.ellipse(0, 0, RX, ry, r.a, a0, a1);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath();
    ctx.ellipse(0, -1.4, RX - 1.5, Math.max(1, ry - 1.5), r.a, a0, a1);
    ctx.stroke();
    ctx.restore();
  }

  // The peg leans out of the tank toward the player and away from the centre:
  // its base sits at the back near the middle (thin, shaded), its tip comes forward (thick, bright, round knob).
  function drawPeg(p) {
    const c = ctx;
    const col = p.c ? COLORS[p.c] : ['#fffaf0', '#a8957a'];
    const vx = p.x - p.sx,
      vy = p.tip - p.sy,
      len = Math.hypot(vx, vy);
    const nx = -vy / len,
      ny = vx / len; // unit normal to the rod
    // socket in the back wall
    c.fillStyle = 'rgba(0,40,70,.35)';
    c.beginPath();
    c.ellipse(p.sx, p.sy + 2, 8, 3, 0, 0, TAU);
    c.fill();
    // long shadow on the back panel
    c.fillStyle = 'rgba(0,40,80,.15)';
    c.beginPath();
    c.moveTo(p.sx + 2, p.sy);
    c.lineTo(p.x + vx * 0.25 + 14, p.tip + 22);
    c.lineTo(p.x + vx * 0.25 + 26, p.tip + 30);
    c.lineTo(p.sx + 6, p.sy);
    c.closePath();
    c.fill();
    // tapered rod: thin at the back, thick at the front
    const wb = 2.2,
      wt = 7.5;
    const g = c.createLinearGradient(
      p.x - nx * wt,
      p.tip - ny * wt,
      p.x + nx * wt,
      p.tip + ny * wt
    );
    g.addColorStop(0, p.c ? col[1] : '#cdbb9f');
    g.addColorStop(0.42, p.c ? col[0] : '#fffaf0');
    g.addColorStop(1, col[1]);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(p.sx - nx * wb, p.sy - ny * wb);
    c.lineTo(p.x - nx * wt, p.tip - ny * wt);
    c.lineTo(p.x + nx * wt, p.tip + ny * wt);
    c.lineTo(p.sx + nx * wb, p.sy + ny * wb);
    c.closePath();
    c.fill();
    // darker back third so the rod reads as receding
    const fade = c.createLinearGradient(p.sx, p.sy, p.x, p.tip);
    fade.addColorStop(0, 'rgba(10,50,90,.45)');
    fade.addColorStop(0.6, 'rgba(10,50,90,0)');
    c.fillStyle = fade;
    c.fill();
    // round knob tip pointing at the viewer
    const kg = c.createRadialGradient(p.x - 4, p.tip - 5, 1, p.x, p.tip, 13);
    kg.addColorStop(0, '#ffffff');
    kg.addColorStop(0.35, col[0]);
    kg.addColorStop(1, col[1]);
    c.fillStyle = kg;
    c.beginPath();
    c.ellipse(p.x, p.tip, 11, 10, 0, 0, TAU);
    c.fill();
    // faint catch zone so players can see where to aim
    c.strokeStyle = 'rgba(255,255,255,.25)';
    c.lineWidth = 1.5;
    c.setLineDash([3, 4]);
    c.beginPath();
    c.ellipse(p.x, p.tip + 4, CATCH_X, 7, 0, 0, TAU);
    c.stroke();
    c.setLineDash([]);
  }

  function drawFish(f) {
    if (WaterHabitats.drawSwimmer(ctx, f, simT)) return;
    const c = ctx,
      s = f.s,
      wag = Math.sin(simT * (8 + 14 * (f.boost || 0)) + f.ph) * 0.3;
    c.save();
    c.translate(f.x, f.cy);
    c.scale(f.d, 1);
    c.fillStyle = f.c;
    c.save();
    c.translate(-s * 0.8, 0);
    c.rotate(wag);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-s * 0.85, -s * 0.6);
    c.lineTo(-s * 0.85, s * 0.6);
    c.closePath();
    c.fill();
    c.restore();
    c.beginPath();
    c.ellipse(0, 0, s, s * 0.6, 0, 0, TAU);
    c.fill();
    c.fillStyle = f.c2;
    c.globalAlpha = 0.8;
    c.beginPath();
    c.ellipse(-s * 0.2, 0, s * 0.13, s * 0.52, 0, 0, TAU);
    c.fill();
    c.globalAlpha = 1;
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(s * 0.5, -s * 0.12, s * 0.17, 0, TAU);
    c.fill();
    c.fillStyle = '#33124a';
    c.beginPath();
    c.arc(s * 0.55, -s * 0.12, s * 0.09, 0, TAU);
    c.fill();
    c.restore();
  }
  function drawJelly(j) {
    const c = ctx,
      y = j.cy,
      pul = 1 + Math.sin(simT * 2.4 + j.ph) * 0.1 + (j.squish || 0) * 0.35;
    c.save();
    c.translate(j.x, y);
    c.strokeStyle = j.c;
    c.lineWidth = 2;
    c.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const tx = (-0.6 + i * 0.3) * j.s;
      c.beginPath();
      c.moveTo(tx, 0);
      for (let k = 1; k <= 6; k++)
        c.lineTo(tx + Math.sin(simT * 3 + k * 0.9 + i) * 3, k * j.s * 0.32);
      c.stroke();
    }
    c.fillStyle = j.c;
    c.beginPath();
    c.ellipse(0, 0, j.s * pul, (j.s * 0.8) / pul, 0, Math.PI, TAU);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.4)';
    c.beginPath();
    c.ellipse(-j.s * 0.35, -j.s * 0.4, j.s * 0.25, j.s * 0.14, -0.4, 0, TAU);
    c.fill();
    c.restore();
  }
  function drawTurtle(t) {
    const c = ctx,
      s = t.s,
      flap = Math.sin(simT * 2.2 + t.ph) * 0.5;
    c.save();
    c.translate(t.x, t.cy);
    c.scale(t.d, 1);
    c.fillStyle = '#7fcf8a';
    for (const [fx, fy, sgn] of [
      [s * 0.45, -s * 0.45, -1],
      [s * 0.45, s * 0.45, 1],
      [-s * 0.55, -s * 0.4, -1],
      [-s * 0.55, s * 0.4, 1],
    ]) {
      c.save();
      c.translate(fx, fy);
      c.rotate(sgn * (0.6 + flap * (fx > 0 ? 1 : 0.5)));
      c.beginPath();
      c.ellipse(0, sgn * s * 0.2, s * 0.18, s * 0.42, 0, 0, TAU);
      c.fill();
      c.restore();
    }
    c.beginPath();
    c.ellipse(s * 1.05, 0, s * 0.32, s * 0.26, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#33124a';
    c.beginPath();
    c.arc(s * 1.18, -s * 0.07, s * 0.06, 0, TAU);
    c.fill();
    c.fillStyle = '#3f8f4f';
    c.beginPath();
    c.ellipse(0, 0, s, s * 0.68, 0, 0, TAU);
    c.fill();
    c.strokeStyle = '#a6d86e';
    c.lineWidth = 1.5;
    c.beginPath();
    c.ellipse(0, 0, s * 0.45, s * 0.32, 0, 0, TAU);
    c.stroke();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU;
      c.beginPath();
      c.moveTo(Math.cos(a) * s * 0.45, Math.sin(a) * s * 0.32);
      c.lineTo(Math.cos(a) * s * 0.92, Math.sin(a) * s * 0.62);
      c.stroke();
    }
    c.restore();
  }
  function drawCrab(cr) {
    const c = ctx,
      x = cr.x,
      y = floorY(x) + 1,
      bob = Math.abs(Math.sin(cr.ph * 2)) * 1.5;
    c.save();
    c.translate(x, y - bob);
    c.strokeStyle = '#c4361f';
    c.lineWidth = 2;
    c.lineCap = 'round';
    for (let k = 0; k < 3; k++)
      for (const sg of [-1, 1]) {
        const sw = Math.sin(cr.ph * 3 + k + (sg > 0 ? 1 : 0)) * 2;
        c.beginPath();
        c.moveTo(sg * 6, -3);
        c.lineTo(sg * (12 + k * 2), -6 + k * 2 + sw);
        c.lineTo(sg * (14 + k * 2), 2 + bob);
        c.stroke();
      }
    // claws
    for (const sg of [-1, 1]) {
      c.beginPath();
      c.moveTo(sg * 7, -7);
      c.lineTo(sg * 13, -14);
      c.stroke();
      c.fillStyle = '#ef4b2b';
      c.beginPath();
      c.ellipse(sg * 15, -17, 4.5, 3.5, sg * 0.5, 0, TAU);
      c.fill();
    }
    c.fillStyle = '#ef4b2b';
    c.beginPath();
    c.ellipse(0, -6, 10, 6.5, 0, 0, TAU);
    c.fill();
    c.strokeStyle = '#ef4b2b';
    c.beginPath();
    c.moveTo(-3, -11);
    c.lineTo(-4, -16);
    c.moveTo(3, -11);
    c.lineTo(4, -16);
    c.stroke();
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(-4, -17, 2.2, 0, TAU);
    c.arc(4, -17, 2.2, 0, TAU);
    c.fill();
    c.fillStyle = '#33124a';
    c.beginPath();
    c.arc(-4, -17, 1.1, 0, TAU);
    c.arc(4, -17, 1.1, 0, TAU);
    c.fill();
    c.restore();
  }
  function drawStarfish(s) {
    const c = ctx;
    c.save();
    c.translate(s.x, floorY(s.x) + 4);
    c.rotate(s.rot);
    c.fillStyle = s.c;
    c.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? s.s * 0.45 : s.s;
      const a = (k / 10) * TAU - Math.PI / 2;
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.5)';
    c.beginPath();
    c.arc(0, 0, 1.5, 0, TAU);
    c.fill();
    c.restore();
  }

  function render() {
    if (!canvas.width) return;
    const c = ctx;
    const sk = shake > 0 ? shake * 9 : 0;
    c.setTransform(
      scale * dpr,
      0,
      0,
      scale * dpr,
      (Math.random() - 0.5) * sk * dpr,
      (Math.random() - 0.5) * sk * dpr
    );
    if (!waterGrad) {
      waterGrad = c.createLinearGradient(0, 0, 0, H);
      waterGrad.addColorStop(0, TH.top);
      waterGrad.addColorStop(0.5, TH.mid);
      waterGrad.addColorStop(1, TH.bot);
    }
    c.fillStyle = waterGrad;
    c.fillRect(-12, -12, W + 24, H + 24);
    WaterHabitats.drawBackground(c, WaterHabitats.profile(li), W, H, simT, TH.night);

    // moonlight from above on night dives
    if (TH.moon) {
      const mg = c.createRadialGradient(W * 0.72, -30, 10, W * 0.72, -30, Math.max(W, H) * 0.6);
      mg.addColorStop(0, 'rgba(225,238,255,.38)');
      mg.addColorStop(1, 'rgba(225,238,255,0)');
      c.fillStyle = mg;
      c.fillRect(0, 0, W, H);
    }
    // light shafts
    c.save();
    c.globalAlpha = TH.ray;
    c.fillStyle = TH.rayCol;
    const shafts = Math.ceil(W / 90);
    for (let i = 0; i < shafts; i++) {
      const x = 40 + i * 92 + Math.sin(simT * 0.3 + i * 1.7) * 14;
      c.beginPath();
      c.moveTo(x - 12, 0);
      c.lineTo(x + 14, 0);
      c.lineTo(x + 70, H);
      c.lineTo(x + 26, H);
      c.fill();
    }
    c.restore();

    // seaweed
    c.save();
    c.lineCap = 'round';
    c.globalAlpha = TH.night ? 0.85 : 0.6;
    if (TH.glow) {
      c.shadowBlur = 10;
    }
    weeds.forEach((w, i) => {
      c.strokeStyle = w.c;
      c.lineWidth = 9;
      if (TH.glow) c.shadowColor = w.c;
      const by = floorY(w.x) + 6,
        sw = Math.sin(simT * 0.9 + i) * 10;
      c.beginPath();
      c.moveTo(w.x, by);
      c.quadraticCurveTo(w.x + sw + 12, by - w.h * 0.5, w.x + sw * 1.4, by - w.h);
      c.stroke();
    });
    c.restore();

    // glowing plankton drifting in dark water
    if (plankton.length) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (const pk of plankton) {
        pk.y -= 0.05;
        pk.x += pk.v * 0.01;
        if (pk.y < TOP) pk.y = H - 40;
        const a = 0.35 + 0.65 * Math.max(0, Math.sin(simT * 1.6 + pk.ph));
        c.globalAlpha = a;
        c.fillStyle = pk.c;
        c.beginPath();
        c.arc(pk.x, pk.y, pk.r * 2.6, 0, TAU);
        c.globalAlpha = a * 0.25;
        c.fill();
        c.beginPath();
        c.arc(pk.x, pk.y, pk.r, 0, TAU);
        c.globalAlpha = a;
        c.fill();
      }
      c.restore();
    }
    // swimmers behind the pegs
    c.save();
    c.globalAlpha = 0.9;
    for (const j of jellies) drawJelly(j);
    for (const t of turtles) if (t.active) drawTurtle(t);
    for (const f of fish) drawFish(f);
    c.restore();

    // funnel floor
    c.fillStyle = TH.sand;
    c.beginPath();
    c.moveTo(0, H);
    FK.forEach(([x, y]) => c.lineTo(x, y + 6));
    c.lineTo(W, H);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(120,70,0,.25)';
    c.lineWidth = 2;
    c.beginPath();
    FK.forEach(([x, y], i) => (i ? c.lineTo(x, y + 6) : c.moveTo(x, y + 6)));
    c.stroke();
    for (const s of stars) drawStarfish(s);
    for (const cr of crabs) drawCrab(cr);

    // nozzles and jet plumes
    for (let j = 0; j < 2; j++) {
      c.fillStyle = '#33124a';
      c.beginPath();
      c.ellipse(NOZ[j], H - 1, 11, 5, 0, 0, TAU);
      c.fill();
      if (jets[j].p > 0.05) {
        const top = H - 340 * jets[j].p;
        const topX = jetCenter(j, top);
        const g = c.createLinearGradient(NOZ[j], H, topX, top);
        g.addColorStop(0, `rgba(255,255,255,${0.45 * jets[j].p})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(NOZ[j] - 8, H);
        c.lineTo(NOZ[j] + 8, H);
        c.lineTo(topX + 50, top);
        c.lineTo(topX - 50, top);
        c.closePath();
        c.fill();
      }
    }

    // rings on pegs: back halves, then pegs, then front halves
    for (const r of rings) if (r.peg >= 0) drawRing(r, 'back');
    for (const p of pegs) drawPeg(p);
    for (const r of rings) if (r.peg >= 0) drawRing(r, 'front');
    for (const r of rings) if (r.peg < 0) drawRing(r, 'all');

    // bubbles and sparkles
    c.lineWidth = 1;
    for (const b of bubbles) {
      c.strokeStyle = `rgba(255,255,255,${0.75 * Math.min(1, b.life * 1.5)})`;
      c.beginPath();
      c.arc(b.x, b.y, b.r, 0, TAU);
      c.stroke();
    }
    for (const s of sparks) {
      c.fillStyle = s.c;
      c.globalAlpha = Math.max(0, s.life);
      c.beginPath();
      c.arc(s.x, s.y, 2.2, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;

    // air pocket trapped at the top of the sealed toy
    const ax = W * 0.64 + Math.sin(simT * 0.8) * 10;
    c.fillStyle = 'rgba(235,252,255,.8)';
    c.beginPath();
    c.ellipse(ax, -2, 70 + W * 0.05, 11 + Math.sin(simT * 1.7) * 1.5, 0, 0, TAU);
    c.fill();

    // plastic glare
    c.fillStyle = 'rgba(255,255,255,.12)';
    c.beginPath();
    c.moveTo(14, 20);
    c.lineTo(52, 20);
    c.lineTo(26, H * 0.5);
    c.lineTo(10, H * 0.5);
    c.closePath();
    c.fill();
  }

  function updateHud() {
    const on = rings.filter(counts).length,
      oddOn = rings.some((r) => r.odd && r.peg >= 0);
    hudRings.textContent = oddOn ? `${on}/${goal} · black ring on!` : `${on}/${goal} on`;
    hudRings.classList.toggle('low', oddOn);
    hudTime.textContent = fmt(timeLeft);
    hudTime.classList.toggle('low', phase === 'play' && timeLeft < 15);
    if (L && L.pumps) {
      hudPumps.textContent = `${pumpsLeft} pumps`;
      hudPumps.classList.toggle('low', pumpsLeft <= 8);
    }
    megaWell.style.setProperty('--charge', megaCharge.toFixed(3));
    const megaReady = megaCharge >= 1 && phase === 'play';
    megaWell.classList.toggle('ready', megaReady);
    megaBtn.disabled = !megaReady;
    const lbl = megaCharge >= 1 ? 'READY' : 'CHARGING ' + Math.floor(megaCharge * 100) + '%';
    if (megaLabel.lastChild.textContent !== lbl) megaLabel.lastChild.textContent = lbl;
    const noPumps = pumpsLeft <= 0;
    pumpBtns.forEach((b) => {
      b.disabled = noPumps && phase === 'play';
    });
  }

  let last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0);
    last = ts;
    if (!running) return;
    if (phase !== 'paused' && dt > 0) {
      const n = Math.max(1, Math.ceil(dt * 120)),
        h = dt / n;
      for (let k = 0; k < n; k++) step(h);
    }
    render();
    updateHud();
  }

  /* ================= Level map ================= */
  // Level 1 sits at the bottom in the sunny shallows; the trail winds upward into deeper, darker water.
  const mapEl = $('map'),
    mapScroll = $('mapScroll'),
    mapSea = $('mapSea'),
    mapNodes = $('mapNodes'),
    mapDeco = $('mapDeco'),
    mapRoad = $('mapRoad'),
    avatarEl = $('avatar');
  const ZONES = [
    'Sunny Shallows',
    'Coral Garden',
    'Kelp Forest',
    'Twilight Reef',
    'Deep Trench',
    'Abyss Glow',
  ];
  const ZONE_DECO = [
    ['shell', 'rock', 'coral'],
    ['coral', 'anemone', 'shell'],
    ['kelp', 'rock', 'anemone'],
    ['coral', 'jelly', 'kelp'],
    ['chest', 'anchor', 'jelly'],
    ['jelly', 'chest', 'anchor'],
  ];
  const zoneIdx = (i) => Math.min(ZONES.length - 1, Math.floor(i / 20));
  const STEP = 118,
    PAD_T = 230,
    PAD_B = 210;
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hash = (i, k) => {
    const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  let pts = [],
    mapH = 0,
    traveling = false;
  let avatarAt = Math.min(Math.max(0, save.at || 0), LEVELS.length - 1);

  function currentLevel() {
    for (let i = 0; i < LEVELS.length; i++) if (unlocked(i) && !save.stars[i]) return i;
    return LEVELS.length - 1;
  }
  function ctrl(i) {
    // Catmull-Rom control points for the curve from node i to node i+1
    const p0 = pts[Math.max(0, i - 1)],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[Math.min(pts.length - 1, i + 2)];
    return [
      p1.x + (p2.x - p0.x) / 6,
      p1.y + (p2.y - p0.y) / 6,
      p2.x - (p3.x - p1.x) / 6,
      p2.y - (p3.y - p1.y) / 6,
    ];
  }
  function seg(i, t) {
    const [ax, ay, bx, by] = ctrl(i),
      p1 = pts[i],
      p2 = pts[i + 1],
      u = 1 - t;
    return {
      x: u * u * u * p1.x + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * p2.x,
      y: u * u * u * p1.y + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * p2.y,
    };
  }
  function roadPath(upto) {
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < Math.min(upto, pts.length - 1); i++) {
      const [ax, ay, bx, by] = ctrl(i);
      d += `C${ax.toFixed(1)},${ay.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)} ${pts[i + 1].x.toFixed(1)},${pts[i + 1].y.toFixed(1)}`;
    }
    return d;
  }

  function buildMap() {
    const w = mapNodes.parentElement.clientWidth || 360;
    mapH = PAD_T + (LEVELS.length - 1) * STEP + PAD_B;
    mapSea.style.height = mapH + 'px';
    const amp = Math.min(w * 0.29, 150);
    pts = LEVELS.map((_, i) => ({
      x: w / 2 + amp * Math.sin(i * 1.05 + 0.5),
      y: mapH - PAD_B - i * STEP,
    }));
    const cur = currentLevel();
    mapRoad.setAttribute('width', w);
    mapRoad.setAttribute('height', mapH);
    mapRoad.setAttribute('viewBox', `0 0 ${w} ${mapH}`);
    const full = roadPath(pts.length);
    mapRoad.innerHTML = `<path class="road-edge" d="${full}"/><path class="road" d="${full}"/><path class="road-done" d="${roadPath(cur)}"/><path class="road-dash" d="${full}"/>`;

    const lockSvg =
      '<svg class="lk" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="#fff"/><path d="M9.5 12.5V10a4.5 4.5 0 0 1 9 0v2.5" fill="none" stroke="#5c7290" stroke-width="2.6"/><rect x="7.5" y="12" width="13" height="10" rx="2.5" fill="#5c7290"/><circle cx="14" cy="16.5" r="1.7" fill="#fff"/></svg>';
    mapNodes.innerHTML = LEVELS.map((L, i) => {
      const open = unlocked(i),
        s = save.stars[i] || 0;
      const cls = !open ? 'lock' : i === cur ? 'cur' : s ? 'done' : 'cur';
      return (
        `<button type="button" class="node ${cls}${L.speed ? ' speed' : ''}" data-i="${i}" style="transform:translate(${pts[i].x.toFixed(1)}px,${pts[i].y.toFixed(1)}px)" aria-label="Level ${i + 1}${L.speed ? ', speed round' : ''}${open ? `, ${s} of 3 stars` : ', locked'}">` +
        (L.speed
          ? '<span class="tag">SPEED</span>'
          : L.moving
            ? '<span class="tag moving">MOVING</span>'
            : '') +
        `<span class="cap">${i + 1}</span>${open ? '' : lockSvg}` +
        (s
          ? `<span class="nst">${'★'.repeat(s)}<span class="off">${'★'.repeat(3 - s)}</span></span>`
          : '') +
        '</button>'
      );
    }).join('');

    // scenery beside every other level, on the side away from the trail
    let deco = '';
    for (let i = 0; i < LEVELS.length; i += 2) {
      const z = zoneIdx(i),
        kind = ZONE_DECO[z][Math.floor(hash(i, 1) * 3)];
      const left = pts[i].x > w / 2;
      const x = left ? w * (0.1 + hash(i, 2) * 0.08) : w * (0.82 + hash(i, 2) * 0.08);
      const y = pts[i].y + (hash(i, 3) - 0.5) * 30;
      const extra =
        kind === 'jelly'
          ? ' glow'
          : kind === 'kelp' || kind === 'anemone' || kind === 'coral'
            ? ' sway'
            : '';
      deco += `<svg class="deco${extra}" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;animation-delay:-${(hash(i, 4) * 4).toFixed(2)}s"><use href="#d-${kind}"/></svg>`;
    }
    // a signpost where each new zone begins
    for (let z = 1; z <= zoneIdx(LEVELS.length - 1); z++) {
      const i = z * 20,
        y = (pts[i - 1].y + pts[i].y) / 2,
        x = pts[i].x > w / 2 ? w * 0.27 : w * 0.73;
      deco += `<div class="zone-sign" style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px">${ZONES[z]}<small>LEVELS ${i + 1}–${Math.min(i + 20, LEVELS.length)}</small></div>`;
    }
    mapDeco.innerHTML = deco;
    placeAvatar(pts[avatarAt]);
  }

  // Water bursts out of the level's button, fills the screen with the level's title card, then fades to reveal the level.
  const wipe = $('wipe');
  function splash(x, y, kind, num, name, then) {
    wipe.style.setProperty('--x', x.toFixed(0) + 'px');
    wipe.style.setProperty('--y', y.toFixed(0) + 'px');
    $('wipeKind').textContent = kind;
    $('wipeNum').textContent = num;
    $('wipeNum').hidden = !num;
    $('wipeName').textContent = name;
    wipe.className = '';
    void wipe.offsetWidth;
    wipe.hidden = false;
    wipe.className = 'in';
    sfx.entry();
    setTimeout(
      () => {
        then();
        wipe.className = 'out';
        setTimeout(() => {
          wipe.hidden = true;
          wipe.className = '';
        }, 560);
      },
      reduceMotion ? 250 : 1050
    );
  }
  function diveInto(i) {
    let x = (window.innerWidth || 0) / 2,
      y = (window.innerHeight || 0) / 2;
    const n = mapNodes.querySelector(`[data-i="${i}"]`);
    if (n && n.getBoundingClientRect) {
      const r = n.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    }
    splash(
      x,
      y,
      LEVELS[i].speed ? 'SPEED ROUND' : 'DIVING INTO',
      String(i + 1),
      LEVELS[i].name,
      () => startLevel(i)
    );
  }

  function placeAvatar(p) {
    avatarEl.style.transform = `translate(${p.x.toFixed(1)}px,${(p.y - 26).toFixed(1)}px)`;
  }
  function scrollToLevel(i, smooth) {
    const top = pts[i].y - mapScroll.clientHeight * 0.58;
    try {
      mapScroll.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
    } catch (e) {
      mapScroll.scrollTop = top;
    }
  }
  function updateMapChrome() {
    const total = save.stars.reduce((a, b) => a + (b || 0), 0),
      cur = currentLevel();
    $('mapStars').textContent = `★ ${total}`;
    $('mapGoLevel').textContent = `Level ${cur + 1}`;
    syncSoundBtns();
    updateZonePill();
  }
  function updateZonePill() {
    if (!pts.length) return;
    const mid = mapScroll.scrollTop + mapScroll.clientHeight * 0.55;
    const i = Math.max(0, Math.min(LEVELS.length - 1, Math.round((mapH - PAD_B - mid) / STEP)));
    const z = zoneIdx(i);
    $('zonePill').innerHTML =
      `${ZONES[z]}<small>${z * 20 + 1}–${Math.min(z * 20 + 20, LEVELS.length)}</small>`;
  }
  mapScroll.addEventListener('scroll', updateZonePill, { passive: true });

  function openMap(opts) {
    opts = opts || {};
    running = false;
    phase = 'menu';
    overlay.hidden = true;
    gameEl.hidden = true;
    menuEl.hidden = true;
    mapEl.hidden = false;
    document.documentElement.classList.add('playing');
    keepAwake(false);
    release(0);
    release(1);
    buildMap();
    scrollToLevel(avatarAt, false);
    updateMapChrome();
    music.duck();
    if (opts.travelTo != null) setTimeout(() => travel(opts.travelTo, opts.start), 500);
  }
  function closeMap() {
    mapEl.hidden = true;
    menuEl.hidden = false;
    document.documentElement.classList.remove('playing');
    renderMenu();
    startTitle();
  }

  // Swim the avatar along the trail, node by node, then (optionally) start that level.
  function travel(target, start) {
    if (traveling) return;
    const from = avatarAt,
      steps = Math.abs(target - from),
      dir = Math.sign(target - from);
    const finish = () => {
      traveling = false;
      avatarAt = target;
      save.at = target;
      persist();
      avatarEl.classList.remove('moving');
      placeAvatar(pts[target]);
      if (start) setTimeout(() => diveInto(target), 200);
    };
    if (!steps || reduceMotion) {
      if (steps) scrollToLevel(target, false);
      return finish();
    }
    traveling = true;
    avatarEl.classList.add('moving');
    const total = Math.min(3200, Math.max(700, steps * 520));
    let t0 = null,
      lastX = pts[from].x;
    const tick = (ts) => {
      if (mapEl.hidden) {
        traveling = false;
        return;
      }
      if (t0 === null) t0 = ts;
      const k = Math.min(1, (ts - t0) / total),
        e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const pos = e * steps,
        s = Math.min(steps - 1, Math.floor(pos)),
        t = pos - s;
      const p = dir > 0 ? seg(from + s, t) : seg(from - s - 1, 1 - t);
      if (Math.abs(p.x - lastX) > 0.3) avatarEl.classList.toggle('left', p.x < lastX);
      lastX = p.x;
      placeAvatar(p);
      const want = p.y - mapScroll.clientHeight * 0.58;
      mapScroll.scrollTop += (want - mapScroll.scrollTop) * 0.12;
      if (k < 1) requestAnimationFrame(tick);
      else finish();
    };
    requestAnimationFrame(tick);
  }

  mapNodes.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.node');
    if (!b || traveling) return;
    const i = +b.dataset.i;
    audio();
    if (!unlocked(i)) {
      b.classList.remove('shake');
      void b.offsetWidth;
      b.classList.add('shake');
      sfx.bonk();
      return;
    }
    b.classList.remove('tapped');
    void b.offsetWidth;
    b.classList.add('tapped');
    travel(i, true);
  });
  $('mapGo').addEventListener('click', () => {
    if (traveling) return;
    audio();
    const n = mapNodes.querySelector(`[data-i="${currentLevel()}"]`);
    if (n) {
      n.classList.remove('tapped');
      void n.offsetWidth;
      n.classList.add('tapped');
    }
    travel(currentLevel(), true);
  });
  $('mapFind').addEventListener('click', () => scrollToLevel(avatarAt, true));
  $('mapBack').addEventListener('click', closeMap);
  $('mapSound').addEventListener('click', () => {
    toggleSound();
    updateMapChrome();
  });
  let mapResizeT = 0;
  addEventListener('resize', () => {
    if (mapEl.hidden) return;
    clearTimeout(mapResizeT);
    mapResizeT = setTimeout(() => {
      if (!traveling) {
        buildMap();
        scrollToLevel(avatarAt, false);
      }
    }, 150);
  });

  // ambient bubbles and passing fish
  $('mapBubbles').innerHTML =
    Array.from({ length: 18 }, (_, i) => {
      const s = 6 + hash(i, 5) * 16;
      return `<span class="bub" style="left:${(hash(i, 6) * 100).toFixed(1)}%;width:${s.toFixed(0)}px;height:${s.toFixed(0)}px;animation-duration:${(9 + hash(i, 7) * 10).toFixed(1)}s;animation-delay:-${(hash(i, 8) * 18).toFixed(1)}s"></span>`;
    }).join('') +
    ['#ffd23f', '#ff9cc4', '#7ff0d0']
      .map(
        (c, i) =>
          `<svg class="map-fish" style="top:${18 + i * 27}%;color:${c};animation-duration:${22 + i * 7}s;animation-delay:-${i * 9}s"><use href="#d-fish"/></svg>`
      )
      .join('');

  /* ================= Theme music: an original storybook waltz ================= */
  // Eight bars in C major, 3/4 at 104 bpm: celesta melody and lilting harp arpeggios.
  const MEL = [
    76, 0, 79, 77, 76, 72, 74, 0, 77, 76, 74, 71, 72, 76, 79, 0, 81, 79, 77, 76, 74, 0, 0, 0, 76,
    79, 84, 0, 83, 79, 81, 0, 79, 77, 76, 72, 74, 77, 79, 83, 81, 77, 76, 74, 72, 0, 0, 0,
  ];
  const ROOTS = [48, 43, 45, 41, 48, 41, 43, 48];
  const CHORDS = [
    [60, 64, 67],
    [59, 62, 67],
    [60, 64, 69],
    [60, 65, 69],
    [60, 64, 67],
    [60, 65, 69],
    [59, 62, 67],
    [60, 64, 67],
  ];
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const music = {
    gain: null,
    timer: 0,
    next: 0,
    step: 0,
    playing: false,
    start() {
      if (save.music === false) return;
      const a = audio(true);
      if (!a || this.playing) return;
      if (!this.gain) {
        this.gain = a.createGain();
        this.gain.connect(a.destination);
      }
      this.gain.gain.cancelScheduledValues(a.currentTime);
      this.gain.gain.setValueAtTime(0.0001, a.currentTime);
      this.gain.gain.exponentialRampToValueAtTime(this.level(), a.currentTime + 1.2);
      this.playing = true;
      this.next = a.currentTime + 0.1;
      this.step = 0;
      const tick = () => {
        if (!this.playing) return;
        this.schedule();
        this.timer = setTimeout(tick, 30);
      };
      tick();
    },
    stop() {
      if (!this.playing) return;
      this.playing = false;
      clearTimeout(this.timer);
      if (actx && this.gain) {
        this.gain.gain.cancelScheduledValues(actx.currentTime);
        this.gain.gain.setTargetAtTime(0.0001, actx.currentTime, 0.15);
      }
    },
    level() {
      return gameEl.hidden ? 0.22 : 0.09;
    }, // quieter under gameplay
    duck() {
      if (this.playing && actx) this.gain.gain.setTargetAtTime(this.level(), actx.currentTime, 0.4);
    },
    schedule() {
      const a = actx,
        dt = 60 / 104 / 2;
      // Skip missed beats after a browser interruption instead of queuing a burst of old notes.
      if (this.next < a.currentTime - dt) this.next = a.currentTime + 0.03;
      while (this.next < a.currentTime + 0.15) {
        const s = this.step % MEL.length,
          bar = Math.floor(s / 6),
          e = s % 6,
          t = this.next;
        if (MEL[s]) this.pan(hz(MEL[s]), t, 0.25);
        if (e === 0) this.bass(hz(ROOTS[bar]), t, 0.65);
        this.pan(hz(CHORDS[bar][e % 3] + (e >= 3 ? 12 : 0)), t, 0.055);
        if (e === 2 || e === 4) CHORDS[bar].forEach((m) => this.pan(hz(m), t, 0.028));
        this.next += dt;
        this.step++;
      }
    },
    pan(f, t, v) {
      // soft celesta / harp, with a bell overtone and a lingering tail
      const a = actx,
        g = a.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
      g.connect(this.gain);
      [
        [1, 1],
        [2, 0.22],
        [3, 0.045],
      ].forEach(([mult, amp]) => {
        const o = a.createOscillator(),
          og = a.createGain();
        o.type = 'sine';
        o.frequency.value = f * mult;
        og.gain.value = amp;
        o.connect(og).connect(g);
        o.start(t);
        o.stop(t + 1);
      });
    },
    bass(f, t, v) {
      const a = actx,
        o = a.createOscillator(),
        g = a.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5 * (v || 1), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(this.gain);
      o.start(t);
      o.stop(t + 0.32);
    },
    shake(t, v) {
      const a = actx;
      if (!noiseBuf) {
        noiseBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const src = a.createBufferSource(),
        f = a.createBiquadFilter(),
        g = a.createGain();
      src.buffer = noiseBuf;
      f.type = 'highpass';
      f.frequency.value = 6000;
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      src.connect(f).connect(g).connect(this.gain);
      src.start(t, Math.random() * 0.4);
      src.stop(t + 0.06);
    },
  };
  function toggleMusic() {
    save.music = save.music === false;
    persist();
    if (save.music) music.start();
    else music.stop();
    syncSoundBtns();
  }
  // browsers only allow sound after a tap, so the theme starts on the first one
  addEventListener('pointerdown', () => {
    if (save.music !== false) music.start();
  });
  addEventListener('keydown', () => {
    if (save.music !== false) music.start();
  });
  document.addEventListener('visibilitychange', () => {
    if (!actx) return;
    if (document.hidden) actx.suspend().catch(() => {});
    else actx.resume().catch(() => {});
  });

  /* ================= Title screen ================= */
  // Sky, clouds and sea are painted smoothly on a full-resolution canvas in the same cartoon style as the game.
  const titleSky = $('titleSky'),
    tctx = titleSky.getContext('2d');
  let tClouds = [],
    tSparks = [],
    titleLast = 0,
    titleOn = false;
  let tW = 390,
    tH = 844,
    tD = 1;
  function sizeTitle() {
    const vw = window.innerWidth || 390,
      vh = window.innerHeight || 844,
      d = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(vw * d),
      h = Math.round(vh * d);
    if (titleSky.width === w && titleSky.height === h) return;
    titleSky.width = w;
    titleSky.height = h;
    tW = vw;
    tH = vh;
    tD = d;
    const hy = tH * 0.6,
      k = Math.min(1.6, Math.max(0.8, vw / 520));
    const cloud = (x, y, s, v) => ({ x, y, s: s * k, v });
    tClouds = [
      cloud(0.02 * vw, hy - 14, 1.5, 6),
      cloud(0.62 * vw, hy - 12, 1.8, 6),
      cloud(0.34 * vw, hy - 6, 1.1, 6),
      cloud(0.06 * vw, vh * 0.15, 1, 11),
      cloud(0.6 * vw, vh * 0.26, 0.8, 15),
      cloud(0.84 * vw, vh * 0.09, 0.7, 13),
    ];
    tSparks = Array.from({ length: 40 }, (_, i) => ({
      x: hash(i, 21) * vw,
      y: hy + 6 + Math.pow(hash(i, 22), 1.5) * (vh - hy - 8),
      l: 6 + hash(i, 23) * 14,
      ph: hash(i, 24) * 6,
    }));
  }
  const CLOUD = [
    [0, 0, 22],
    [24, -12, 27],
    [52, -2, 23],
    [74, 6, 16],
    [-22, 8, 16],
    [14, 10, 20],
    [42, 10, 20],
  ];
  function drawTitle(t) {
    sizeTitle();
    const c = tctx,
      w = tW,
      h = tH,
      hy = h * 0.6;
    c.setTransform(tD, 0, 0, tD, 0, 0);
    const sky = c.createLinearGradient(0, 0, 0, hy);
    sky.addColorStop(0, nightNow ? '#090f32' : '#3d97e8');
    sky.addColorStop(0.55, nightNow ? '#202857' : '#7cc8f7');
    sky.addColorStop(1, nightNow ? '#566794' : '#d4f1ff');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, hy);
    const sun = c.createRadialGradient(w * 0.8, h * 0.08, 0, w * 0.8, h * 0.08, w * 0.45);
    sun.addColorStop(0, nightNow ? 'rgba(185,212,255,.3)' : 'rgba(255,250,220,.55)');
    sun.addColorStop(1, 'rgba(255,250,220,0)');
    c.fillStyle = sun;
    c.fillRect(0, 0, w, hy);
    if (nightNow) {
      // Stable star positions, with a little twinkle above the horizon.
      for (let i = 0; i < 65; i++) {
        const x = hash(i, 51) * w,
          y = hash(i, 52) * hy * 0.88;
        c.globalAlpha = 0.45 + 0.35 * Math.sin(t * 0.7 + i);
        c.fillStyle = '#e8f1ff';
        c.beginPath();
        c.arc(x, y, 0.7 + hash(i, 53) * 1.2, 0, TAU);
        c.fill();
      }
      c.globalAlpha = 1;
      c.fillStyle = '#fff5d9';
      c.beginPath();
      c.arc(w * 0.8, h * 0.1, Math.min(w, h) * 0.045, 0, TAU);
      c.fill();
    }
    for (const cl of tClouds) {
      const span = w + 260 * cl.s,
        x = ((((cl.x + t * cl.v) % span) + span) % span) - 130 * cl.s;
      const g = c.createLinearGradient(0, cl.y - 40 * cl.s, 0, cl.y + 30 * cl.s);
      g.addColorStop(0, nightNow ? '#63739b' : '#ffffff');
      g.addColorStop(0.6, nightNow ? '#4d5c82' : '#ffffff');
      g.addColorStop(1, nightNow ? '#303c63' : '#cfe6fb');
      c.fillStyle = 'rgba(120,170,230,.18)';
      for (const [dx, dy, r] of CLOUD) {
        c.beginPath();
        c.arc(x + dx * cl.s, cl.y + (dy + 6) * cl.s, r * cl.s, 0, TAU);
        c.fill();
      }
      c.fillStyle = g;
      for (const [dx, dy, r] of CLOUD) {
        c.beginPath();
        c.arc(x + dx * cl.s, cl.y + dy * cl.s, r * cl.s, 0, TAU);
        c.fill();
      }
    }
    const sea = c.createLinearGradient(0, hy, 0, h);
    sea.addColorStop(0, nightNow ? '#49658e' : '#6cc6fb');
    sea.addColorStop(0.12, nightNow ? '#253f75' : '#3d8fe8');
    sea.addColorStop(0.5, nightNow ? '#142650' : '#2563cc');
    sea.addColorStop(1, nightNow ? '#080f2b' : '#173e9c');
    c.fillStyle = sea;
    c.fillRect(0, hy, w, h - hy);
    c.fillStyle = 'rgba(255,255,255,.75)';
    c.fillRect(0, hy - 1, w, 2.5);
    c.strokeStyle = 'rgba(255,255,255,.16)';
    c.lineWidth = 2;
    c.lineCap = 'round';
    for (let r = 0; r < 7; r++) {
      const y = hy + 12 + r * r * 9 + r * 6,
        amp = 2 + r,
        len = 60 + r * 18;
      c.beginPath();
      for (let x = -20; x <= w + 20; x += 8) {
        const yy = y + Math.sin((x / len) * TAU + t * (0.8 + r * 0.1) + r) * amp;
        x < 0 ? c.moveTo(x, yy) : c.lineTo(x, yy);
      }
      c.stroke();
    }
    for (const s of tSparks) {
      const a = Math.max(0, Math.sin(t * 2.2 + s.ph));
      if (a < 0.05) continue;
      c.fillStyle = `rgba(255,255,255,${(a * 0.8).toFixed(2)})`;
      const x = (s.x + Math.sin(t * 0.5 + s.ph) * 6 + w) % w;
      c.beginPath();
      c.ellipse(x, s.y, (s.l * (0.4 + a * 0.6)) / 2, 1.6, 0, 0, TAU);
      c.fill();
    }
  }
  function titleLoop(ts) {
    if (menuEl.hidden) {
      titleOn = false;
      return;
    }
    requestAnimationFrame(titleLoop);
    if (ts - titleLast < 33) return; // ~30 fps is plenty for drifting clouds and waves
    titleLast = ts;
    drawTitle(ts / 1000);
  }
  function startTitle() {
    if (titleOn) return;
    titleOn = true;
    drawTitle(0);
    requestAnimationFrame(titleLoop);
  }
  addEventListener('resize', () => {
    if (!menuEl.hidden) drawTitle(titleLast / 1000);
  });

  function startFromTitle() {
    audio();
    music.start();
    if (!save.name) {
      openNameScreen(startFromTitle);
      return;
    }
    const cur = currentLevel();
    splash(
      (window.innerWidth || 0) / 2,
      (window.innerHeight || 0) * 0.66,
      'DIVING IN',
      '',
      ZONES[zoneIdx(avatarAt)],
      () => openMap()
    );
    void cur;
  }
  menuEl.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('button, a, .sheet')) return;
    startFromTitle();
  });
  $('howBtn').addEventListener('click', () => {
    $('howSheet').hidden = false;
  });
  $('howClose').addEventListener('click', () => {
    $('howSheet').hidden = true;
  });
  $('howSheet').addEventListener('click', (e) => {
    if (e.target === $('howSheet')) $('howSheet').hidden = true;
  });
  $('musicBtnMenu').addEventListener('click', toggleMusic);
  $('mapMusic').addEventListener('click', toggleMusic);
  startTitle();

  /* ================= Player name and leaderboard ================= */
  // On the claude.ai link the board is shared live through the page's database (each player writes only their own row).
  // Self-hosted games read the shared leaderboard API, never device-local rankings.
  let DB = null,
    UID = null,
    boardUnsub = null,
    boardReadOnly = false;
  const NAME_A2 = [
    'Bubbly',
    'Splashy',
    'Coral',
    'Sunny',
    'Wavy',
    'Lucky',
    'Speedy',
    'Jolly',
    'Swift',
    'Shiny',
    'Salty',
    'Zippy',
  ];
  const NAME_B2 = [
    'Dolphin',
    'Starfish',
    'Clownfish',
    'Seahorse',
    'Turtle',
    'Octopus',
    'Puffer',
    'Crab',
    'Manta',
    'Squid',
    'Shrimp',
    'Urchin',
  ];
  const cleanName = (v) =>
    String(v || '')
      .replace(/\s+/g, ' ')
      .trim();
  const validName = (v) => /^[\p{L}\p{N}][\p{L}\p{N} _.'-]{1,15}$/u.test(v);
  function totals() {
    let stars = 0,
      levels = 0,
      best = 0;
    save.stars.forEach((st, i) => {
      if (st) {
        stars += st;
        levels++;
        best = Math.max(best, i + 1);
      }
    });
    return { stars, levels, best };
  }
  (async () => {
    try {
      if (!window.claude || !window.claude.use) return;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      DB = db;
      UID = id;
      if ((await user.can('data.write')) === false) boardReadOnly = true;
      pushScore();
    } catch (e) {}
  })();
  function pushScore() {
    track('progress');
    if (!save.name) return;
    const t = totals();
    save.board = Object.assign({}, save.board, {
      [save.name]: { stars: t.stars, levels: t.levels, best: t.best },
    });
    persist();
    if (!DB || boardReadOnly) return;
    DB.collection('scores')
      .doc(UID)
      .set({ name: save.name, stars: t.stars, levels: t.levels, best: t.best, updated: Date.now() })
      .catch((e) => {
        if (e && e.code === 'invalid_argument') boardReadOnly = true;
      });
  }

  let nameThen = null;
  function openNameScreen(then, renaming) {
    nameThen = then;
    $('nameTitle').textContent = renaming ? 'Pick a new name' : 'What should we call you?';
    $('nameInput').value = save.name || '';
    $('nameNotice').textContent = '';
    $('nameNotice').className = 'notice';
    $('nameScreen').hidden = false;
    setTimeout(() => {
      try {
        $('nameInput').focus({ preventScroll: true });
      } catch (e) {}
    }, 60);
  }
  $('nameDice').addEventListener('click', () => {
    $('nameInput').value = pick(NAME_A2) + ' ' + pick(NAME_B2) + ' ' + Math.floor(rnd(1, 99));
    $('nameInput').value = $('nameInput').value.slice(0, 16).trim();
    $('nameNotice').textContent = 'Nice name!';
    $('nameNotice').className = 'notice';
    sfx.plink();
  });
  $('nameForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = cleanName($('nameInput').value);
    if (!validName(v)) {
      $('nameNotice').textContent =
        v.length < 2
          ? 'Your name needs at least 2 characters.'
          : 'Use letters, numbers and spaces, up to 16 characters.';
      $('nameNotice').className = 'notice bad';
      sfx.bonk();
      return;
    }
    const old = save.name;
    if (old && old !== v && save.board) {
      delete save.board[old];
    }
    save.name = v;
    persist();
    pushScore();
    sfx.plink();
    $('nameScreen').hidden = true;
    renderMenu();
    const then = nameThen;
    nameThen = null;
    if (then) then();
  });

  const AV_COLS = [
    '#ff7a1a',
    '#ff5fa8',
    '#3b6ff0',
    '#33c96a',
    '#9b5cf6',
    '#ef3b3b',
    '#00a6b4',
    '#e0a400',
  ];
  function boardRow(r, rank) {
    const li = document.createElement('li');
    li.className = 'brow' + (rank <= 3 ? ' r' + rank : '') + (r.me ? ' me' : '');
    const name = cleanName(r.name).slice(0, 16) || 'Diver';
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    li.innerHTML =
      '<span class="rk"></span><span class="av"></span><span class="nm"><small></small></span><span class="sc"></span>';
    li.querySelector('.rk').textContent = rank;
    const av = li.querySelector('.av');
    av.textContent = name[0].toUpperCase();
    av.style.background = AV_COLS[h % AV_COLS.length];
    const nm = li.querySelector('.nm');
    nm.insertBefore(document.createTextNode(name + (r.me ? ' (you)' : '')), nm.firstChild);
    nm.querySelector('small').textContent =
      (r.levels || 0) + ' levels cleared' + (r.best ? ' · up to level ' + r.best : '');
    li.querySelector('.sc').textContent = '★ ' + (r.stars || 0);
    return li;
  }
  function renderBoard(rows, note) {
    rows.sort(
      (a, b) =>
        (b.stars || 0) - (a.stars || 0) ||
        (b.levels || 0) - (a.levels || 0) ||
        (a.updated || 0) - (b.updated || 0)
    );
    const list = $('boardList');
    list.innerHTML = '';
    if (!rows.length) {
      const e = document.createElement('li');
      e.className = 'board-empty';
      e.textContent = 'No scores yet. Win a level to get on the board!';
      list.appendChild(e);
    }
    rows.slice(0, 100).forEach((r, i) => list.appendChild(boardRow(r, i + 1)));
    $('boardNote').textContent = note;
    const me = list.querySelector('.me');
    if (me && me.scrollIntoView) me.scrollIntoView({ block: 'nearest' });
  }
  let boardTimer = 0,
    boardRequest = 0;
  async function refreshGlobalBoard(waitForScore = false) {
    const request = ++boardRequest;
    try {
      if (waitForScore && window.WaterAnalytics) await WaterAnalytics.flush();
      const response = await fetch('/api/leaderboard', { cache: 'no-store' });
      if (!response.ok) throw new Error('Leaderboard unavailable');
      const result = await response.json();
      if (request !== boardRequest || $('boardScreen').hidden) return;
      renderBoard(
        result.rows,
        `Global leaderboard · ${result.totalPlayers} players · Top 100 by stars.`
      );
    } catch (_) {
      if (request !== boardRequest || $('boardScreen').hidden) return;
      renderBoard(
        [],
        'The global leaderboard is unavailable. Connect to the game server and try again.'
      );
    }
  }
  function openBoard() {
    closeBoard();
    audio();
    pushScore();
    $('boardScreen').hidden = false;
    if (DB) {
      $('boardList').replaceChildren();
      $('boardNote').textContent = 'Loading scores from every diver…';
      if (!boardUnsub)
        boardUnsub = DB.collection('scores')
          .orderBy('stars', 'desc')
          .limit(100)
          .onSnapshot(
            (snap) => {
              const rows = snap.docs.map((d) => Object.assign({}, d.data(), { me: d.id === UID }));
              renderBoard(
                rows,
                boardReadOnly
                  ? "Live scores from every diver. You can watch, but your view of the game can't post scores."
                  : 'Live scores from every diver, ranked by stars.'
              );
            },
            () =>
              renderBoard([], 'The global leaderboard is unavailable right now. Please try again.')
          );
    } else {
      $('boardList').replaceChildren();
      $('boardNote').textContent = 'Loading the global leaderboard…';
      refreshGlobalBoard(true);
      boardTimer = setInterval(refreshGlobalBoard, 10000);
    }
  }
  function closeBoard() {
    clearInterval(boardTimer);
    boardRequest++;
    $('boardScreen').hidden = true;
    if (boardUnsub) {
      boardUnsub();
      boardUnsub = null;
    }
  }
  $('titleRanks').addEventListener('click', openBoard);
  $('mapRanks').addEventListener('click', openBoard);
  $('boardClose').addEventListener('click', closeBoard);
  $('boardScreen').addEventListener('click', (e) => {
    if (e.target === $('boardScreen')) closeBoard();
  });
  $('boardRename').addEventListener('click', () => {
    closeBoard();
    openNameScreen(openBoard, true);
  });

  /* ================= Install as an app (PWA) ================= */
  const installPanel = $('installPanel'),
    installBtn = $('installBtn'),
    installText = $('installText');
  const standalone =
    (window.matchMedia &&
      matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) ||
    navigator.standalone === true;
  let embedded = true;
  try {
    embedded = window.self !== window.top;
  } catch (e) {} // inside another page's frame, installing is impossible
  const canWorker =
    !embedded &&
    'serviceWorker' in navigator &&
    (location.protocol === 'https:' ||
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1');
  if (canWorker) {
    addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
  let deferredInstall = null;
  const ua = navigator.userAgent || '';
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // Social apps open links in their own browser, which can't install; Android ones can hand off to Chrome.
  const inAppAndroid =
    /Android/.test(ua) &&
    /FBAN|FBAV|Instagram|Twitter|Line/ | Snapchat | TikTok | (musical_ly / i.test(ua));
  if (!standalone && canWorker) {
    // Chrome, Edge, Samsung Internet and other Android browsers: offer the browser's own install prompt
    addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstall = e;
      installBtn.hidden = false;
      installPanel.hidden = false;
    });
    // iPhone and iPad Safari have no install prompt, so explain the Share menu steps instead
    if (iOS) {
      installText.innerHTML =
        'Tap the Share button <span class="share-glyph" aria-hidden="true"></span> in Safari, then <b>Add to Home Screen</b>. It plays full screen, even offline.';
      installPanel.hidden = false;
    }
  }
  installBtn.addEventListener('click', async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    try {
      await deferredInstall.userChoice;
    } catch (e) {}
    deferredInstall = null;
    installPanel.hidden = true;
  });
  addEventListener('appinstalled', () => {
    installPanel.hidden = true;
    deferredInstall = null;
    closeHomeScreen();
  });

  // The once-only "add to home screen" invitation, shown over level 2's intro card.
  const homeScreen = $('homeScreen'),
    homeAdd = $('homeAdd'),
    homeSteps = $('homeSteps');
  function offerHomeScreen() {
    if (standalone || !canWorker || save.homeAsked) return;
    const steps = iOS
      ? [
          'Tap the Share button <span class="share-glyph" aria-hidden="true"></span> at the bottom of Safari.',
          'Scroll down and choose <b>Add to Home Screen</b>.',
          'Tap <b>Add</b>. Opened from another app? Tap <b>Open in Safari</b> first.',
        ]
      : inAppAndroid && !deferredInstall
        ? [
            'Tap the <b>⋮</b> menu at the top of this screen.',
            'Choose <b>Open in Chrome</b> (or your browser).',
            'Tap <b>Install</b> when Water Game offers it.',
          ]
        : null;
    if (!deferredInstall && !steps) return; // this browser can't install: don't promise what it can't do
    save.homeAsked = true;
    persist();
    homeSteps.innerHTML = steps ? steps.map((t) => `<li><span>${t}</span></li>`).join('') : '';
    homeSteps.hidden = !steps;
    homeAdd.hidden = !!steps;
    $('homeLater').textContent = steps ? 'Got it' : 'Maybe later';
    homeScreen.hidden = false;
    setTimeout(() => (steps ? $('homeLater') : homeAdd).focus({ preventScroll: true }), 60);
  }
  function closeHomeScreen() {
    if (homeScreen.hidden) return;
    homeScreen.hidden = true;
    const p = overlay.querySelector('[data-primary]');
    if (p && !overlay.hidden) p.focus({ preventScroll: true });
  }
  homeAdd.addEventListener('click', async () => {
    if (!deferredInstall) return closeHomeScreen();
    deferredInstall.prompt();
    try {
      await deferredInstall.userChoice;
    } catch (e) {}
    deferredInstall = null;
    installPanel.hidden = true;
    closeHomeScreen();
  });
  $('homeLater').addEventListener('click', closeHomeScreen);
  homeScreen.addEventListener('click', (e) => {
    if (e.target === homeScreen) closeHomeScreen();
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeHomeScreen();
  });

  /* ================= Boot ================= */
  function syncTimeOfDay() {
    const next = isNightTime();
    document.documentElement.classList.toggle('night-time', next);
    if (next === nightNow) return;
    nightNow = next;
    if (L) {
      TH = themeFor(li);
      waterGrad = null;
      gameEl.style.background = TH.mid;
      plankton = Array.from({ length: TH.glow || 0 }, () => ({
        x: rnd(0, W),
        y: rnd(TOP, H - 40),
        r: rnd(0.8, 2.2),
        ph: rnd(0, 6),
        v: rnd(-4, 4),
        c: pick(['#7ffcff', '#a6ffcf', '#c9a7ff', '#ffffff']),
      }));
    }
  }
  syncTimeOfDay();
  setInterval(syncTimeOfDay, 60000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncTimeOfDay();
  });
  syncSoundBtns();
  renderMenu();
  requestAnimationFrame(frame);
})();
