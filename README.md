# The Last Lesson

**The Last Lesson** is a real-time strategy and empire simulation where a God-King's greatest weapon is the leaders they teach. Every order, miracle, reward, and punishment becomes a lesson that shapes how heirs govern newly conquered settlements.

The current browser prototype is a playable single-player campaign: establish the Crown, build on terrain-bound resources, train and supply battalions, capture rival thrones, and govern every settlement you take.

## Playable Systems

- Deterministic five-second simulation ticks, save/load, command logs, and replay-safe state.
- Real-time battlefield camera, selection, movement, attack orders, garrisons, land caravans, and Warships.
- Terrain-bound construction and harvesting: fertile farms, forest lumber mills, iron mines, roads, walls, gates, outposts, and housing.
- Population, food, local growth, starvation, captives, rebellion, faith, religion, and miracles.
- Battalion specializations, supply, morale, visibility, enemy scouting, combat feedback, and empire-scoped victory.
- Heirs with inspectable doctrine, utility decisions, concerns, rewards, punishments, and live lesson feedback.
- Multi-settlement Crown management through castle selection and the compact `REALM` navigator.
- A campaign-opening rival doctrine choice: `DISCIPLE`, `RIVAL`, or `ARCHITECT` changes only the rival's opening grace and doctrine-learning pace, never grants hidden resources or combat bonuses.
- Local save/load from the Book of Lessons, plus an automatic recovery save every five world ticks and a `CONTINUE LOCAL REIGN` entry point after refresh.
- Responsive tactical presentation: phone-sized views reflow the header and command surface, preserve the campaign choice, and suppress minimap/intel chrome that cannot fit without obscuring play.

## Run Locally

```sh
pnpm install
pnpm dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173/`.

## Core Controls

- Arrow keys: pan the tactical camera.
- Click or drag: select Crown forces.
- Right-click or use the command dock: issue movement, attack, embarkation, and supply orders.
- `BUILD`: choose a structure, then click terrain; drag to lay roads and walls.
- Click a Crown Castle or choose a seat in `REALM`: change the active governor and settlement command context.
- `HEIR`: inspect doctrine and reward or punish the current governor's last lesson.
- `BOOK`: inspect recent history and create or restore a local deterministic save.
- Space or `PAUSE`: pause/resume the live simulation.
- `SPEED`: cycle the live presentation clock through 1x, 2x, and 3x without changing deterministic simulation rules.

## Quality Gates

```sh
pnpm build
pnpm test
```

The test suite covers deterministic simulation, saves, captures, doctrine learning, faith/religion, population, terrain, combat specialization, logistics, naval transport, garrisons, captive policy, visibility, and campaign scale.

## Stack

- TypeScript
- Vite
- Phaser 3
- Vitest

## Project Documents

- [Technical Design Specification](docs/TDS.md)
- [Milestone History](docs/Milestones.md)
- [Changelog](docs/Changelog.md)
