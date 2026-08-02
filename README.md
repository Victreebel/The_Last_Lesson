# The Last Lesson

**The Last Lesson** is a real-time strategy and empire simulation where a God-King's greatest weapon is the leaders they teach. Every order, miracle, reward, and punishment becomes a lesson that shapes how heirs govern newly conquered settlements.

The current browser prototype is a playable single-player campaign: establish the Crown, build on terrain-bound resources, train and supply battalions, capture rival thrones, and govern every settlement you take.

## Playable Systems

- Deterministic five-second simulation ticks, save/load, command logs, and replay-safe state.
- Versioned replay records that preserve an opening world, applied command log, and duration for deterministic verification and future player-facing replay review.
- Authoritative real-time co-op: an in-game `MULTI` lobby joins named rooms through a WebSocket host, submits untimestamped player intents, and renders host-owned deterministic snapshots. The host prepares the same opening labor plan as a local reign, owns tick timing and command IDs, and cleans up empty rooms.
- Real-time battlefield camera, selection, movement, attack orders, garrisons, land caravans, and Warships.
- Terrain-bound construction and harvesting: fertile farms, forest lumber mills, iron mines, luxury-grove plantations, roads, moats, walls, gates, outposts, and housing.
- Plantations generate global Luxury while improving their settlement's happiness and devotion, creating a peaceful route into stronger Faith generation.
- Moats create approachable but costly siege geometry, halving enemy movement while they cross the defended perimeter.
- Population, food, local growth, starvation, health-driven plague, civilian housing losses, captives, rebellion, faith, religion, and miracles. Bless Harvest, Inspire Army, and Divine Judgment give Faith distinct economic, battlefield, and religious responses; road corridors, caravans, and frontier outposts also carry religious influence between empires. Faith reports separately explain citizen, local military, internal-religion, and rival-pressure contributions. A catastrophic, ungarrisoned settlement can defect under overwhelming rival pressure, replacing its governor without killing them.
- Captive policy writes a lasting Civic Record instead of a morality meter. Captives taken, integrated, and released remain inspectable facts; an unresolved history of captivity raises rebellion pressure across the empire.
- Battalion specializations, persistent combat experience, ranks, earned terrain and siege traits, victory-earned and civic-recovery morale, scout hounds, supply, visibility, enemy scouting, combat feedback, and empire-scoped victory.
- Heirs with inspectable doctrine, utility decisions, concerns, rewards, punishments, and live lesson feedback.
- Multi-settlement Crown management through castle selection and the compact `REALM` navigator.
- A campaign-opening rival doctrine choice: `DISCIPLE`, `RIVAL`, or `ARCHITECT` changes only the rival's opening grace and doctrine-learning pace, never grants hidden resources or combat bonuses.
- Four deterministic Campaign Theatre openings: `CROWNFALL` for a balanced throne war, `RIVERGATE` for civic supply and naval play, `ASHEN OATH` for captive management and religious defense, and `STONEWALL` for fortified-frontier defense, logistics, retreat, and counter-siege play.
- Local save/load from the Book of Lessons, plus an automatic recovery save every five world ticks and a `CONTINUE LOCAL REIGN` entry point after refresh.
- An authoritative end-of-reign debrief records campaign duration, thrones taken, lessons taught, heir guidance, and Faith held.
- Responsive tactical presentation: phone-sized views reflow the header and command surface, preserve the campaign choice, and suppress minimap/intel chrome that cannot fit without obscuring play.

## Run Locally

```sh
pnpm install
pnpm dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173/`.

To inspect the production bundle locally:

```sh
pnpm build
pnpm preview
```

## Multiplayer Host

The game now includes a real authoritative WebSocket transport on top of the deterministic simulation. Start a local host with:

```sh
pnpm server:multiplayer
```

It listens on `ws://127.0.0.1:8787` by default. Open `MULTI` from the top command bar, enter the host address and a room name, then join as the Crown. The browser-side `RemoteAuthorityClient` and host use a shared serialized contract: clients join a named room, submit untimestamped intents, and receive host-owned snapshots. The host rejects cross-empire orders and arbitrary Faith grants before they enter simulation. Time controls become host-owned while connected; an interrupted connection freezes the displayed reign and exposes `REJOIN` rather than drifting into an invalid local simulation. An empty room is held for two minutes so a returning client can recover the same authoritative reign while the host remains online. Account identity, public matchmaking, reconnect tokens, rate limits, and broader production anti-cheat remain later delivery work.

## Core Controls

- Arrow keys: pan the tactical camera.
- Click or drag: select Crown forces.
- Right-click or use the command dock: issue movement, attack, retreat, embarkation, and supply orders.
- `BUILD`: choose a structure, then click terrain; drag to lay roads and walls.
- `HOUNDS`: train a fast four-hound scout pack from a Town Square. It costs food and wood, reveals farther than a battalion, and uses no citizens.
- Click a Crown Castle or choose a seat in `REALM`: change the active governor and settlement command context.
- `HEIR`: inspect doctrine and reward or punish the current governor's last lesson.
- `BOOK`: inspect recent history and create or restore a local deterministic save.
- `B`, `H`, `R`, and `L`: toggle the Build, Heir, Realm, and Book panels.
- `M` and `A`: enter move and attack targeting modes.
- `F`: enter advance mode. Selected battalions march to the designated position, engage visible enemies encountered en route, then resume their advance.
- `Ctrl`/`Cmd` + `1` through `9`: assign selected Crown battalions to a control group; press its number to recall surviving members and press it twice to center the camera on them.
- `Esc`: cancel building placement, close open command panels, or clear the current selection.
- `VERIFY REPLAY`: confirm that the active reign can be reproduced from its opening world and command history.
- `REVIEW REIGN`: replay the command history from tick zero in read-only mode, then return exactly to the live paused campaign.
- Space or `PAUSE`: pause/resume the live simulation.
- `SPEED`: cycle the live presentation clock through 1x, 2x, and 3x without changing deterministic simulation rules.

## Quality Gates

```sh
pnpm build
pnpm test
```

The test suite covers deterministic simulation, saves, captures, doctrine learning, faith/religion, population, terrain, combat specialization, logistics, naval transport, garrisons, captive policy, visibility, campaign scale, and real WebSocket authority transport.

GitHub Actions runs this same test-and-build gate for every pull request and every push to `main`.

## Stack

- TypeScript
- Vite
- Phaser 3
- Vitest

## Project Documents

- [Technical Design Specification](docs/TDS.md)
- [Milestone History](docs/Milestones.md)
- [Changelog](docs/Changelog.md)
