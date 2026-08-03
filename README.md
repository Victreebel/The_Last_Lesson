# The Last Lesson

**The Last Lesson** is a real-time strategy and empire simulation where a God-King's greatest weapon is the leaders they teach. Every order, miracle, reward, and punishment becomes a lesson that shapes how heirs govern newly conquered settlements.

The current browser prototype is a playable single-player campaign: establish the Crown, build on terrain-bound resources, train and supply battalions, capture rival thrones, and govern every settlement you take.

## Playable Systems

- Deterministic five-second simulation ticks, save/load, command logs, and replay-safe state.
- Versioned replay records that preserve an opening world, applied command log, and duration for deterministic verification and future player-facing replay review.
- Authoritative real-time co-op: an in-game `MULTI` lobby joins named rooms through a WebSocket host, submits untimestamped player intents, and renders host-owned deterministic snapshots. The host prepares the same opening labor plan as a local reign, owns tick timing and command IDs, and cleans up empty rooms.
- Real-time battlefield camera, selection, movement, attack orders, garrisons, land caravans, and Warships.
- Terrain-bound construction and harvesting: fertile farms, forest lumber mills, iron mines, luxury-grove plantations, roads, moats, walls, gates, outposts, and housing. The construction palette reports live affordability, terrain role, and precise placement failures before it queues a build order.
- Plantations generate global Luxury while improving their settlement's happiness and devotion, creating a peaceful route into stronger Faith generation.
- Moats create approachable but costly siege geometry, halving enemy movement while they cross the defended perimeter.
- Population, food, local growth, starvation, health-driven plague, civilian housing losses, captives, rebellion, faith, religion, and miracles. Mobilizing a battalion removes citizens from civilian work, preserving food labor after other roles, so military growth has a visible economic cost. Bless Harvest, Inspire Army, Mend Settlement, and Divine Judgment give Faith distinct economic, battlefield, civic-recovery, and religious responses; road corridors, caravans, and frontier outposts also carry religious influence between empires. Faith reports separately explain citizen, local military, internal-religion, and rival-pressure contributions. A catastrophic, ungarrisoned settlement can defect under overwhelming rival pressure, replacing its governor without killing them.
- Captive policy writes a lasting Civic Record instead of a morality meter. Captives taken, integrated, and released remain inspectable facts; an unresolved history of captivity raises rebellion pressure across the empire.
- Battalion specializations, persistent combat experience, ranks, earned terrain and siege traits, victory-earned and civic-recovery morale, scout hounds, supply, visibility, enemy scouting, specialization-aware combat feedback, and empire-scoped victory.
- Heirs with inspectable doctrine statements that explain their observed condition, preferred action, intended purpose, confidence, utility decisions, concerns, rewards, punishments, and live lesson feedback.
- Multi-settlement Crown management through castle selection and the compact `REALM` navigator.
- A campaign-opening rival doctrine choice: `DISCIPLE`, `RIVAL`, or `ARCHITECT` changes only the rival's opening grace and doctrine-learning pace, never grants hidden resources or combat bonuses.
- Four deterministic Campaign Theatre openings with distinct authoritative terrain: `CROWNFALL` for a balanced throne war, `RIVERGATE` for a navigable civic-waterway and naval play, `ASHEN OATH` for plague recovery beyond a blighted marsh belt, and `STONEWALL` for hill-fort defense, logistics, retreat, and counter-siege play.
- Rival settlements begin with their own terrain-valid farms and labeled fertile fields, so every theatre opens against sustainable enemy economies rather than passive empty-castle targets.
- A local Campaign Chronicle marks every theatre the Crown has conquered and recommends a four-chapter route through the theatres without locking scenario access or changing match rules.
- Local save/load from the Book of Lessons, plus an automatic recovery save every five world ticks and a `CONTINUE LOCAL REIGN` entry point after refresh. Reigns can also export as portable `.tll` archives and restore on another browser without losing their deterministic replay origin.
- An authoritative end-of-reign debrief records campaign duration, thrones taken, lessons taught, heir guidance, Faith held, and the Civic Record of captives taken, integrated, and released.
- The end-of-reign debrief can immediately replay the current theatre or return to Campaign Theatre selection, preserving a smooth path between scenarios.
- Responsive tactical presentation: phone-sized views reflow the header and command surface, preserve the campaign choice, and suppress minimap/intel chrome that cannot fit without obscuring play.
- Local `SFX`, `MOTION`, and `VISIBILITY` preferences keep optional tactical audio, transient visual effects, and high-contrast presentation under player control without affecting the simulation, saves, replays, or multiplayer authority. Motion and contrast default to the relevant browser accessibility preference until the player chooses otherwise.
- A painterly isometric building atlas renders every construction type while retaining explicit ownership tint, terrain-aware labels, and the existing deterministic selection and placement hitboxes.
- Painterly formation markers distinguish militia, spears, archers, raiders, scout hounds, and Warships at a glance while preserving tactical labels, ownership tint, and selection feedback.

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

It listens on `ws://127.0.0.1:8787` by default. Open `MULTI` from the top command bar, enter the host address and a room name, then join as the Crown. The browser-side `RemoteAuthorityClient` and host use a shared serialized contract: clients join a named room, submit untimestamped intents, and receive host-owned snapshots. The host rejects cross-empire orders and arbitrary Faith grants before they enter simulation. The host also bounds each Crown to 48 intents per five-second window, which comfortably allows ordinary multi-segment construction while protecting the authoritative simulation from command floods. Time controls become host-owned while connected; an interrupted connection freezes the displayed reign and exposes `REJOIN` rather than drifting into an invalid local simulation. The host issues a browser-local reconnect token for each Crown-room-host combination, so `REJOIN` can safely reclaim a retained room even if the previous socket has not finished closing. An empty room is held for two minutes so recovery can resume the same authoritative reign while the host remains online. Account identity, public matchmaking, and broader production anti-cheat remain later delivery work.

For container deployment, health checks, and the required `wss://` production boundary, see [Multiplayer Hosting](docs/MultiplayerHosting.md).

## Core Controls

- Arrow keys: pan the tactical camera.
- Mouse wheel: zoom between empire and battalion scale while keeping the hovered battlefield point in view.
- Click or drag: select Crown forces.
- Right-click or use the command dock: issue movement, attack, retreat, embarkation, and supply orders.
- `BUILD`: choose a structure, then click terrain; drag to lay roads and walls.
- `HOUNDS`: train a fast four-hound scout pack from a Town Square. It costs food and wood, reveals farther than a battalion, and uses no citizens.
- Click a Crown Castle or choose a seat in `REALM`: change the active governor and settlement command context.
- `HEIR`: inspect doctrine and reward or punish the current governor's last lesson.
- `BOOK`: inspect recent history and create or restore a local deterministic save.
- `B`, `H`, `R`, and `L`: toggle the Build, Heir, Realm, and Book panels.
- In Campaign Theatre, use arrow keys to move the visible focus between theatres and rival doctrines, `Tab` to cycle every available choice, and `Enter` or `Space` to select or begin the focused reign.
- `M` and `A`: enter move and attack targeting modes.
- `F`: enter advance mode. Selected battalions march to the designated position, engage visible enemies encountered en route, then resume their advance.
- `X`: toggle high-contrast tactical presentation. The same local preference is available in the Book of Lessons as `VISIBILITY`.
- `Ctrl`/`Cmd` + `1` through `9`: assign selected Crown battalions to a control group; press its number to recall surviving members and press it twice to center the camera on them.
- `Esc`: cancel building placement, close open command panels, or clear the current selection.
- `VERIFY REPLAY`: confirm that the active reign can be reproduced from its opening world and command history.
- `REVIEW REIGN`: replay the command history from tick zero in read-only mode, then return exactly to the live paused campaign.
- Space or `PAUSE`: pause/resume the live simulation.
- `SPEED`: cycle the live presentation clock through 1x, 2x, and 3x without changing deterministic simulation rules.
- A local reign pauses when its browser tab is hidden; resume deliberately on return. Multiplayer time remains host-owned.

## Quality Gates

Run the complete local release check with:

```sh
pnpm check
```

GitHub Actions runs the same check for every pull request and `main` push, then retains the verified web build as the `the-last-lesson-web` artifact for fourteen days.

## Web Release

Every verified `main` push also runs a GitHub Pages deployment workflow with the repository base path configured for the static build. Enable GitHub Pages with **GitHub Actions** as the publishing source once in the repository settings; after the first successful deployment, the campaign will be available at `https://victreebel.github.io/The_Last_Lesson/`.

GitHub Pages serves the complete single-player experience. Multiplayer still requires a separately hosted WebSocket authority, so public matchmaking and account-backed online play remain a later delivery milestone.

The static campaign is installable on supported browsers. A successful load precaches its exact production shell, engine, tactical art, icons, and manifest, so the single-player campaign can reopen offline; a browser must reconnect before joining a multiplayer host.

Every scenario opens with an Imperial Mandate. Its active directive highlights the existing Build, Command, or Heir control that can advance the objective; this is guidance only, so every order and policy choice remains the player's.

Release art is generated reproducibly with `pnpm optimize:assets`. It keeps the original painterly PNGs in `art/source/` and writes the smaller runtime WebP battlefield, building, unit, and Campaign Theatre atlases plus the social preview into `public/assets/` before every production build.

## Storefront Package

Create a self-contained HTML5 upload archive with:

```sh
pnpm package:storefront
```

This produces `release/the-last-lesson-web.zip`, with `index.html` at its root and relative asset paths for browser-game storefronts. The archive includes the install manifest and offline worker; it is the single-player campaign package, while online co-op still needs an authoritative WebSocket host.

The package validates itself after creation. To verify an already-built archive independently, run `pnpm verify:storefront`. GitHub Actions retains the exact verified storefront archive as `the-last-lesson-storefront` for fourteen days. See [Storefront Release](docs/StorefrontRelease.md) for the upload gate.

```sh
pnpm build
pnpm test
```

The test suite covers deterministic simulation, saves, captures, doctrine learning, faith/religion, population, terrain, combat specialization, logistics, naval transport, garrisons, captive policy, visibility, campaign scale, and real WebSocket authority transport.

Run `pnpm balance:soak` to print the bounded Campaign Theatre health matrix used by the automated release suite: Civic and Hold Fast Crown openings across four deterministic seeds and Disciple, Rival, and Architect doctrine profiles. It supplements, but does not replace, human balance playtests.

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
- [Storefront Release](docs/StorefrontRelease.md)
