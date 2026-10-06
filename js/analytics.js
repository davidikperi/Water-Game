/* Local fallback plus shared tracking when served by server.js. */
(function (root) {
  const KEY = 'watergame.analytics.v1';
  let pending = Promise.resolve();
  function read() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      if (data && data.players && typeof data.players === 'object') return data;
    } catch (_) {}
    return { players: {} };
  }
  function record(save, event, level, stars) {
    try {
      if (!save.playerId) return;
      const data = read(),
        now = Date.now();
      const p = (data.players[save.playerId] ||= {
        id: save.playerId,
        joined: now,
        attempts: {},
        wins: {},
        sessions: 0,
      });
      p.name = save.name || 'Unnamed diver';
      p.lastSeen = now;
      p.stars = Array.isArray(save.stars) ? save.stars.slice() : [];
      p.currentLevel = Number.isInteger(level) ? level + 1 : (save.at || 0) + 1;
      if (event === 'session') p.sessions++;
      if (event === 'start') p.attempts[level + 1] = (p.attempts[level + 1] || 0) + 1;
      if (event === 'win') p.wins[level + 1] = (p.wins[level + 1] || 0) + 1;
      if (event === 'lose') p.losses = (p.losses || 0) + 1;
      localStorage.setItem(KEY, JSON.stringify(data));
      if (root.location && /^https?:$/.test(root.location.protocol)) {
        const payload = JSON.stringify({
          event,
          level,
          name: p.name,
          stars: p.stars,
          currentLevel: p.currentLevel,
        });
        // Serialize events so the first response establishes the player cookie before later events.
        pending = pending
          .then(() =>
            fetch('/api/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: payload,
              keepalive: true,
            })
          )
          .catch(() => {});
      }
    } catch (_) {
      /* Analytics must never interrupt gameplay. */
    }
  }
  function summarize(data, levelCount, now = Date.now()) {
    const players = Object.values(data.players);
    const levels = Array.from({ length: levelCount }, (_, i) => ({
      level: i + 1,
      attempts: 0,
      wins: 0,
      cleared: 0,
    }));
    let stars = 0,
      cleared = 0,
      sessions = 0,
      active = 0;
    for (const p of players) {
      sessions += p.sessions || 0;
      if (p.lastSeen >= now - 86400000) active++;
      levels.forEach((l, i) => {
        l.attempts += p.attempts[l.level] || 0;
        l.wins += p.wins[l.level] || 0;
        if (p.stars[i] > 0) {
          l.cleared++;
          cleared++;
          stars += p.stars[i];
        }
      });
    }
    return { players, levels, stars, cleared, sessions, active, total: players.length };
  }
  root.WaterAnalytics = { read, record, summarize, flush: () => pending };
})(typeof window !== 'undefined' ? window : globalThis);
