let summary;
const $ = (id) => document.getElementById(id);
function cell(row, value) {
  const td = document.createElement('td');
  td.textContent = value;
  row.appendChild(td);
  return td;
}
function renderPlayers() {
  $('players').replaceChildren();
  const query = $('search').value.toLowerCase();
  const rows = summary.players
    .filter((p) => p.name.toLowerCase().includes(query))
    .sort((a, b) => b.lastSeen - a.lastSeen);
  for (const p of rows) {
    const row = document.createElement('tr');
    cell(row, p.name);
    cell(row, p.stars.filter((s) => s > 0).length);
    cell(
      row,
      p.stars.reduce((a, b) => a + (b || 0), 0)
    );
    cell(row, p.currentLevel);
    cell(row, p.sessions);
    cell(row, new Date(p.lastSeen).toLocaleString());
    $('players').appendChild(row);
  }
  if (!rows.length) {
    const row = document.createElement('tr');
    const td = cell(
      row,
      query
        ? 'No matching players.'
        : 'No tracked players yet. Open the game and start playing in this browser.'
    );
    td.colSpan = 6;
    td.className = 'empty';
    $('players').appendChild(row);
  }
}
let source;
async function refresh() {
  try {
    const response = await fetch('/api/admin/players');
    if (response.status === 401) {
      location.href = '/admin';
      return;
    }
    if (!response.ok) throw new Error('Unable to load analytics');
    source = await response.json();
  } catch (error) {
    $('updated').textContent = 'Could not load analytics. Use Refresh to retry.';
    return;
  }
  summary = WaterAnalytics.summarize(source, 120);
  $('cards').replaceChildren();
  for (const [label, value] of [
    ['Total players', summary.total],
    ['Active in last 24 hours', summary.active],
    ['Available levels', 120],
    ['Levels cleared', summary.cleared],
    ['Stars earned', summary.stars],
    ['Sessions', summary.sessions],
  ]) {
    const card = document.createElement('div');
    card.className = 'card';
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    const number = document.createElement('strong');
    number.textContent = value;
    card.append(labelEl, number);
    $('cards').appendChild(card);
  }
  renderPlayers();
  $('levels').replaceChildren();
  for (const l of summary.levels) {
    const row = document.createElement('tr');
    cell(row, l.level);
    cell(row, l.attempts);
    cell(row, l.wins);
    const rate = l.attempts ? Math.round((l.wins / l.attempts) * 100) : 0;
    const td = cell(row, l.attempts ? rate + '%' : '—');
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('i');
    fill.style.width = rate + '%';
    bar.appendChild(fill);
    td.appendChild(bar);
    cell(row, l.cleared);
    $('levels').appendChild(row);
  }
  $('updated').textContent = 'Updated ' + new Date().toLocaleString();
}
$('search').addEventListener('input', renderPlayers);
$('refresh').addEventListener('click', refresh);
$('export').addEventListener('click', () => {
  if (!source) return;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(source, null, 2)], { type: 'application/json' })
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = 'watergame-analytics.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
const logout = document.createElement('button');
logout.textContent = 'Log out';
logout.addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  location.href = '/admin';
});
$('refresh').parentElement.appendChild(logout);
refresh();
