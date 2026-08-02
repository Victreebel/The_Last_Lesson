# Milestones

## Milestone 0: Simulation Kernel

Goal: prove deterministic simulation.

Completion criteria:

- Fixed tick simulation exists.
- Seeded random source exists.
- Commands are queued and logged.
- Events are emitted and logged.
- State hashing is stable.
- The same initial state, seed, and command log produce the same final state and event log.

## Milestone 1: Gray-Box RTS Loop

Goal: prove basic play.

Includes camera, selection, building placement, resource production, battalion creation, movement, and basic combat.

Status: complete and expanded in gray-box form.

Implemented:

- Phaser world view with grid terrain and simple settlement structures.
- Camera panning with arrow keys.
- UI controls for farm placement, battalion creation, movement, attacking, and manual ticks.
- Simulation-backed food, wood, iron, and faith readouts.
- Player-facing labor priorities for food, wood, iron, and construction.
- Deterministic farm placement.
- Deterministic battalion creation.
- Deterministic battalion movement.
- Deterministic attack orders and damage resolution.
- Event feedback panel.
- Milestone 1 simulation test covering create, move, and attack behavior.

Acceptance:

- `pnpm test` passes.
- `pnpm build` passes.
- Browser smoke test confirms the map, controls, and battalion creation render without console errors.

Known limitations:

- Art is intentionally gray-box.
- Combat has no projectile or attack cadence presentation yet.
- Art, audio, and production-ready combat feedback remain future work.
- Selection feedback is intentionally functional rather than final.

## Milestone 2: Heir and Conquest Foundation

Status: complete in prototype form.

Implemented:

- Observable player doctrine learning and continuous confidence.
- Reward/punishment controls and trust changes.
- Governor utility scoring with visible rationale and utility.
- Rival settlement, rival heir, castle capture, heir death, settlement transfer, and victory state.

## Milestone 3: Economy, Faith, and Logistics Foundation

Status: complete in prototype form.

Implemented:

- Terrain-bound farms, lumber mills, and mines.
- Wood and iron construction costs.
- Road movement and supply effects.
- Faith generation, external religious pressure, and rebellion pressure.
- Bless Harvest and Inspire Army miracles.
- Militia, spears, archers, and raiders with resource-gated specialist training, range, counters, and attack cadence.
- Captive capture, hovel capacity, hovel liberation, rebellion escape, and Town Square assimilation.
- Town Square-built land caravans that load food, use roads, deliver battalion supply, and can be raided.
- Battalion embarkation, transport movement, and player-controlled disembarkation.
- Local food consumption, Villa-limited citizen capacity, surplus-driven population growth, and starvation consequences.
- Garrisonable castles, walls, gates, and outposts, including breach consequences and visual command controls.
- Expanded governor utility decisions with concerns, captive integration, defensive garrisoning, and autonomous morale intervention.
- Water-only Warship launch and movement from Town Squares, with transport capacity and embarked-fire restrictions.
- Painterly battlefield art direction integrated beneath deterministic terrain overlays and tactical controls.
- Direct Warship targeting, cooldown-driven naval fire, and deterministic sinking behavior.
- Accessible pause/resume controls and verified responsive command-dock layout.
- Interactive minimap for continuous strategic navigation and camera awareness.
- Event-driven combat feedback for battle readability and tactical impact.
- A victory/defeat resolution screen that explains the crown outcome and starts a fresh deterministic reign without leaving the battlefield.
- A rival governor that transitions from a protected opening into an explainable offensive expedition, providing a real strategic clock for every match.
- Deterministic visibility for both the Crown and autonomous heirs, with hostile entities hidden until they are observed by a structure, battalion, or caravan.
- A state-driven Imperial Mandate that gives the first campaign a clear progression from economy to reconnaissance to conquest.
- A third opening settlement, Grovewatch, so conquering the first rival throne produces a governed frontier rather than ending the campaign.
- Inspectable Crown castles that focus the heir console and Book of Lessons on the selected settlement's governor.
- Settlement-contextual command controls: selecting a Crown castle routes labor, construction, recruitment, logistics, assimilation, and local miracles to its governed settlement.
- Compact Realm roster for switching between Crown domains, centering the camera, and reviewing each settlement's governor and field population.
- Immediate lesson feedback that translates authoritative doctrine events into an in-world heir/action/confidence banner, making teaching readable at the moment it occurs.
- Captive policy choice between population-oriented assimilation and stability-oriented release, including deterministic effects on happiness, loyalty, devotion, and internal Faith.
- Tactical Uplink threat forecast that summarizes the active settlement's most urgent food, rebellion, religious, or observed military risk.
- Adjustable 1x/2x/3x live presentation speed for accelerating tactical downtime without changing deterministic tick rules.
- Campaign-opening Rival Doctrine profiles for fair, transparent difficulty that changes rival learning pace and opening grace rather than granting raw simulation bonuses.
- Automatic local recovery saves every five ticks and a Continue Local Reign opening action, verified through a refresh-and-resume browser pass.
- Responsive phone-sized layout pass: reflowed header, scaled campaign panels, accessible command dock, and intentional minimap/intel suppression where those surfaces cannot coexist without overlap.
- Religious infrastructure: completed road corridors and nearby caravans now propagate opposing faith through the existing pressure, rebellion, and faith systems with deterministic source-level events.
- Campaign Theatre with three authored deterministic openings: Crownfall (balanced), Rivergate (civic supply and naval opening), and Ashen Oath (captives and hostile religious roads).
- Scout Hounds: Town Square-trained, non-population reconnaissance packs with high movement speed and extended visibility.
- Luxury Groves now support terrain-bound Plantations and a dedicated luxury labor assignment. Produced Luxury increases local happiness and devotion, feeding the existing Faith loop.
- Rare settlement defection under catastrophic captive rebellion, rival religious pressure, collapsed loyalty, and absent local defense. Defection is a political transfer: it displaces rather than kills the governor, preserving the rule that only a fallen Castle kills an heir.
- Frontier outposts now contribute bounded local religious pressure, while only local battalions calm a settlement's rebellion pressure. Both effects are surfaced in the existing explainability event stream.
- Faith contribution is now likewise local to each settlement. Faith events expose their citizen, military, religious, and pressure components for player-facing explanation.
- Moats now complete the original defensive construction set. They halve enemy battalion and land-caravan movement in their perimeter and expose the modifier in movement events.
- Battalions now persist combat experience and derive Militia through Legendary ranks. Experience rewards successful fighting and gives veterans stronger morale discipline during supply collapse without direct attack-stat inflation.
- Civic Memory now records captives taken, integrated, and released as durable history rather than an abstract morality meter. Unresolved captivity adds explainable rebellion pressure across an empire.
- Settlement health now has a deterministic plague cycle. Critical health plus food pressure starts a short localized outbreak, with visible deaths and social consequences across three world ticks.
- Destroyed Villas now inflict immediate, event-explained civilian losses and social instability, while Hovels continue to liberate their captive population.
- Decisive battalion victories now create bounded, explainable morale and devotion shifts for the victor, its local allies, and surviving defenders.
- Supplied battalions now recover morale from peaceful, adequately housed, happy, loyal, and religiously secure home settlements, tying civic legitimacy directly to military readiness.
- Battalions now derive terrain and siege traits from actual engagements. Forest, hills, and marsh expertise improves contextual movement; repeated structure attacks create a bounded siege specialization.
- The command dock now includes an explicit Retreat to Crown order. It cancels an engagement, returns selected field forces to their home Castle, carries a small morale cost, and produces an observable lesson.
- Building placement now has simulation-authoritative footprint clearance shared with the tactical placement preview, preventing overlapping foundations and wasted resources.

## Milestone 4: Persistence Foundation

Status: complete in prototype form.

Implemented:

- Versioned save serialization and validation.
- Deterministic load/resume with pending commands and event-ID continuity.
- Deterministic command-log replay.

## Milestone 5: Local Multiplayer Authority

Status: foundation complete.

Implemented:

- Transport-free local authority that exclusively owns simulation time and command IDs.
- Explicit client connect/disconnect lifecycle with immutable state snapshots.
- Next-tick command intent scheduling for multiple connected local clients.
- Snapshot state and event hashes proven against the deterministic replay path.

Acceptance:

- Two connected clients can submit to one authority.
- The authority snapshot exactly matches an equivalent deterministic replay.
- Client-side mutation of a returned snapshot cannot modify host state.

Deferred production work:

- WebSocket transport, authentication, matchmaking, reconnects, and anti-cheat.
