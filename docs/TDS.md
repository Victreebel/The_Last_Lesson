# The Last Lesson

## Technical Design Specification

**Version:** 1.1
**Status:** Active Implementation Blueprint
**Date:** 2026-08-01
**Working Title:** The Last Lesson  
**Repository Identity:** `the-last-lesson`  
**Internal Codename:** `TLL`  
**Primary Stack:** TypeScript, Vite, Phaser 3, Vitest  

---

## 1. Document Purpose

This Technical Design Specification is the implementation blueprint for **The Last Lesson**, a real-time strategy and empire simulation game where the player's greatest weapon is not an army, but the leaders they teach.

The purpose of this document is to translate the frozen design into a buildable software architecture. It defines the repository layout, simulation model, data contracts, runtime boundaries, AI doctrine system, learning model, faith and religion simulation, save and replay formats, networking assumptions, testing strategy, coding standards, and milestone plan.

This document is a living specification. Changes after Version 1.0 must be tracked through versioned amendments and should only occur when implementation or playtesting exposes a concrete issue.

---

## 2. Engineering Constitution

The following rules are binding architectural constraints:

1. The simulation is deterministic.
2. Rendering never mutates simulation state.
3. Autonomous AI decisions are driven by doctrine, pressure, and utility.
4. AI decisions must be explainable to the player.
5. Teaching is progression.
6. Population is the economy.
7. Faith is earned through civilization health and devotion, not harvested directly.
8. Logistics must be represented explicitly.
9. All major mechanics must be testable without the renderer.
10. Multiplayer compatibility must be designed into the simulation from the start.
11. Save files and replays must be versioned.
12. No special-case AI systems unless approved through a design amendment.

---

## 3. High-Level Architecture

The application is divided into three layers:

```text
Input Layer
  -> player commands, UI interactions, network commands

Simulation Layer
  -> deterministic game state, systems, events, AI, learning

Presentation Layer
  -> Phaser rendering, animation, audio, UI, debug overlays
```

Only the Simulation Layer owns truth. The Presentation Layer displays snapshots and submits commands. It never directly changes entity state.

### 3.1 Primary Runtime Flow

```text
Player Input
  -> Command
  -> Command Queue
  -> Simulation Tick
  -> Systems Update
  -> Event Log
  -> State Snapshot
  -> Renderer/UI
```

### 3.2 Core Systems

The engine is composed of twelve systems:

1. Simulation
2. World
3. Population
4. Economy
5. Combat
6. Doctrine
7. Learning
8. Faith
9. Religion
10. Networking
11. Replay
12. UI

---

## 4. Repository Layout

Recommended repository structure:

```text
the-last-lesson/
  docs/
    TDS.md
    GDD.md
    DoctrineLibrary.md
    Balance.md
    Milestones.md
    Changelog.md
  src/
    app/
      main.ts
      gameConfig.ts
    simulation/
      Simulation.ts
      SimulationClock.ts
      SimulationConfig.ts
      commands/
      events/
      state/
      systems/
      random/
      replay/
      save/
    ai/
      doctrine/
      learning/
      decisions/
      explanations/
    content/
      buildings/
      battalions/
      miracles/
      doctrine/
      terrain/
      maps/
    rendering/
      scenes/
      sprites/
      camera/
      overlays/
    ui/
      panels/
      inspectors/
      controls/
    networking/
      protocol/
      server/
      client/
    tests/
      simulation/
      ai/
      replay/
      save/
  public/
    assets/
  tools/
    validateContent.ts
    generateSchemas.ts
  package.json
  vite.config.ts
  vitest.config.ts
  tsconfig.json
  README.md
```

For Milestone 0, `networking/server` may be skeletal. The simulation must still be command-driven so networking can be added without rewriting core systems.

---

## 5. Simulation Model

The game runs in continuous real time with fixed deterministic world ticks.

### 5.1 Timing

Rendering runs at the browser frame rate.

Simulation uses two update modes:

```text
Continuous Update
  - movement interpolation
  - combat timing
  - projectile presentation
  - camera and selection rendering

Fixed World Tick
  - default interval: 5 seconds
  - economy
  - population
  - construction
  - faith
  - religion
  - morale
  - learning
  - rebellion checks
  - AI decisions
  - victory checks
```

The simulation must support a configurable tick interval for testing.

### 5.2 Tick Order

Fixed ticks must execute in this order:

1. Accept queued commands for current tick.
2. Validate commands.
3. Apply valid commands.
4. Update world and territory.
5. Update population.
6. Update economy and resource production.
7. Update construction.
8. Update logistics and supply.
9. Update faith and religion pressure.
10. Update morale, happiness, loyalty, devotion.
11. Update rebellion pressure and captive state.
12. Run AI decision scoring.
13. Execute AI commands.
14. Resolve learning updates.
15. Resolve combat state changes.
16. Emit events.
17. Check victory conditions.
18. Produce snapshot hash.

The order must be deterministic and covered by tests.

### 5.3 Determinism

Determinism requires:

- Seeded random number generator.
- Stable iteration order for entities.
- No use of `Math.random()` in simulation.
- No use of wall-clock time in simulation decisions.
- Integer or fixed precision arithmetic where possible.
- Deterministic content loading.
- Versioned simulation config.

---

## 6. Entity and Component Model

The game uses a lightweight data-oriented entity/component model. This is not a full ECS requirement, but the code should avoid deep inheritance.

### 6.1 Entity Identity

Every entity has:

```ts
type EntityId = string;

interface EntityBase {
  id: EntityId;
  kind: EntityKind;
  ownerEmpireId: EmpireId | null;
  createdAtTick: number;
  destroyedAtTick?: number;
}
```

### 6.2 Primary Objects

The twelve primary domain objects are:

1. `World`
2. `Empire`
3. `Settlement`
4. `Building`
5. `CitizenPopulation`
6. `Battalion`
7. `Heir`
8. `Caravan`
9. `Doctrine`
10. `Miracle`
11. `TerrainTile`
12. `GameEvent`

### 6.3 Core Components

Recommended components:

```ts
interface PositionComponent {
  x: number;
  y: number;
}

interface HealthComponent {
  current: number;
  max: number;
}

interface CombatComponent {
  attack: number;
  defense: number;
  range: number;
  attackCooldownTicks: number;
  targetId?: EntityId;
}

interface MovementComponent {
  speed: number;
  path: PositionComponent[];
  destination?: PositionComponent;
}

interface SupplyComponent {
  food: number;
  maxFood: number;
  supplySourceId?: EntityId;
  starving: boolean;
}

interface MoraleComponent {
  morale: number;
  fatigue: number;
}

interface DoctrineComponent {
  doctrineProfileId: DoctrineProfileId;
}
```

---

## 7. World and Map

The first implementation uses one continuous world map.

The map contains:

- terrain tiles
- resource nodes
- settlement territory
- roads
- walls
- outposts
- water
- fog of war
- religious pressure fields

### 7.1 Fog of War

Each empire maintains known, visible, and inferred map state.

```ts
interface FogState {
  visibleTiles: Set<TileId>;
  exploredTiles: Set<TileId>;
  lastKnownEntities: Record<EntityId, LastKnownEntityState>;
}
```

AI may only use information available to its empire.

---

## 8. Settlements and Buildings

### 8.1 Settlement Definition

A settlement is a territory anchored by one central structure with a seated ruler.

```ts
interface Settlement {
  id: SettlementId;
  ownerEmpireId: EmpireId;
  heirId: HeirId;
  centralBuildingId: BuildingId;
  buildingIds: BuildingId[];
  battalionIds: BattalionId[];
  caravanIds: CaravanId[];
  population: CitizenPopulation;
  localFood: number;
  territoryTiles: TileId[];
  internalFaith: number;
  externalReligiousPressure: number;
  pressures: SettlementPressures;
}
```

### 8.2 Building Types

Initial canonical buildings:

- Castle/Throne
- Military Quarters
- Town Square
- Farm
- Mine
- Plantation
- Mill
- Villa
- Hovel
- Wall
- Road
- Outpost
- Moat

### 8.3 Building Rule

Buildings expose capabilities, not behavior.

```ts
interface BuildingDefinition {
  id: string;
  displayName: string;
  category: BuildingCategory;
  cost: ResourceBundle;
  buildTicks: number;
  maxPerSettlement?: number;
  requiresCentralBuilding: boolean;
  capabilities: BuildingCapability[];
  defense: number;
}
```

The AI decides what to build through doctrine and utility. Buildings never contain AI.

---

## 9. Population System

Population is represented at settlement level, not as individually simulated citizens.

### 9.1 Citizen Population

```ts
interface CitizenPopulation {
  citizens: number;
  captives: number;
  militarizedCitizens: number;
  assignments: LaborAssignments;
  happiness: number;
  loyalty: number;
  devotion: number;
  health: number;
}
```

### 9.2 Population Growth

Population points are gained every world tick from food production and housing capacity.

Citizens require Villas. Captives require Hovels. Insufficient housing should be prevented by construction rules and UI warnings. If caused by destruction, overflow population enters emergency state and becomes vulnerable to death, escape, or rebellion.

### 9.3 Captive Rules

Captives:

- may work
- cannot be military units
- may become citizens through assimilation
- increase rebellion pressure when ratio is high
- live in Hovels
- may be recaptured or freed when their housing or transport is destroyed

---

## 10. Economy and Logistics

### 10.1 Resources

Canonical resources:

- Food
- Wood
- Iron
- Luxury
- Luxury Hybrid: Food
- Luxury Hybrid: Production
- Faith

Food is local. Wood, iron, luxury, and hybrid resources are global unless later balance testing proves otherwise.

### 10.2 Resource Philosophy

Each resource answers one design question:

- Food: can people exist?
- Wood: can buildings exist?
- Iron: can military exist?
- Luxury: can prosperity exist?
- Faith: can miracles exist?

### 10.3 Logistics

Caravans and ships transport units and resources.

Caravans:

- move over land
- use roads for speed
- carry workers, military units, captives, and resources
- allow military passengers to fire as a garrison

Ships:

- move over water
- have built-in attack capability
- carry units and resources
- passenger military units do not fire

Supply lines can be disrupted. Starving armies receive debuffs to morale, attack speed, learning quality, and retreat threshold.

---

## 11. Combat System

Combat is intentionally clean and stat-driven.

```ts
interface Battalion {
  id: BattalionId;
  ownerEmpireId: EmpireId;
  settlementId: SettlementId;
  size: number;
  type: BattalionType;
  position: PositionComponent;
  combat: CombatComponent;
  movement: MovementComponent;
  morale: MoraleComponent;
  supply: SupplyComponent;
  experience: ExperienceComponent;
  orders: BattalionOrder[];
  traits: BattalionTrait[];
}
```

### 11.1 Combat Resolution

Each unit has:

- attack
- defense
- range
- attack speed

Damage reduces defense. Defense functions as a life bar.

### 11.2 Garrison and Siege

Walls and outposts may garrison units. When units are inside a valid garrison, the structure's defense substitutes for the unit's defense until the structure falls.

When the structure reaches zero defense, garrisoned units die unless a specific future content rule creates an evacuation effect. The initial implementation should use the simple rule: zero structure defense destroys the garrison.

### 11.3 Terrain

Terrain affects movement, visibility, attack, defense, and range using clear modifiers inspired by Civilization-style tactical rules.

---

## 12. Doctrine Engine

Doctrine is the central AI language.

### 12.1 Doctrine Grammar

Every doctrine follows:

```text
WHEN situation
PREFER action
BECAUSE goal
WITH confidence 0-100
FROM source
```

### 12.2 Doctrine Interface

```ts
type DoctrineSource =
  | "observed"
  | "rewarded"
  | "punished"
  | "experienced";

interface DoctrineRule {
  id: DoctrineId;
  ownerId: HeirId | BattalionId | EmpireId;
  domain: DoctrineDomain;
  condition: DoctrineCondition;
  preferredAction: DoctrineAction;
  goal: DoctrineGoal;
  confidence: number;
  sourceWeights: Record<DoctrineSource, number>;
  createdAtTick: number;
  updatedAtTick: number;
}
```

### 12.3 Continuous Confidence

Doctrine confidence is continuous from `0` to `100`.

Confidence changes through:

- observation
- reward
- punishment
- successful experience
- failed experience
- decay
- contradictory evidence

### 12.4 Decision Formula

Autonomous decisions use:

```text
Utility =
  pressure
  * doctrine alignment
  * confidence
  * situation modifier
  * randomness modifier
```

The randomness modifier must be deterministic and bounded. Target randomness is 25%.

### 12.5 Explainability

Every AI decision must produce an explanation:

```ts
interface DecisionExplanation {
  decisionId: string;
  actorId: EntityId;
  chosenAction: DoctrineAction;
  candidateActions: ScoredAction[];
  appliedDoctrines: DoctrineId[];
  pressures: Record<string, number>;
  confidenceSummary: Record<DoctrineId, number>;
  finalUtility: number;
  tick: number;
}
```

This explanation powers UI, replay, debugging, and the Book of Lessons.

---

## 13. Learning Engine

Learning modifies doctrine. The AI decision engine itself does not mutate.

### 13.1 Learning Record

```ts
interface LessonRecord {
  id: LessonId;
  observerId: HeirId;
  subjectActorId: EntityId;
  situation: SituationSnapshot;
  action: DoctrineAction;
  outcome: OutcomeSummary;
  inferredGoal: DoctrineGoal;
  confidenceDelta: number;
  source: DoctrineSource;
  tick: number;
}
```

### 13.2 Learning Sources

Heirs learn from:

- observing player commands
- labor assignment patterns
- military specialization patterns
- movement and attack target patterns
- reward
- punishment
- autonomous experience

### 13.3 Heir States

Heirs have two states:

- Learning
- Governance

The prime heir begins in learning state and cannot disagree with the player. Conquered settlements generate a new heir to govern the settlement. Governors can still learn from reward, punishment, and empire-wide signals, but observation is weaker than apprentice learning.

### 13.4 Heir Mortality

An heir can die only when their Castle/Throne or central construction building falls.

When an heir dies:

- personal doctrine is lost
- personal convictions are lost
- personal decision style is lost
- buildings remain
- battalions remain
- settlement infrastructure remains
- the deceased heir is recorded in the Book of Lessons

Doctrine is mortal and personal.

---

## 14. Pressure System

The simulation uses pressure values to unify AI decisions and systemic outcomes.

Recommended pressure categories:

- Food Pressure
- Supply Pressure
- Faith Pressure
- Construction Pressure
- Expansion Pressure
- Military Pressure
- Rebellion Pressure
- Loyalty Pressure
- Devotion Pressure
- Religious Pressure
- Housing Pressure
- Defense Pressure

Pressure values should be normalized to `0..100`.

```ts
interface SettlementPressures {
  food: number;
  supply: number;
  faith: number;
  construction: number;
  expansion: number;
  military: number;
  rebellion: number;
  loyalty: number;
  devotion: number;
  religion: number;
  housing: number;
  defense: number;
}
```

Pressure is not shown as the primary UI. The UI translates pressure into explanations.

---

## 15. Faith and Religion

Each empire has exactly one state religion. Opposing empires project religious pressure.

### 15.1 Faith Generation

Faith is generated every world tick from:

- citizen happiness
- citizen loyalty
- citizen devotion
- military morale
- military devotion
- religion strength

Captives contribute little or no Faith unless assimilated.

### 15.2 Devotion

Devotion is a universal stat representing belief in the God-King's divine authority.

An individual or group may be:

- happy but not devoted
- devoted but unhappy
- loyal but not devout

This separation is critical.

### 15.3 Religious Pressure

Each settlement tracks:

- Internal Faith
- External Religious Pressure

External pressure reduces devotion, lowers Faith generation, increases captive unrest, increases citizen discontent, and can raise settlement defection chance.

Religion spreads through:

- nearby settlements
- outposts
- roads
- caravans
- victories
- captured territory
- miracles

### 15.4 Captive Rebellion

Rebellion probability is pressure-based:

```text
Rebellion Pressure =
  captive ratio
  + enemy religious pressure
  + starvation
  + low loyalty
  + isolation
  + recent defeats
  - military presence
  - internal religion strength
  - devotion
  - nearby citizens
```

No single threshold should be the only cause of rebellion.

---

## 16. Miracles

Miracles consume Faith. They should change decisions, not replace them.

Initial miracles:

1. Bless Harvest
2. Divine Judgment

### 16.1 Miracle Definition

```ts
interface MiracleDefinition {
  id: MiracleId;
  displayName: string;
  faithCost: number;
  cooldownTicks: number;
  targetRules: TargetRule[];
  effects: MiracleEffect[];
  explanationTemplate: string;
}
```

Miracles affect pressures, morale, devotion, visibility, construction, food, or faith. They should not instantly win battles or delete armies in the initial implementation.

---

## 17. Commands and Events

### 17.1 Commands

Commands are player or AI intents.

```ts
interface GameCommand {
  id: CommandId;
  issuedBy: PlayerId | HeirId | "system";
  tick: number;
  type: CommandType;
  payload: unknown;
}
```

Commands must be serializable.

### 17.2 Events

Events are facts emitted by the simulation.

```ts
interface GameEvent {
  id: EventId;
  tick: number;
  type: EventType;
  actorId?: EntityId;
  targetId?: EntityId;
  payload: unknown;
}
```

Events power:

- UI notifications
- replay
- Book of Lessons
- debugging
- learning
- analytics

---

## 18. Replay System

Replays store:

- initial world state
- simulation version
- content version
- random seed
- ordered command log
- reward and punishment events

They do not store every rendered frame.

Replay acceptance requirement:

Given the same initial world, seed, content version, and command log, the simulation must produce the same final state hash and event log.

---

## 19. Save Format

Save files are data-only and versioned.

```ts
interface SaveGame {
  schemaVersion: string;
  gameVersion: string;
  contentVersion: string;
  simulationTick: number;
  randomState: RandomState;
  world: WorldState;
  commandLog: GameCommand[];
  eventLog: GameEvent[];
}
```

Recommended file extension: `.tll`

Save files must not serialize runtime class instances. They must serialize plain data.

---

## 20. Networking

The game should be built for future multiplayer using authoritative command simulation.

### 20.1 Model

```text
Client
  -> submits command

Server
  -> validates command
  -> advances simulation
  -> broadcasts accepted commands/snapshots

Client
  -> renders state
```

### 20.2 Multiplayer Rule

The simulation must not depend on local-only state. If a player command cannot be serialized and replayed, it cannot affect the simulation.

### 20.3 Initial Implementation

Milestone 0 and Milestone 1 do not need live multiplayer. They must still use command logs and deterministic simulation so multiplayer can be added later.

---

## 21. UI Architecture

The UI exists to make the simulation legible.

### 21.1 Core UI Screens

- World view
- Settlement inspector
- Heir inspector
- Battalion inspector
- Doctrine viewer
- Faith and religion panel
- Event log
- Book of Lessons
- Command bar
- Debug inspector

### 21.2 Explainability Rule

Every important value must answer "why?"

Example:

```text
Faith: +32 this tick

Citizen devotion: +12
Military morale: +8
Internal religion: +15
Enemy pressure: -3
```

The first display should be human-readable. Raw numbers may be visible in advanced or debug views.

---

## 22. Testing Strategy

Testing is mandatory because determinism is core to the project.

### 22.1 Test Types

Unit tests:

- random generator
- pressure formulas
- utility scoring
- command validation
- doctrine confidence changes

Simulation tests:

- fixed tick ordering
- resource production
- faith generation
- combat resolution
- rebellion pressure

Replay tests:

- same commands produce same state hash
- event log determinism
- save/load equivalence

AI tests:

- doctrine selection
- explanation generation
- reward increases confidence
- punishment decreases confidence
- contradictory evidence reduces confidence

### 22.2 First Acceptance Test

The first hard acceptance test:

```text
Given:
  initial world A
  seed S
  command log C

When:
  simulation runs for N ticks twice

Then:
  final state hash is identical
  event log hash is identical
```

---

## 23. Coding Standards

### 23.1 TypeScript

- Use strict TypeScript.
- Prefer interfaces for data contracts.
- Prefer pure functions in simulation systems.
- Avoid hidden mutable globals.
- Avoid inheritance-heavy architecture.
- Keep content data separate from engine code.
- Do not use `Math.random()` in simulation.

### 23.2 Naming

- IDs use stable opaque strings.
- Types use PascalCase.
- Variables and functions use camelCase.
- Content IDs use kebab-case.
- Files exporting one main type use PascalCase.

### 23.3 Simulation Code

Simulation code must be:

- deterministic
- serializable
- renderer-independent
- testable in Node/Vitest

### 23.4 Rendering Code

Rendering code may:

- interpolate movement
- animate state changes
- show effects
- play audio
- display UI

Rendering code may not:

- change resources
- resolve combat
- update doctrine
- generate faith
- mutate world state directly

---

## 24. Content Pipeline

Content should be externalized as JSON or TypeScript data modules.

Initial content groups:

- building definitions
- battalion definitions
- miracle definitions
- doctrine templates
- terrain definitions
- starting maps
- balance constants

Content validation should run in tests and CI.

---

## 25. Milestone Plan

### Milestone 0: Simulation Kernel

Goal: prove deterministic simulation.

Includes:

- project scaffold
- fixed tick simulation
- seeded random
- command queue
- event log
- state hash
- basic world state
- replay determinism test

Completion criteria:

- Vitest passes
- same command log produces identical state and event log

### Milestone 1: Gray-Box RTS Loop

Goal: prove basic play.

Includes:

- Phaser world view
- camera
- selection
- building placement
- farm construction
- citizen assignment
- food and wood production
- battalion creation
- battalion movement
- basic attack

Completion criteria:

- player can place farm, gather resources, create battalion, move, and attack

### Milestone 2: Heir Learning Prototype

Goal: prove teaching is fun.

Includes:

- one heir
- observation of player commands
- doctrine creation
- reward
- punishment
- heir autonomous action
- explanation panel

Completion criteria:

- heir changes behavior based on player teaching
- player can inspect why

### Milestone 3: Faith and Religion Prototype

Goal: prove civilization pressure loop.

Includes:

- devotion
- faith generation
- external religious pressure
- captive rebellion pressure
- Bless Harvest
- Divine Judgment

Completion criteria:

- faith rises and falls based on civilization health
- miracles affect strategic pressures

### Milestone 4: Two-Settlement Victory Slice

Goal: prove conquest loop.

Includes:

- two settlements
- castle capture
- heir death
- collapse phase
- roads and caravans
- garrisoned outpost or wall

Completion criteria:

- player can conquer settlement and see doctrine loss consequences

### Milestone 5: Replay and Save

Goal: prove persistence.

Includes:

- save/load
- replay playback
- event inspection
- Book of Lessons skeleton

Completion criteria:

- saved game reloads exactly
- replay reproduces final state

### Milestone 6: Multiplayer Foundation

Goal: prove network-compatible architecture.

Includes:

- command protocol
- local authoritative server
- client command submission
- state snapshot sync

Completion criteria:

- two local clients can submit commands to one simulation authority

---

## 26. Interface Specification Summary

This section lists initial interfaces that should exist early in implementation.

```ts
interface Simulation {
  getState(): WorldState;
  enqueueCommand(command: GameCommand): void;
  tick(): SimulationTickResult;
  runTicks(count: number): SimulationTickResult[];
}

interface SimulationTickResult {
  tick: number;
  events: GameEvent[];
  stateHash: string;
}

interface RandomSource {
  nextFloat(): number;
  nextInt(minInclusive: number, maxInclusive: number): number;
  getState(): RandomState;
  setState(state: RandomState): void;
}

interface SystemContext {
  state: WorldState;
  config: SimulationConfig;
  random: RandomSource;
  events: EventWriter;
}

interface SimulationSystem {
  readonly id: string;
  update(context: SystemContext): void;
}

interface DoctrineEngine {
  scoreActions(input: DecisionInput): ScoredAction[];
  explainDecision(input: DecisionInput, chosen: ScoredAction): DecisionExplanation;
}

interface LearningEngine {
  observe(record: LessonRecord): DoctrineUpdate[];
  applyReward(target: DoctrineTarget, intensity: number): DoctrineUpdate[];
  applyPunishment(target: DoctrineTarget, intensity: number): DoctrineUpdate[];
}
```

---

## 27. Immediate Implementation Tasks

The first coding task should create:

1. `package.json`
2. `tsconfig.json`
3. `vite.config.ts`
4. `vitest.config.ts`
5. `src/simulation/Simulation.ts`
6. `src/simulation/random/SeededRandom.ts`
7. `src/simulation/state/WorldState.ts`
8. `src/simulation/commands/GameCommand.ts`
9. `src/simulation/events/GameEvent.ts`
10. `src/tests/simulation/determinism.test.ts`

No renderer is required for the first test. The first proof is deterministic state evolution.

---

## 28. Versioning Rules

Document versions:

- `1.0`: frozen design and initial architecture
- `1.x`: compatible refinements
- `2.0`: breaking design or architecture change

Save versions:

- include schema version
- include game version
- include content version

Simulation versions:

- must change when tick order, formulas, or deterministic behavior changes

---

## 29. Open Implementation Notes

The following are not design questions; they are implementation details to resolve during coding:

- exact state hash algorithm
- exact seeded RNG algorithm
- exact map tile size
- exact Phaser camera defaults
- exact JSON schema validation library
- exact multiplayer transport library

These decisions should be made conservatively during implementation and documented in `docs/Changelog.md`.

---

## 30. Final Readiness Statement

The frozen design is ready to enter production.

The next action is to scaffold the TypeScript/Vite/Phaser repository and implement Milestone 0: the deterministic simulation kernel.

The Last Lesson should not add new core mechanics before Milestone 2 proves whether teaching AI is fun.

---

## 31. Implemented Amendment 1.1

The following compatible systems are now implemented in the prototype and are the current reference behavior:

- Two empires begin with one castle each; every non-castle structure is deployed from the building console.
- Capturing a castle kills its incumbent heir, transfers the settlement and civic structures, creates a replacement governor, and awards victory when the defeated empire owns no settlement.
- Terrain is explicit data. Farms require fertile ground, lumber mills require forest, mines require iron veins, and movement/combat use terrain modifiers.
- Completed farms, mills, and mines cap food, wood, and iron production from assigned labor. Construction costs are deducted from global resources.
- Roads grant a movement multiplier and supply nearby friendly battalions. Unsupplied battalions lose supply and eventually morale.
- Heirs in governance mode score food, recruitment, and defensive responses using pressure plus doctrine confidence. Each choice records action, rationale, utility, and a rewardable conviction.
- Faith is generated from citizen happiness, loyalty, devotion, internal faith, military morale, and military devotion. Rival castles generate external religious pressure, which feeds rebellion pressure for captive-heavy settlements.
- Bless Harvest and Inspire Army are deterministic faith-spending miracles.
- Save files are versioned JSON. They preserve world state, pending commands, command history, event history, and event sequence so loaded games retain deterministic event IDs.
- Battalions are specialized as militia, spears, archers, or raiders. Military Quarters gate specialist training; doctrine-relevant counterplay, range, supply, and attack cadence all resolve inside the deterministic combat loop.
- Defeated battalions can create captives when the victor has hovel capacity. Hovel destruction liberates its excess population, rebellion produces escapes, and Town Squares assimilate captives into the citizen population.
- Land caravans are Town Square-built physical supply units. They load local food, benefit from roads, replenish nearby battalions, and can be raided to destroy cargo and sever a settlement's transport capacity.
- Caravans also carry battalions within explicit capacity. Embarked troops move with the transport and retain combat capability; the player can disembark them, while a destroyed caravan forcibly ejects passengers with a morale and supply shock.
- The Book of Lessons is the player-facing explainability surface: it exposes current heir convictions and recent world events, and provides local save/load using the versioned save format.
- Population is now an active local simulation. Every five-second world tick consumes food from citizens and captives, Villas extend citizen capacity beyond a Castle's starting capacity, sustained food surplus creates citizens through tracked growth progress, and shortages cause starvation, morale damage, health loss, and a documented event.
- Castles, walls, gates, and outposts are garrisonable defensive works. Garrisoned battalions fire from the structure, release on a move order, and are destroyed when the structure is breached. Garrison orders are observable military lessons.
- Governing heirs now identify and expose the settlement's most urgent concern (scarcity, captive unrest, enemy proximity, or insufficient faith). Their deterministic utility decisions can prioritize farm labor, raise a battalion, engage nearby enemies, garrison defense works, assimilate captives, or spend faith to inspire a failing field force. Each autonomous action creates a transparent decision and doctrine record.
- Town Squares can now launch Warships into the nearest water zone. Warships carry food and battalions like a transport, are restricted to water movement, and suppress embarked battalion attacks; the naval combat layer will extend from this deterministic transport contract.
- Warships now issue explicit naval attack orders against hostile vessels. Their fire resolves with a deterministic two-tick cooldown, emits inspectable combat events, sinks cargo on destruction, and continues to enforce that embarked battalions cannot attack from ships.
- The renderer presents an explicit match-resolution panel whenever simulation victory resolves. It distinguishes ascent and defeat, explains the state in-world, and can recreate the deterministic opening campaign without altering the simulation contract.
- Rival heirs use the same deterministic governance utility model as player-governed settlements. The initial rival receives an eight-tick opening grace period, then recruits a second field battalion and records a doctrine-backed expedition toward the nearest opposing throne. This opening behavior is deterministic, inspectable, and deliberately delayed so the player has time to establish their first economy.
- Visibility is resolved from completed friendly structures, field battalions, and caravans. The tactical renderer and minimap suppress unseen hostile entities, while governing heirs filter threats and enemy thrones through the same visibility calculation. When its rival is not yet observed, the initial rival heir scouts a fixed contested frontier rather than using omniscient targeting.
- The tactical uplink includes a presentation-only Imperial Mandate derived from authoritative state: establish a completed farm, raise a Crown battalion, observe a rival building, then capture the rival throne. It adds no simulation mutation and therefore cannot affect saves, replays, or deterministic outcomes.
- Tactical audio is a presentation-only `AudioDirector` using optional browser Web Audio oscillators. Command buttons and confirmed combat impacts trigger throttled cues after browser gesture rules permit playback; audio failures are ignored and cannot affect the simulation.
- The reference campaign starts with three settlements: the player capital and two Rival Crown settlements. Each rival settlement has its own governing heir, local population, castle, and pressures. Victory resolution remains empire-scoped, so both rival castles must be captured before the player wins.
- A Crown-owned Castle is the interaction anchor for its governor. Selecting it focuses the Heir console and Book of Lessons on that settlement; reward and punishment commands resolve against the selected Crown heir, never an opposing leader.
- The same selected Crown Castle establishes the active command seat for player-issued settlement actions. Placement, labor assignment, unit and transport production, captive assimilation, local Faith miracles, HUD population data, and building counts must read and write that settlement rather than assuming the opening capital.
- The renderer provides a compact Realm roster that enumerates player-owned settlements from the authoritative Empire state. Selecting an entry centers the camera on its Castle and establishes the same active command seat as clicking that Castle; it is a renderer-only navigation layer and does not mutate deterministic simulation state.
- The renderer consumes doctrine-observed, doctrine-reinforced, and doctrine-disciplined events to display a transient Lesson banner with the heir, preferred action, and confidence. The banner de-duplicates by event ID and remains presentation-only, preserving deterministic saves and replays.
- Captive policy exposes a deterministic player choice: `assimilate-captives` requires a completed Town Square and converts captives into citizens, while `release-captives` removes captives immediately and increases happiness, loyalty, devotion, and internal Faith. Both commands create explainable social doctrines through the shared learning pipeline.
- The Tactical Uplink derives a compact threat forecast from authoritative active-settlement state. Food shortage, captive rebellion, external religious pressure, and observed hostile proximity are evaluated in that order. This forecast is presentation-only and cannot alter simulation state.
- The renderer may schedule the fixed deterministic world tick at selectable 1x, 2x, or 3x presentation speed. Speed is never stored in the authoritative world state and must not alter tick order, command semantics, event order, save format, state hashing, or replay outcomes.
- Campaign difficulty is authoritative world state, represented by a named Rival Doctrine profile. A profile may set the Rival Crown's opening grace interval and doctrine-confidence gain only. It must never grant direct resource, combat, health, visibility, or map-state bonuses. Saves and replays inherit the profile through `WorldState`.

Implementation remains deliberately gray-box. Art, audio, campaign content, advanced diplomacy, transport vehicles, full captive gameplay, and multiplayer authority are planned production milestones rather than implied completed features.
