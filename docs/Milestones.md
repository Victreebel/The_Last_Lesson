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

Status: complete and expanded into a painterly, labeled tactical prototype.

Implemented:

- Phaser world view with grid terrain, explicit terrain symbols, and a painterly isometric building atlas.
- Deterministic terrain signatures for grassland, fields, forests, iron veins, luxury groves, hills, water, and marshes, preserving clear labels while making terrain readable through pattern as well as color.
- Camera panning with arrow keys.
- UI controls for farm placement, battalion creation, movement, attacking, and manual ticks.
- Build-palette hover guidance for every structure's terrain requirement and tactical or civic role.
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

- Buildings and battalions use painterly assets, while combat effects remain intentionally lightweight rather than bespoke animated art.
- Art and audio still need wider content coverage beyond the tactical feedback baseline.
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
- Data-driven miracle feedback with distinct harvest, inspiration, restoration, and divine-ward visual and audio treatments that stay outside authoritative simulation state.
- A victory/defeat resolution screen that explains the crown outcome and starts a fresh deterministic reign without leaving the battlefield.
- A rival governor that transitions from a protected opening into an explainable offensive expedition, providing a real strategic clock for every match.
- Deterministic visibility for both the Crown and autonomous heirs, with hostile entities hidden until they are observed by a structure, battalion, or caravan.
- A state-driven Imperial Mandate that gives the first campaign a clear progression from economy through force, reconnaissance, a visible Heir-feedback lesson, and conquest.
- Mandate-specific action guidance that highlights the exact existing Build, Command, or Heir controls able to advance the current objective, including both captive-policy choices, without introducing tutorial state or automated orders.
- A dedicated Campaign Theatre presentation phase that suppresses inactive HUD and map labels behind the scenario chooser, retaining the painted battlefield as a deliberate backdrop and restoring the full tactical shell when a reign starts.
- A third opening settlement, Grovewatch, so conquering the first rival throne produces a governed frontier rather than ending the campaign.
- Inspectable Crown castles that focus the heir console and Book of Lessons on the selected settlement's governor.
- Settlement-contextual command controls: selecting a Crown castle routes labor, construction, recruitment, logistics, assimilation, and local miracles to its governed settlement.
- Compact Realm roster for switching between Crown domains, centering the camera, and reviewing each settlement's governor and field population.
- Immediate lesson feedback that translates authoritative doctrine events into an in-world heir/action/confidence banner, making teaching readable at the moment it occurs.
- Captive policy choice between population-oriented assimilation and stability-oriented release, including deterministic effects on happiness, loyalty, devotion, and internal Faith.
- Tactical Uplink threat forecast that summarizes the active settlement's most urgent food, rebellion, religious, or observed military risk.
- Adjustable 1x/2x/3x live presentation speed for accelerating tactical downtime without changing deterministic tick rules.
- Campaign-opening Rival Doctrine profiles for fair, transparent difficulty that changes rival learning pace and opening grace rather than granting raw simulation bonuses.
- Deterministic four-theatre balance reports with Civic and Hold Fast Crown openings per scenario, validating survival, no rejected orders, the early-security versus civilian-labor tradeoff, enemy pressure timing, and Rivergate/Ashen Oath/Stonewall's distinctive opening lesson.
- Automatic local recovery saves every five ticks and a Continue Local Reign opening action, verified through a refresh-and-resume browser pass.
- Versioned portable `.tll` archives from the Book of Lessons, preserving both the active deterministic save and its replay origin across browsers or devices.
- Responsive phone-sized layout pass: reflowed header, scaled campaign panels, accessible command dock, and intentional minimap/intel suppression where those surfaces cannot coexist without overlap.
- Religious infrastructure: completed road corridors and nearby caravans now propagate opposing faith through the existing pressure, rebellion, and faith systems with deterministic source-level events.
- Campaign Theatre with four authored deterministic openings: Crownfall (balanced), Rivergate (civic supply and naval opening), Ashen Oath (captives and hostile religious roads), and Stonewall (a fortified border for testing defense, logistics, retreat, and counter-siege play).
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
- Governing heirs now independently retreat low-morale or low-supply field forces from visible enemy pressure, producing a rewardable or punishable preservation lesson.
- Walls and Gates now affect local hostile movement. Gates provide a deliberately less restrictive breach path, so defensive layout changes actual battlefield choices.
- Construction now requires assigned builders. Builder capacity deterministically allocates progress among foundations, and a site with no available labor visibly stalls rather than advancing for free.
- Governing heirs now staff unfinished foundations before selecting their normal food, military, captive, or faith response, making conquered settlements operational without repetitive player labor reassignment.
- Warships now use water-appropriate movement rather than the land-unit water penalty. Land fortifications remain a land-only movement concern.
- Field battalions now support deterministic attack-move orders: they advance toward a chosen destination, engage visible enemies along the route, and resume their march after combat. The command is replay-safe, multiplayer-authorized, and observed as military doctrine.
- Rival settlements now open with sustainable terrain-valid farms on labeled fertile fields. Scenario-health coverage verifies 72 ticks of viable rival economies and the Crown's standard opening-farm response across every authored theatre.
- Military mobilization now consumes civilian labor capacity. The simulation reconciles labor after recruitment and civilian losses, while governors retain a minimum farm workforce before fielding an additional battalion. Governor-generated battalion IDs are settlement-scoped so simultaneous recruitment remains safe and inspectable.
- Runtime production now protects same-tick multi-settlement commands from entity-ID collisions. A deterministic settlement-scoped suffix preserves separately created buildings, battalions, caravans, and Warships without changing existing single-settlement replay identifiers.
- Campaign-health coverage now also validates the 180-tick campaign clock in all four theatres: a standard economic opening remains viable while a rival expedition has begun to damage the Crown throne, creating pressure without an unattended early defeat.
- The Tactical Uplink now projects the selected Rival Doctrine opening countdown before hostile contact, making the campaign's fair early pressure legible without revealing fogged battlefield state.
- The static single-player build now has a GitHub Pages release pipeline. It independently runs the release gate, builds with the repository subpath, and deploys the verified artifact when Pages is enabled for the repository.
- The static release now generates runtime WebP battlefield and tactical-atlas art from repository-held PNG sources before every build, reducing the initial art payload from approximately 5.2 MB to 0.75 MB without changing the painterly tactical presentation.
- Campaign Theatre victories can now seal optional local Honors tied to each theatre's core tactical lesson, adding replay goals without affecting deterministic campaign rules or multiplayer authority.
- Campaign Theatre maps now differ in authoritative terrain as well as their opening resources and rules: Rivergate expands a navigable southern waterway without closing the rival land route, Ashen Oath owns a blighted marsh belt, and Stonewall begins on a hill-fort ridge. Scenario, health, and balance suites protect those tactical identities.

## Milestone 4: Persistence Foundation

Status: complete in prototype form.

Implemented:

- Versioned save serialization and validation.
- Deterministic load/resume with pending commands and event-ID continuity.
- Deterministic command-log replay.

## Milestone 5: Authoritative Multiplayer

Status: playable local-network co-op complete.

Implemented:

- Transport-free local authority that exclusively owns simulation time and command IDs.
- Explicit client connect/disconnect lifecycle with immutable state snapshots.
- Next-tick command intent scheduling for multiple connected local clients.
- Snapshot state and event hashes proven against the deterministic replay path.
- A named-room `ws` host that validates messages, advances the only simulation instance, and cleans up empty rooms.
- In-game `MULTI` connection lobby, authoritative browser snapshot rendering, and host-owned time controls.
- Host-prepared opening labor, with a genuine tick-one player order deterministically taking precedence.
- Per-intent empire authorization: connected players cannot command rival assets or create Faith outside the civilization simulation.
- A bounded room-resume window: empty rooms stop ticking but retain their authoritative state for two minutes, allowing a client to return to the same reign.
- Browser-local Crown identities and host-issued reconnect tokens: a retained room requires its opaque token to reclaim a known Crown identity, and a valid recovery safely replaces a stale socket without allowing its later close event to drop the recovered session.
- A per-Crown host command budget that rejects floods before they reach authoritative scheduling while preserving normal multi-segment orders.
- A deployable container entry point with a `GET /health` endpoint on the same port as WebSocket authority transport. This keeps production readiness probes outside the deterministic simulation and gives any WebSocket-capable host a clear startup contract.

Acceptance:

- Two connected clients can submit to one authority.
- The authority snapshot exactly matches an equivalent deterministic replay.
- Client-side mutation of a returned snapshot cannot modify host state.

Deferred production work:

- Account identity, public matchmaking, persistent room storage, and broader anti-cheat.
