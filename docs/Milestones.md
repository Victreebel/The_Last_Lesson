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

## Milestone 4: Persistence Foundation

Status: complete in prototype form.

Implemented:

- Versioned save serialization and validation.
- Deterministic load/resume with pending commands and event-ID continuity.
- Deterministic command-log replay.
