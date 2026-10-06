# Water Game

The classic ₦100 handheld water toy, reimagined as a browser game. Pump water,
float colourful rings, and time their descent onto the poles as you travel
through 120 levels under the sea.

## How to play

1. Choose a diver name and start your underwater journey.
2. Tap either yellow pump to launch nearby rings. A quick tap gives a strong
   burst; holding the button keeps a gentler stream flowing.
3. Guide rings above the poles, then release the pumps and let them sink onto
   the tips. The jets angle inward to help rings cross the tank, and a small
   nudge helps descending rings that are close to a compatible pole.
4. Follow the level's objective: land all the rings, match their colours to
   the poles, or land a target number before time runs out. White poles accept
   any coloured ring.
5. Keep black rings off the poles. Use **MEGA** to lift loose rings and clear
   poles carrying black rings. It recharges every eight seconds.

Clear a level to unlock the next one. Finish faster to earn up to three stars,
and replay earlier levels to improve your score. Every fifth level is a speed
round; later challenges introduce currents and limited pump counts.

## Controls

| Action     | Touch / mouse                                  | Keyboard   |
| ---------- | ---------------------------------------------- | ---------- |
| Left pump  | Left yellow button or left half of the water   | `A` or `←` |
| Right pump | Right yellow button or right half of the water | `L` or `→` |
| MEGA burst | Orange MEGA button                             | `Space`    |

Use the back chevron to return to the level map, or the restart button to try
the current level again. The game pauses when you switch away from its tab.

## Explore six underwater areas

| Area           | What you'll see                                                   |
| -------------- | ----------------------------------------------------------------- |
| Sunny Shallows | Sandy lagoons, shells, bright fish, pufferfish, rays, and turtles |
| Coral Garden   | Branching coral, colourful reef fish, pufferfish, and jellyfish   |
| Kelp Forest    | Tall swaying plants, seahorses, rays, and passing turtles         |
| Twilight Reef  | Underwater ruins, rays, seahorses, and drifting jellyfish         |
| Deep Trench    | Jagged rocks, bubbling vents, lantern fish, and rays              |
| Abyss Glow     | Glowing sea growth, lantern fish, seahorses, and jellyfish        |

Scenery arrangements and creature mixes vary between levels within each area.
Your device's local clock also changes the atmosphere: from **6 pm to 6 am**,
the title screen has stars and a moon, the map darkens, and levels take on
moonlit colours. Some levels remain special night dives during the day.

## Scores and progress

Your level progress is saved in your browser. The shared leaderboard ranks
players by stars, shows the top 100, and refreshes every ten seconds while open.
Players using the same hosted game can compare scores across devices.

Player tracking uses browser profiles, so playing in a different browser or
clearing cookies can count as a new player. Progress does not automatically
transfer between devices.

## Sound and mobile play

Enjoy a whimsical storybook soundtrack, watery pump effects, and a short
bubble transition. Music and sound effects have separate toggles. Audio starts
after you interact with the game.

Water Game supports touch controls and desktop keyboards. On supported browsers,
you can add it to your home screen and play offline after its assets have been
cached. The shared leaderboard needs an internet connection.

## Admin dashboard

The password-protected dashboard at `/admin` lets the game owner view player
counts, recent activity, sessions, stars, level progress, and attempts and wins
by level. It also supports searching players and exporting analytics.

## Play locally

Requires Node.js 24.

```bash
npm install
npm start
```

Open `http://localhost:3000` to play. Set `DATABASE_URL` in a local `.env` file
to use Neon for shared scores, analytics, and admin authentication. Without it,
the server uses local file storage. Keep credentials out of Git.

## Credits

The game takes inspiration from the classic handheld water ring-toss toy.
Audio sources and the current transition clip are documented in
[audio/CREDITS.md](audio/CREDITS.md).
