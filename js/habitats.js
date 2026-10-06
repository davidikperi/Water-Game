// Decorative habitats and swimmers. These visuals do not change the ring physics.
(function (root) {
  const AREAS = [
    {
      scenery: 'lagoon',
      fish: ['reef', 'puffer', 'ray'],
      count: 7,
      jelly: 0,
      turtles: 1,
      crabs: 2,
      weeds: 5,
      colours: ['#ff983f', '#ffe177', '#4fd9bc'],
      night: [205, 220],
      decor: '#edd8a2',
    },
    {
      scenery: 'coral',
      fish: ['reef', 'puffer'],
      count: 10,
      jelly: 1,
      turtles: 1,
      crabs: 2,
      weeds: 3,
      colours: ['#ff866e', '#ff8cc4', '#b4a0ff'],
      night: [185, 205],
      decor: '#ff94b5',
    },
    {
      scenery: 'kelp',
      fish: ['seahorse', 'reef', 'ray'],
      count: 5,
      jelly: 0,
      turtles: 2,
      crabs: 1,
      weeds: 12,
      colours: ['#fbd885', '#95dfad', '#71c6bc'],
      night: [165, 185],
      decor: '#5cbf94',
    },
    {
      scenery: 'ruins',
      fish: ['ray', 'seahorse'],
      count: 4,
      jelly: 3,
      turtles: 0,
      crabs: 1,
      weeds: 3,
      colours: ['#c5b6ff', '#eea5d1', '#8fbef1'],
      night: [255, 240],
      decor: '#a99dd2',
    },
    {
      scenery: 'trench',
      fish: ['lantern', 'ray'],
      count: 3,
      jelly: 2,
      turtles: 0,
      crabs: 0,
      weeds: 1,
      colours: ['#87b7d6', '#8ba5df', '#77d9cc'],
      night: [215, 230],
      decor: '#658ba4',
    },
    {
      scenery: 'glow',
      fish: ['lantern', 'seahorse'],
      count: 4,
      jelly: 5,
      turtles: 0,
      crabs: 0,
      weeds: 6,
      colours: ['#6ef1d1', '#bb9aff', '#ff9de0'],
      night: [275, 250],
      decor: '#79f0d0',
    },
  ];
  const noise = (i, k) => {
    const n = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  function profile(level) {
    const zone = Math.max(0, Math.min(5, Math.floor(level / 20))),
      variant = level % 4;
    const area = AREAS[zone];
    return {
      ...area,
      zone,
      variant,
      seed: level + 1,
      species: area.fish[variant % area.fish.length],
      nightPalette: [
        `hsl(${area.night[0] + variant * 3}, 43%, 25%)`,
        `hsl(${area.night[1]}, 52%, 17%)`,
        `hsl(${area.night[1]}, 60%, 9%)`,
      ],
    };
  }
  function drawBackground(c, habitat, width, height, time, night) {
    const { scenery, seed, variant, decor } = habitat;
    c.save();
    c.strokeStyle = decor;
    c.fillStyle = decor;
    c.lineCap = 'round';
    c.globalAlpha = night ? 0.24 : 0.3;
    const count = 5 + variant;
    for (let i = 0; i < count; i++) {
      const x = noise(seed, i + 1) * width,
        base = height - 18;
      const size = 24 + noise(seed, i + 31) * 38;
      if (scenery === 'lagoon') {
        c.beginPath();
        c.ellipse(x, base - 12, size, size * 0.2, -0.15, 0, Math.PI * 2);
        c.fill();
        // Fan shells sit behind the playable seabed.
        c.lineWidth = 2;
        for (let rib = -2; rib <= 2; rib++) {
          c.beginPath();
          c.moveTo(x, base);
          c.quadraticCurveTo(x + rib * 7, base - size * 0.5, x + rib * 10, base - size);
          c.stroke();
        }
      } else if (scenery === 'coral') {
        c.lineWidth = 7 + variant;
        c.beginPath();
        c.moveTo(x, base);
        c.lineTo(x, base - size * 2);
        c.stroke();
        for (let branch = 0; branch < 4; branch++) {
          const y = base - size * (0.5 + branch * 0.35),
            side = branch % 2 ? 1 : -1;
          c.beginPath();
          c.moveTo(x, y);
          c.quadraticCurveTo(x + side * size * 0.7, y, x + side * size * 0.7, y - size * 0.55);
          c.stroke();
        }
      } else if (scenery === 'kelp') {
        const sway = Math.sin(time * 0.55 + i) * 10;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x, base);
        c.quadraticCurveTo(x + sway, base - size * 2, x - sway, base - size * 4);
        c.stroke();
        for (let leaf = 0; leaf < 6; leaf++) {
          const y = base - leaf * size * 0.55,
            side = leaf % 2 ? 1 : -1;
          c.beginPath();
          c.ellipse(x + side * 12 + sway * 0.3, y, 22, 7, side * 0.7, 0, Math.PI * 2);
          c.fill();
        }
      } else if (scenery === 'ruins') {
        c.lineWidth = 12;
        c.beginPath();
        c.moveTo(x - size * 0.65, base);
        c.lineTo(x - size * 0.65, base - size * 1.5);
        c.arc(x, base - size * 1.5, size * 0.65, Math.PI, 0);
        c.lineTo(x + size * 0.65, base);
        c.stroke();
        c.fillRect(x - size, base - size * 0.2, size * 2, 10);
      } else if (scenery === 'trench') {
        c.beginPath();
        c.moveTo(x - size, base);
        c.lineTo(x - size * 0.4, base - size * 2.8);
        c.lineTo(x + size * 0.1, base - size * 2);
        c.lineTo(x + size * 0.4, base - size * 3.4);
        c.lineTo(x + size, base);
        c.closePath();
        c.fill();
        // Distant vent bubbles stay behind the rings.
        for (let b = 0; b < 4; b++) {
          const y = base - ((time * 14 + b * 35) % 180);
          c.beginPath();
          c.arc(x + Math.sin(time + b) * 5, y, 3 + b, 0, Math.PI * 2);
          c.stroke();
        }
      } else {
        c.shadowColor = decor;
        c.shadowBlur = 12;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x, base);
        c.lineTo(x, base - size * 1.5);
        c.stroke();
        c.beginPath();
        c.ellipse(x, base - size * 1.5, size * 0.65, size * 0.3, 0, Math.PI, Math.PI * 2);
        c.closePath();
        c.fill();
        for (let dot = 0; dot < 3; dot++) {
          c.beginPath();
          c.arc(x + (dot - 1) * size * 0.3, base - size * 1.6, 2.5, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
    c.restore();
  }
  function drawSwimmer(c, f, time) {
    if (f.species === 'reef' || !f.species) return false;
    const s = f.s,
      flap = Math.sin(time * 2 + f.ph);
    c.save();
    c.translate(f.x, f.cy);
    c.scale(f.d, 1);
    c.fillStyle = f.c;
    c.strokeStyle = f.c;
    c.lineWidth = 2;
    if (f.species === 'ray') {
      c.beginPath();
      c.moveTo(s, 0);
      c.quadraticCurveTo(0, -s * (1.2 + flap * 0.2), -s * 1.4, -s * 0.3);
      c.quadraticCurveTo(-s * 0.7, 0, -s * 1.4, s * 0.3);
      c.quadraticCurveTo(0, s * (1.2 + flap * 0.2), s, 0);
      c.fill();
      c.beginPath();
      c.moveTo(-s, 0);
      c.quadraticCurveTo(-s * 2, flap * 5, -s * 2.6, 0);
      c.stroke();
    } else if (f.species === 'seahorse') {
      c.lineWidth = s * 0.45;
      c.beginPath();
      c.moveTo(s * 0.2, -s * 0.5);
      c.bezierCurveTo(-s * 0.9, -s * 0.3, s * 0.7, s * 0.8, -s * 0.3, s * 1.1);
      c.stroke();
      c.lineWidth = 2;
      c.beginPath();
      c.arc(-s * 0.35, s * 0.8, s * 0.32, 0, Math.PI * 1.6);
      c.stroke();
      c.beginPath();
      c.ellipse(s * 0.1, -s * 0.65, s * 0.4, s * 0.3, 0, 0, Math.PI * 2);
      c.fill();
      c.fillRect(s * 0.25, -s * 0.7, s * 0.55, s * 0.15);
    } else if (f.species === 'puffer') {
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        c.beginPath();
        c.moveTo(Math.cos(a) * s * 0.8, Math.sin(a) * s * 0.8);
        c.lineTo(Math.cos(a) * s * 1.2, Math.sin(a) * s * 1.2);
        c.stroke();
      }
      c.beginPath();
      c.arc(0, 0, s * 0.9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = f.c2;
      for (let i = 0; i < 5; i++) {
        c.beginPath();
        c.arc((noise(i, 2) - 0.5) * s, (noise(i, 3) - 0.5) * s, 2, 0, Math.PI * 2);
        c.fill();
      }
    } else {
      c.beginPath();
      c.ellipse(0, 0, s, s * 0.5, 0, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(-s, 0);
      c.lineTo(-s * 1.6, -s * 0.4);
      c.lineTo(-s * 1.6, s * 0.4);
      c.closePath();
      c.fill();
      c.strokeStyle = '#a1e9df';
      c.beginPath();
      c.moveTo(s * 0.3, -s * 0.4);
      c.quadraticCurveTo(s * 0.4, -s * 1.5, s * 0.9, -s);
      c.stroke();
      c.shadowColor = '#7fffe4';
      c.shadowBlur = 9;
      c.fillStyle = '#baffea';
      c.beginPath();
      c.arc(s * 0.9, -s, 3, 0, Math.PI * 2);
      c.fill();
      c.shadowBlur = 0;
    }
    const eyeX = f.species === 'seahorse' ? s * 0.15 : s * 0.45,
      eyeY = f.species === 'seahorse' ? -s * 0.7 : -s * 0.15;
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(eyeX, eyeY, s * 0.15, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#18203d';
    c.beginPath();
    c.arc(eyeX + s * 0.03, eyeY, s * 0.07, 0, Math.PI * 2);
    c.fill();
    c.restore();
    return true;
  }
  root.WaterHabitats = { profile, drawBackground, drawSwimmer };
})(typeof window !== 'undefined' ? window : globalThis);
