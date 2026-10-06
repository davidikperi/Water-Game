# Water Game

## Where to edit

| File                  | Purpose                                                                      |
| --------------------- | ---------------------------------------------------------------------------- |
| `index.html`          | Game screen markup: title, level map, tank, dialogs, and leaderboard         |
| `css/game.css`        | Game styles, grouped by screen with section comments                         |
| `js/game.js`          | Game logic, grouped by levels, sound, physics, rendering, music, and screens |
| `js/analytics.js`     | Player tracking and dashboard statistics                                     |
| `js/habitats.js`      | Area scenery, creature varieties, and night palettes                         |
| `admin/index.html`    | Admin dashboard markup                                                       |
| `admin/dashboard.css` | Dashboard styles                                                             |
| `admin/dashboard.js`  | Loading statistics, tables, searching, export, and logout                    |
| `admin/login.html`    | Admin login form markup                                                      |
| `admin/login.css`     | Login screen styles                                                          |
| `admin/login.js`      | Login submission and error messages                                          |
| `server.js`           | HTTP server, admin authentication, API, and data storage                     |
| `sw.js`               | Offline caching and app updates                                              |
| `tools/`              | Regression checks and the standalone artifact builder                        |

Run `npm install` to install the formatter. `npm run format` formats the code,
`npm run format:check` checks formatting, and `npm test` runs the regression checks.
Game JavaScript and CSS section comments are a quick way to navigate to each feature.
The artifact builder embeds the separate files when a single HTML artifact is needed.

## Running the game

The leaderboard is shared across players through `/api/leaderboard` on this
server, and refreshes every ten seconds while open. It shows the top 100 players.
Browser-local scores are not used as a leaderboard fallback. A static-only host
cannot provide the shared leaderboard; deploy the Node server to share scores
across devices. Public leaderboard responses contain only display names and scores.

Run `node server.js`, then open `http://localhost:3000`. The dashboard is at `/admin`.

On first run, the server generates a temporary login code and password in
`.admin-credentials.json`. This file is excluded from Git and cannot be served by
the web server. `ADMIN_CODE` and `ADMIN_PASSWORD` environment variables override
these credentials when seeding the database for the first time. With Neon configured,
login is checked against the hashed credentials in `watergame_admins`.
Sessions expire after 12 hours; restarting the server logs admins out.

With `DATABASE_URL` set, player analytics are stored in Neon PostgreSQL.
The local `.env` file loads automatically and is excluded from Git. On a hosted
deployment, set `DATABASE_URL` in the host's environment settings instead.
`npm run db:setup` creates the tables defined in `database/schema.sql`, seeds the
existing admin login as salted hashes, and imports local player records without
overwriting existing database players. This also happens on server startup.
`storage.js` handles database access with parameterized queries and transactions.

Without a database URL, `.watergame-data.json` is the local storage fallback.
Tests explicitly select file storage and never write test players into Neon.
Players are counted by a server-issued browser cookie; clearing
cookies or using another browser counts as a new player. Sessions count page loads.
Attempts and wins are tracked from this update onward. Progress is submitted by
the game, so these figures are analytics rather than verified competitive scores.

Deploy using a Node-capable host, with `HOST=0.0.0.0` and the host's `PORT`. For an
HTTPS deployment, set `COOKIE_SECURE=true`. Static-only hosting does not run the
login or shared analytics API. The service worker bypasses admin and API routes.

Neon stores players in `watergame_players` and admin credential hashes in
`watergame_admins`. The server waits for database initialization before listening,
and database failures do not silently switch players back to device-local data.
Do not put database credentials in browser scripts or commit `.env`.

Checks: `node tools/check-admin.js`, `node tools/check-music.js`, and
`node tools/check-splash.js`.
