# The Last Lesson

## Technical Design Specification

**Version:** 1.2
**Status:** Active Implementation Blueprint
**Date:** 2026-08-02
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

### 3.3 Command Input Contract

The scene exposes the same command state through pointer controls and keyboard controls. Keyboard input is presentation-only: it may select a UI panel or targeting mode, but it never writes directly to simulation state. The player commits simulation changes only through the existing command path.

| Input | Presentation result |
| --- | --- |
| `B`, `H`, `R`, `L` | Toggle Build, Heir, Realm, and Book panels. Realm and Book remain mutually exclusive. |
| `M`, `A` | Enter movement or attack targeting mode. |
| `F` | Enter advance mode. Selected battalions receive deterministic attack-move orders that retain a final destination while engaging visible nearby enemies. |
| `X` | Toggle locally persisted high-contrast presentation. This is renderer-only and may never affect simulation, save, replay, or multiplayer authority. |
| `Ctrl`/`Cmd` + `1` through `9` | Bind the selected Crown battalions to a presentation-only control group; press the number to select its surviving members, or press it twice to center the camera on them. |
| `Space` | Toggle the local presentation clock when the player is the authority. |
| `Esc` | Cancel placement first; otherwise close panels; otherwise clear selection. |

Shortcuts are ignored during campaign setup and while a text input, select, or textarea has focus. This protects multiplayer-lobby entry and prevents browser form input from triggering game actions.

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

The simulation is command-driven and the network transport is now implemented as an adapter over the same authority boundary. Future networking work must extend the existing host contract rather than introduce a parallel simulation.

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

### 7.2 Authored Campaign Openings

`WorldState.scenarioId` selects an authored opening profile before the match begins. Scenarios are authoritative save/replay data, not a renderer-only preset. The initial content set is:

- `crownfall`: balanced economic opening and the default for legacy saves.
- `rivergate`: completed Town Square, additional civic resources, and an enlarged southern waterway that foregrounds supply and naval transport while keeping a viable land approach to the Crown.
- `ashen-oath`: captive population, an initial hovel, lower internal Faith, a blighted marsh belt, and a rival road corridor that amplifies religious pressure.
- `stonewall`: completed walls and a gate, food reserves, construction labor, and a hill-fort ridge that foreground defensive geometry, garrisons, logistics, retreat, and counter-siege play.

Scenario content may alter opening state, structures, resources, pressures, and ordered terrain zones, but must not change the fixed tick order or introduce non-deterministic rules. Terrain-zone IDs, bounds, labels, and order are authoritative scenario data. The renderer must redraw its terrain layer whenever it replaces the active world from a campaign start, saved reign, or authority snapshot. The campaign theatre selects a scenario first, then a Rival Doctrine difficulty profile.

When an authored opening defines a non-zero starting labor allocation, the presentation layer must enqueue that allocation unchanged at the first simulation tick. Openings without authored labor use the standard Crown allocation. This preserves scenario identity without placing UI-specific behavior in the simulation.

The Tactical Uplink's Imperial Mandate is presentation-only and scenario-aware. It leads Rivergate toward an initial supply wagon, Ashen Oath through plague recovery and captive policy, and Stonewall toward raising then garrisoning a defensive battalion before continuing through the standard reconnaissance, Heir-feedback, and throne-capture progression. Each active step also derives an action-level directive using the actual visible command surface (for example, Build > Farm or Heir > Reward/Punish), so onboarding never depends on hidden tutorial state or a second input path.

### 7.3 Scout Hounds

Scout hounds use the battalion transport, selection, movement, and combat contract while remaining a distinct non-population specialization. A Town Square can train a fixed pack of four hounds for 8 food and 4 wood. Hounds are fast, lightly defended, low damage, cannot garrison, never contribute captives when destroyed, and provide a 440-unit visibility radius instead of the normal 300-unit field-battalion radius.

This keeps the initial Dog unit focused on reconnaissance without adding individual-unit AI or a second movement system.

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

Military service consumes citizens. Whenever a player or governor creates a citizen battalion, `militarizedCitizens` increases and the simulation deterministically reconciles civilian assignments so their total never exceeds `citizens - militarizedCitizens`. It releases workers in this order: builders, luxury workers, miners, lumberjacks, then farmers. Starvation, sickness, and civilian housing losses apply the same reconciliation after reducing population. This makes recruitment an explicit economic commitment and prevents labor output from persisting after the people who performed it have entered service or died.

Governors must retain a minimum workforce on completed farms before they can recruit an additional battalion. This is a normal utility constraint rather than a resource bonus: rival and Crown governors obey it equally. Governor-created battalion identifiers include the governing settlement ID, tick, and local ordinal so concurrent settlements can never overwrite one another's field forces.

Player-commanded building, battalion, caravan, and Warship creation begins with the established `kind-tick-localOrdinal` identity shape for replay compatibility. When that base ID is already occupied because two settlements received same-tick commands, the latter creation receives a deterministic settlement-scoped suffix. Entity identity is therefore collision-proof without introducing random IDs or changing the common single-settlement replay path.

Citizens require Villas. Captives require Hovels. Insufficient housing should be prevented by construction rules and UI warnings. If caused by destruction, overflow population enters emergency state and becomes vulnerable to death, escape, or rebellion.

When an enemy destroys a completed Villa, its settlement immediately loses two citizens per Villa, up to the remaining civilian population, and suffers health, happiness, and loyalty damage. The `housing-destroyed` event records the loss. Hovel destruction remains distinct: it liberates captive residents through the existing capacity and escape rules.

Critically weakened settlements can suffer a localized outbreak. An outbreak begins only when health is `35` or lower, food pressure is at least `30`, and at least twelve people live in the settlement. It lasts three world ticks, reducing citizens, health, happiness, and loyalty. This is deterministic pressure, not a hidden random roll, and start, spread, and end events make every stage inspectable.

### 9.3 Captive Rules

Captives:

- may work
- cannot be military units
- may become citizens through assimilation
- increase rebellion pressure when ratio is high
- live in Hovels
- may be recaptured or freed when their housing or transport is destroyed
- can contribute to a settlement defection only when wider religious, loyalty, and security failures are also present

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

Luxury Groves are developed with Plantations. Each active luxury worker produces one global Luxury per world tick, up to eight workers per completed Plantation. Luxury production improves local happiness and devotion, then indirectly strengthens Faith generation; it does not act as an unexplained direct stat upgrade.

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

### 11.1a Battalion Experience

Battalions retain `0-100` experience. Successful attacks grant one experience, while defeating an enemy battalion grants twelve. Rank is derived rather than separately stored: Militia (`0-9`), Regular (`10-29`), Veteran (`30-59`), Elite (`60-89`), and Legendary (`90-100`). Rank does not inflate attack or defense. Combat also creates derived battlefield traits: six forest, hills, or marsh engagements grant the respective terrain trait and reduce that terrain's movement penalty; six attacks against structures grant Siege Specialists, which receive a bounded `18%` siege-only damage increase. A defeated enemy battalion gives its supplied victor an `+8` morale and `+2` devotion surge, gives supplied friendly battalions from the victor's settlement `+2` morale, and shocks surviving defenders from the defeated settlement by `-4` morale. A force at zero supply cannot gain victory morale, so logistics remains decisive. Every third world tick, a supplied battalion also recovers one morale when its home settlement is peaceful, has sufficient Villas, is happy and loyal, and has stronger internal than external Faith. The `battle-morale-shifted`, `battalion-trained`, and `morale-recovered` events make every change inspectable.

### 11.2 Garrison and Siege

Walls and outposts may garrison units. When units are inside a valid garrison, the structure's defense substitutes for the unit's defense until the structure falls.

When the structure reaches zero defense, garrisoned units die unless a specific future content rule creates an evacuation effect. The initial implementation should use the simple rule: zero structure defense destroys the garrison.

Moats are non-garrison defensive works. Completed enemy moats halve battalion and land-caravan movement while an enemy crosses their 62-unit perimeter. This creates a deterministic approach penalty without requiring a bespoke siege pathfinding system. Movement events expose the applied moat multiplier.

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

### 15.4a Moral Memory

Each empire records factual captive actions: captives taken, integrated, and released. This is not a good/evil meter. The unresolved captivity burden is derived as `max(0, floor((taken - integrated - released * 2) / 4))` and contributes directly to rebellion pressure. Releasing and integrating people are therefore strategic acts with a persistent social consequence. `moral-memory-changed` events expose the exact record after every action.

### 15.5 Settlement Defection

Defection is a rare territorial failure, not another damage mechanic. A settlement defects only when all of the following are true on a world tick:

- rebellion pressure is at least `85`
- external religious pressure is at least `30`
- citizen loyalty is at most `30`
- the settlement has no local friendly battalion

The settlement transfers to the nearest rival empire with a throne. Its buildings change ownership and a successor governor is created for the receiving empire. The displaced governor remains alive: heirs die only when their own central Castle falls to military capture. Defection removes the former empire's local battalions and uses the normal empire-scoped victory resolution if the source empire loses its final settlement. The event log records the pressure-driven cause, successor, and displaced governor.

---

## 16. Miracles

Miracles consume Faith. They should change decisions, not replace them.

Initial miracles:

1. Bless Harvest: spend 12 Faith to replenish a settlement's local food and reinforce its civic devotion.
2. Inspire Army: spend 16 Faith to restore a selected friendly battalion's morale and devotion.
3. Mend Settlement: spend 14 Faith to restore 30 civic health, end an active plague, and strengthen local loyalty, devotion, and internal Faith. It cannot create population or restore destroyed infrastructure.
4. Divine Judgment: spend 18 Faith to establish a temporary religious ward against external pressure.

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

All live multiplayer paths must continue to use command logs and deterministic simulation. No browser-only action may mutate `WorldState` outside an authoritative command.

### 20.4 Local Authority Foundation

`networking/LocalAuthority.ts` is the transport-free host implementation used by local co-op and networking tests.

```ts
interface LocalAuthority {
  connect(connection: LocalClientConnection): AuthoritySnapshot;
  disconnect(clientId: PlayerId): void;
  prepareOpeningLabor(settlementId?: string): void;
  submit(clientId: PlayerId, intent: CommandIntent): GameCommand;
  advance(): AuthoritySnapshot;
  getSnapshot(): AuthoritySnapshot;
}
```

The authority owns tick assignment and command IDs. A connected client submits an intent only; the host schedules it for the next deterministic tick, advances the sole simulation instance, and returns an immutable snapshot containing world state, state hash, event-log hash, recent events, and connected clients. A client must not mutate simulation state or choose its own timestamp. A network-created room also queues the canonical opening labor order before the first tick; a player command at that tick is sorted after the default and therefore deliberately takes precedence.

This is intentionally an in-process boundary. WebSocket transport, authentication, matchmaking, and anti-cheat remain production networking work; they must adapt this contract rather than duplicate simulation logic.

### 20.5 WebSocket Transport

`server/MultiplayerServer.ts` is the first production transport adapter. It hosts named rooms through `ws`, instantiates each room with `LocalAuthority`, and advances the authority at the canonical five-second interval. It never owns a second copy of the simulation.

The serialized contract in `networking/protocol.ts` is intentionally small:

```ts
type ClientMessage =
  | { type: "join-match"; roomId: string; clientId: string; empireId: string; setup?: MatchSetup; reconnectToken?: string }
  | { type: "submit-intent"; intent: CommandIntent }
  | { type: "request-snapshot" };

type ServerMessage =
  | { type: "joined-match"; roomId: string; clientId: string; reconnectToken: string; snapshot: AuthoritySnapshot }
  | { type: "command-accepted"; command: GameCommand }
  | { type: "snapshot"; snapshot: AuthoritySnapshot }
  | { type: "protocol-error"; message: string };
```

The host validates the outer protocol, verifies that an intent controls only the submitter's empire-owned settlements, heirs, battalions, buildings, and transports, allocates the next authoritative command ID and tick through `LocalAuthority.submit`, broadcasts immutable snapshots after a room tick, and deletes an empty room after a bounded 120-second idle grace period. Empty rooms stop ticking but retain their sole authority snapshot, so a returning client can join the same room and resume its exact reign before expiry. On first join the host issues an opaque random reconnect token. Rejoining a known Crown identity requires that token, and a successful token-authenticated join safely replaces a stale socket without allowing its later close event to disconnect the recovered Crown. The identity is permanently bound to its original empire for the room lifetime, so a token cannot change command authority. The browser stores the token only under its host-room-Crown key; it is a local recovery credential, not an account system. The room also enforces a bounded per-Crown command budget before authority scheduling. Both mechanisms are transport behavior and never affect deterministic `WorldState`, ticks, command IDs, saves, or replay content. Raw client payloads never receive direct access to `WorldState`, command IDs, or tick assignment. `generate-faith` is a deterministic fixture command and is never legal over the connected-player boundary. `RemoteAuthorityClient.ts` is a presentation-facing browser adapter that exposes message and connection-state listeners, join, intent, disconnect, and resynchronization primitives without owning simulation state. `app/MultiplayerLobby.ts` owns only DOM connection fields; `MilestoneOneScene` swaps to host-owned snapshots on join, forwards its existing command intents, and disables local pause and speed simulation while connected. If the socket closes unexpectedly, the scene remains bound to the last host snapshot and freezes the interface until the player deliberately uses `REJOIN`; it must never advance that state locally.

Socket-level tests must cover join, server-timed command acceptance, snapshot delivery, malformed input rejection, opening-labor precedence, cross-empire authorization, reconnect-token recovery, stale-socket replacement, and command/room/seat capacity. Authentication, public matchmaking, persistence, and broader anti-cheat are deliberate follow-up delivery work rather than hidden assumptions of this transport layer.

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

Balance tests:

- one deterministic, representative Crown opening per authored theatre
- no rejected standard-opening commands
- a surviving Crown economy and throne at the rival pressure point
- scenario-specific outcomes for Rivergate logistics, Ashen Oath recovery, and Stonewall garrisoning
- a stable report for the same scenario, seed, difficulty, and tick count

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

### Milestone 0: Simulation Kernel — Complete

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

### Milestone 1: Gray-Box RTS Loop — Complete and Expanded

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

### Milestone 2: Heir Learning Prototype — Complete and Expanded

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

### Milestone 3: Faith and Religion Prototype — Complete and Expanded

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

### Milestone 4: Multi-Settlement Victory Slice — Complete and Expanded

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

### Milestone 5: Replay and Save — Complete

Goal: prove persistence.

Includes:

- save/load
- replay playback
- event inspection
- Book of Lessons skeleton

Completion criteria:

- saved game reloads exactly
- replay reproduces final state

### Milestone 6: Authoritative Multiplayer — Playable Local-Network Co-op

Goal: prove network-compatible architecture.

Implemented:

- serialized command protocol
- local authoritative server and named WebSocket rooms
- browser lobby, client intent submission, and host-owned snapshot sync
- empire ownership validation for all player intents
- connection-loss freeze and a 120-second room-resume window

Acceptance criteria:

- two local clients can submit commands to one simulation authority
- a returning client receives the retained authoritative snapshot before room expiry

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

## 27. Current Implementation Baseline

The project is a TypeScript, Vite, Phaser, Vitest, and `ws` application. Its first production boundary is complete:

1. `Simulation` owns deterministic ticks, state, command scheduling, events, and hashes.
2. `LocalAuthority` owns connected-player identity, host-assigned command identity/ticks, command ownership validation, opening-world setup, and immutable snapshots.
3. `MultiplayerServer` adapts named WebSocket rooms to `LocalAuthority`; it contains no game rules.
4. `RemoteAuthorityClient` owns a browser WebSocket only. It has no simulation state and exposes message/connection listeners.
5. `MilestoneOneScene` owns renderer and command UI. It forwards intents to an authority in remote play and freezes on a lost authority connection.
6. The deterministic suite and production TypeScript/Vite build are required quality gates.

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

## 29. Remaining Delivery Work

The frozen gameplay architecture is implemented as a robust vertical slice. Remaining release work is product delivery rather than a new core-system design:

- broader human balance playtests across the four authored Campaign Theatre openings, alongside the deterministic standard-opening balance suite;
- remaining environment-art expansion and broader presentation-asset coverage;
- onboarding and broader content tuning;
- account identity, public matchmaking, persistence, and broader anti-cheat for internet multiplayer;
- telemetry, accessibility audit, localization, storefront submission, and separate public hosting for the authoritative multiplayer service.

Each addition must preserve deterministic command replay and the simulation/presentation separation documented above.

---

## 30. Current Readiness Statement

The Last Lesson is in active vertical-slice production. Its frozen architecture, deterministic simulation, teaching loop, authored scenarios, save/replay path, and playable local-network co-op have been implemented and verified. The browser entry point now also exposes a named, focusable application canvas, a screen-reader-only control briefing, deliberate-command announcements, reduced-motion support, and a locally persisted high-contrast presentation mode without coupling assistive presentation to simulation events. The static release exposes a scoped install manifest and service worker: navigations are refreshed from the network when available, while the installed shell and same-origin game assets use cache-first offline retrieval. Service-worker state is presentation delivery only and must never participate in simulation, save, replay, or multiplayer authority. New work should prioritize player onboarding, content depth, balance, and release delivery over unbounded new mechanics.

---

## 31. Implemented Amendment 1.1

The following compatible systems are now implemented in the prototype and are the current reference behavior:

- Two empires begin with one castle each; every non-castle structure is deployed from the building console.
- Rival starting settlements include terrain-valid farms on authored, labeled fertile fields. This is starting-world content, not a hidden economy bonus: their governing heirs still assign labor, raise forces, and make visible doctrine-driven decisions under the same simulation rules.
- Capturing a castle kills its incumbent heir, transfers the settlement and civic structures, creates a replacement governor, and awards victory when the defeated empire owns no settlement.
- Terrain is explicit data. Farms require fertile ground, lumber mills require forest, mines require iron veins, and movement/combat use terrain modifiers.
- Each authored Campaign Theatre owns a distinct authoritative terrain variation: Crownfall is the baseline field, Rivergate expands the navigable southern waterway, Ashen Oath extends and blights its marsh approach, and Stonewall overlays a defensive hill-fort ridge. These map changes are part of `WorldState`, save files, replay origins, snapshots, and deterministic balance tests rather than presentation-only theatre decoration.
- Completed farms, mills, and mines cap food, wood, and iron production from assigned labor. Construction costs are deducted from global resources.
- Roads grant a movement multiplier and supply nearby friendly battalions. Unsupplied battalions lose supply and eventually morale.
- The construction palette projects current Crown wood and iron into an affordability state, and its placement preview reports the precise invalid condition: battlefield boundary, terrain incompatibility, missing resources, foundation overlap, or structure clearance. Each palette tile also has hover-only guidance for its terrain requirement and civic or tactical role. These are renderer-side preflight and explanation surfaces only; the simulation remains the authority that validates every queued construction command.
- Heirs in governance mode score food, recruitment, and defensive responses using pressure plus doctrine confidence. Each choice records action, rationale, utility, and a rewardable conviction.
- Faith is generated from citizen happiness, loyalty, devotion, internal faith, military morale, and military devotion. Rival castles generate external religious pressure, which feeds rebellion pressure for captive-heavy settlements.
- Bless Harvest and Inspire Army are deterministic faith-spending miracles.
- Save files are versioned JSON. They preserve world state, pending commands, command history, event history, and event sequence so loaded games retain deterministic event IDs.
- Battalions are specialized as militia, spears, archers, or raiders. Military Quarters gate specialist training; doctrine-relevant counterplay, range, supply, and attack cadence all resolve inside the deterministic combat loop.
- Defeated battalions can create captives when the victor has hovel capacity. Hovel destruction liberates its excess population, rebellion produces escapes, and Town Squares assimilate captives into the citizen population.
- Land caravans are Town Square-built physical supply units. They load local food, benefit from roads, replenish nearby battalions, and can be raided to destroy cargo and sever a settlement's transport capacity.
- Caravans also carry battalions within explicit capacity. Embarked troops move with the transport and retain combat capability; the player can disembark them, while a destroyed caravan forcibly ejects passengers with a morale and supply shock.
- The Book of Lessons is the player-facing explainability surface: it exposes current heir convictions and recent world events, and provides local save/load using the versioned save format.
- The expanded Heir console presents a doctrine as a complete statement: its domain, observed condition, preferred action, intended purpose, and confidence are shown alongside the last autonomous utility decision. This is a read-only projection of authoritative doctrine data and must not mutate simulation state.
- Population is now an active local simulation. Every five-second world tick consumes food from citizens and captives, Villas extend citizen capacity beyond a Castle's starting capacity, sustained food surplus creates citizens through tracked growth progress, and shortages cause starvation, morale damage, health loss, and a documented event.
- Mobilization and civilian losses reconcile labor assignments against the remaining civilian workforce. Recruitment releases non-food jobs before farm labor, and governors keep their completed farms staffed before raising another battalion; this keeps the economic cost of military service explicit without letting unattended realms abandon food production.
- Runtime production resolves same-tick multi-settlement ID collisions with deterministic settlement-scoped suffixes. This applies to player-created buildings, battalions, caravans, and Warships while retaining existing identifiers whenever no collision exists, protecting replay and multiplayer references as campaigns scale.
- Castles, walls, gates, and outposts are garrisonable defensive works. Garrisoned battalions fire from the structure, release on a move order, and are destroyed when the structure is breached. Garrison orders are observable military lessons.
- Governing heirs now identify and expose the settlement's most urgent concern (scarcity, captive unrest, enemy proximity, or insufficient faith). Their deterministic utility decisions can prioritize farm labor, raise a battalion, engage nearby enemies, garrison defense works, assimilate captives, or spend faith to inspire a failing field force. Each autonomous action creates a transparent decision and doctrine record.
- Town Squares can now launch Warships into the nearest water zone. Warships carry food and battalions like a transport, are restricted to water movement, and suppress embarked battalion attacks; the naval combat layer will extend from this deterministic transport contract.
- Warships now issue explicit naval attack orders against hostile vessels. Their fire resolves with a deterministic two-tick cooldown, emits inspectable combat events, sinks cargo on destruction, and continues to enforce that embarked battalions cannot attack from ships.
- The renderer presents an explicit match-resolution panel whenever simulation victory resolves. It distinguishes ascent and defeat, explains the state in-world, and can recreate the deterministic opening campaign without altering the simulation contract.
- The match-resolution panel offers a presentation-only route back to Campaign Theatre selection. It pauses and clears the current scene's local selection state, re-renders the current Chronicle markers, and never alters the completed authoritative simulation or its replay record.
- The presentation layer maintains an optional local Campaign Chronicle keyed by scenario ID. It records a completed Crown victory once per active reign and projects that count into Campaign Theatre selection and the victory debrief. Chronicle state never enters `WorldState`, save files, replay artifacts, or multiplayer authority.
- `campaign/CampaignProgression.ts` derives a four-chapter recommended theatre route from the local Chronicle. Campaign Theatre keeps every scenario selectable, but selects and highlights the first unconquered chapter after a victory. This is presentation-only progression: it never changes scenario state, resources, AI, saves, replays, or multiplayer authority.
- `reports/ReignReport.ts` derives the campaign debrief from resolved world state and immutable event history. It may summarize duration, thrones captured, lessons taught, heir guidance, final Faith, and the factual Civic Record of captives taken, integrated, and released, but must never mutate simulation state or be serialized independently.
- `replay/ReplayRecord.ts` defines a versioned portable replay artifact containing an initial world, applied command log, and total tick count. Deserialize validation and playback must use the same deterministic simulation path as live play; presentation may later archive or export this artifact without changing its contents.
- The Book of Lessons may retain an opening-world snapshot beside local presentation persistence and offer a replay-integrity command. It must re-run the applied command log through `ReplayRecord`, compare state and event hashes, and report the result without touching authoritative state.
- The Book of Lessons may export a versioned portable `.tll` archive that contains both the current versioned save and its campaign opening world. Import validation must reject malformed archives before replacing presentation state; a valid archive restores the same deterministic reign and replay origin. The browser import picker has a stable nonvisual identifier for automated coverage, an accessible file label, and removes itself after either a selection or cancellation. Portable archives are unavailable while connected to multiplayer authority and must never alter the multiplayer protocol.
- The Book of Lessons may also enter replay-review mode. It snapshots the active live simulation with the existing versioned save format, replays its applied command log from the scenario opening in a separate simulation instance, prevents new commands and auto-saves during review, and restores the exact live save on return. Replay review must stop before advancing beyond the recorded target tick.
- Rival heirs use the same deterministic governance utility model as player-governed settlements. The initial rival receives an eight-tick opening grace period, then recruits a second field battalion and records a doctrine-backed expedition toward the nearest opposing throne. This opening behavior is deterministic, inspectable, and deliberately delayed so the player has time to establish their first economy.
- Visibility is resolved from completed friendly structures, field battalions, and caravans. The tactical renderer and minimap suppress unseen hostile entities, while governing heirs filter threats and enemy thrones through the same visibility calculation. When its rival is not yet observed, the initial rival heir scouts a fixed contested frontier rather than using omniscient targeting.
- `campaign/ImperialMandate.ts` derives a presentation-only, scenario-aware first-session path from authoritative state. It includes each theatre's defining civic or defensive opening, then farm establishment, a field battalion, reconnaissance, one reward-or-punishment Heir lesson, and rival-throne capture. Progress is projected as a compact count in the Tactical Uplink, adds no tutorial state, and therefore cannot affect world mutation, saves, replays, or deterministic outcomes.
- `campaign/MandateGuidance.ts` maps each derived Mandate step to its existing Build, Command, or Heir control. The renderer uses this contract for static visual emphasis and a compact dock cue; it never opens a panel, queues a command, modifies focus, or enters authoritative state. Where the player has a legitimate policy choice, such as captive assimilation versus release, both existing controls remain equally highlighted.
- Campaign Theatre is a distinct renderer phase rather than a tactical modal pasted over a live HUD. Before a reign begins, the world remains only as a subdued painterly backdrop and inactive tactical chrome is hidden. The canvas exposes the current presentation phase and matching accessible name, then restores the tactical shell immediately after a doctrine selection. This is presentation state only and cannot affect simulation, saves, replays, campaign progression, or multiplayer authority.
- The Tactical Uplink is a fixed five-line battlefield readout: current order/selection, people, labor, stability, and Faith. It intentionally excludes durable Civic Record history, which remains available in the Book of Lessons and end-of-reign report; this preserves vertical room for the state-derived Mandate, threat, and current intel beneath the live status.
- Tactical audio is a presentation-only `AudioDirector` using optional browser Web Audio oscillators. Command buttons and confirmed combat impacts trigger throttled cues after browser gesture rules permit playback; audio failures are ignored and cannot affect the simulation.
- The Book of Lessons exposes a persisted local reduced-motion preference. Until the player has explicitly chosen a local value, it defaults to the browser's `prefers-reduced-motion` setting. When enabled, it suppresses transient combat, miracle, and lesson-banner tweening while preserving the underlying labels, event log, command timing, state, saves, replays, and multiplayer authority.
- The reference campaign starts with three settlements: the player capital and two Rival Crown settlements. Each rival settlement has its own governing heir, local population, castle, and pressures. Victory resolution remains empire-scoped, so both rival castles must be captured before the player wins.
- A Crown-owned Castle is the interaction anchor for its governor. Selecting it focuses the Heir console and Book of Lessons on that settlement; reward and punishment commands resolve against the selected Crown heir, never an opposing leader.
- Ashen Oath begins with a bounded three-tick plague at the Crown settlement, 18 Faith, and a 14-Faith Mend Settlement option. Its first Mandate is therefore to cure the civic crisis before resolving captive policy; the scenario remains viable without the intervention, but loses civilian health and population as an explicit cost.
- The active Crown settlement's Mend Settlement action is available through the command dock and the canvas `C` shortcut. Command-dock controls claim their pointer interaction before the world-selection handler runs, preventing a command click from becoming an accidental map deselection.
- All player-facing management controls claim their pointer interaction before the battlefield selection handler runs. This includes building deployment choices, Crown-seat navigation, heir reward/punishment, and end-of-reign actions; UI controls must never have a hidden secondary map-selection effect.
- The tactical camera supports bounded cursor-anchored wheel zoom from strategic settlement scale to close battalion scale. Camera zoom remains presentation-only: it does not alter authoritative coordinates, selection, pathing, command payloads, saves, replays, or multiplayer simulation.
- The same selected Crown Castle establishes the active command seat for player-issued settlement actions. Placement, labor assignment, unit and transport production, captive assimilation, local Faith miracles, HUD population data, and building counts must read and write that settlement rather than assuming the opening capital.
- The renderer provides a compact Realm roster that enumerates player-owned settlements from the authoritative Empire state. Selecting an entry centers the camera on its Castle and establishes the same active command seat as clicking that Castle; it is a renderer-only navigation layer and does not mutate deterministic simulation state.
- The expanded Build palette owns the upper-right tactical surface. The minimap is placed beneath it only when the viewport can contain both panels without overlap; otherwise it is hidden for the duration of palette expansion. This is a presentation-layout rule only and must never affect world coordinates, selection, placement validation, command submission, saves, replays, or multiplayer authority.
- The renderer consumes doctrine-observed, doctrine-reinforced, and doctrine-disciplined events to display a transient Lesson banner with the heir, preferred action, and confidence. The banner de-duplicates by event ID and remains presentation-only, preserving deterministic saves and replays.
- The renderer translates immutable event-log records into a player-facing Chronicle for the Tactical Uplink and Book of Lessons. Narratives may resolve current display labels for settlements, heirs, and entities, but must never mutate event payloads, authoritative state, saves, replay records, or multiplayer snapshots. New event types require either a concise Chronicle narrative or a humanized fallback; opaque internal event identifiers must not become the default player-facing history.
- The Tactical Uplink selects from the current tick's event records by consequence before it announces a latest report. Victory, capture, miracles, civic crisis, heir concern and decision, doctrine feedback, and battlefield collapse outrank routine resource production; the Book of Lessons retains the complete chronological event history. This priority is presentation-only and must not reorder the authoritative log.
- The renderer slices optimized `public/assets/building-atlas-v1.webp` into a stable painterly presentation for every canonical building kind. Each art cell shares the existing building's world position, explicit label, selection rectangle, owner tint, and visibility rule. Atlas slicing and camera framing are presentation-only and must not mutate `WorldState`, affect command processing, or enter saves and replays.
- The renderer slices optimized `public/assets/unit-atlas-v1.webp` into formation markers for every `BattalionSpecialization` and the Warship transport. The art shares each entity's existing world coordinate, interactive container, visibility rule, ownership tint, selection marker, and readable tactical label. A supply wagon retains its compact logistics marker. Unit atlas rendering is presentation-only and must not mutate `WorldState`, affect command processing, or enter saves and replays.
- Campaign Theatre slices optimized `public/assets/campaign-theatres-v1.webp` into four fixed scenario vignettes: Crownfall, Rivergate, Ashen Oath, and Stonewall. The imagery sits beneath the existing Chapter, scenario, Chronicle, and Honor labels, while a shared layout contract maps its visual cards to the same presentation-only scenario selection input. Theatre art and layout must not modify scenario state, authority, saves, replays, campaign Chronicle persistence, or multiplayer behavior.
- Every Campaign Theatre profile includes concise terrain intelligence shown beside the selected scenario summary and included in keyboard/screen-reader selection announcements. It explains the authored strategic identity already present in the world: Crownfall's fertile expansion ground, Rivergate's navigable supply route, Ashen Oath's blighted marsh and civic crisis, and Stonewall's ridge-and-gate defense. The copy is content only; it does not change scenario state or balance.
- `rendering/combatPresentation.ts` selects specialization-aware, presentation-only combat feedback from immutable combat events. Archers use an arrow flight, spear formations show a thrust, close formations show an impact strike, and Warships use a cannonball delivery with a distinct cue. The renderer may retain a destroyed target's last rendered position only long enough to show its final resolved impact; no visual position, effect, or sound may modify authoritative state, saves, replays, or multiplayer authority.
- `rendering/orderPresentation.ts` projects active movement, advance, naval, and attack intent for selected Crown forces from their authoritative current orders. Routes and arrowheads are renderer-only and target reticles appear only for already visible rival entities, so the overlay improves command clarity without disclosing fogged movement, changing command state, or entering saves, replays, and multiplayer authority.
- `rendering/terrainPresentation.ts` assigns each authoritative terrain kind a fixed label, symbol, palette, geometric texture signature, and exact player-facing tactical caption. The map uses those signatures for furrows, canopy, ore veins, blooms, contours, water ripples, and marsh reeds so terrain remains readable through pattern as well as color; captions expose movement, defense, placement, and naval restrictions without requiring trial and error. These presentation values are regression-tested against the authoritative terrain multipliers and never alter terrain classification, movement, combat, placement, saves, replay data, or multiplayer authority.
- `pnpm optimize:assets` converts the repository-held painterly PNG source art under `art/source/` into runtime WebP assets and a 1200x630 social preview. The release build always runs this step before TypeScript and Vite, so optimized assets remain reproducible rather than becoming opaque hand-edited binary outputs.
- Vite emits Phaser as a stable engine chunk apart from application code. This preserves the same deterministic browser runtime while allowing cache-aware browsers and the installed service worker to reuse the engine across campaign-only release updates.
- Campaign Honors are deterministic evaluations of the completed victorious world but persist only in browser-local campaign presentation data. Crownfall checks for a Regular or better Crown battalion, Rivergate for a surviving Crown Warship, Ashen Oath for eight resolved captives, and Stonewall for an intact opening gate. They may appear in campaign UI and the debrief but must never mutate world state, grant a stat bonus, enter saves/replays, or cross the multiplayer authority boundary.
- `pnpm package:storefront` builds the same verified single-player campaign with `VITE_BASE_PATH=./` and produces `release/the-last-lesson-web.zip`, an HTML5 upload artifact whose `index.html` is at archive root. This delivery transform changes only asset URL resolution and must not change simulation, saves, replay data, or multiplayer behavior.
- `pnpm verify:storefront` inspects the generated archive without rebuilding it. It requires a root `index.html`, relative PWA scope, service worker, manifest, icons, optimized battlefield and Campaign Theatre art, the split Phaser/application chunks, and every local `index.html` reference. The main GitHub verification workflow packages this archive after `pnpm check` and retains it as the bounded `the-last-lesson-storefront` release artifact.
- Every production build emits its service worker after Vite has finalized hashed assets. The worker derives a content-addressed cache name from the complete emitted artifact and precaches the shell, JS and CSS chunks, tactical art, icons, and manifest relative to its registered scope. Cache lookups ignore delivery-only `Vary` headers so a precached module remains usable after a static server changes request headers. Browser release coverage must prove that a controlled installed page reopens offline with a visible tactical canvas.
- `server/MultiplayerServer.ts` hosts the authoritative WebSocket transport behind the same Node HTTP listener that exposes `GET /health`. The health handler reports only operational room count and must never advance simulation, expose snapshots, or mutate authority state. The provided Docker image runs this exact host process; public deployment requires a WebSocket-capable provider, TLS, and a `wss://` endpoint for the static browser client.
- The main GitHub verification workflow builds the Docker image after `pnpm check`. This is an artifact-validity gate only: it does not publish an image, start a multiplayer room, or alter browser delivery.
- The release gate includes browser smoke coverage against the production bundle. Playwright must verify the named application canvas, install manifest, active service worker, loaded WebP tactical art, a nonblank desktop and phone-sized canvas, a successful Crownfall start announcement at both viewport classes, and no uncaught page errors. The campaign theatre uses one fixed-overlay input surface, which converts local card regions into scenario, doctrine, and local-save actions and suppresses the corresponding world-selection release. This coverage observes presentation only and cannot inject simulation state.
- Campaign Theatre exposes a renderer-local keyboard focus model for its scenario cards, rival-doctrine starts, and optional local-save continuation. Every chapter card carries a compact terrain tag for immediate scanning, while the selected summary and accessible focus text expose the full terrain lesson. Arrow keys choose the closest aligned control, `Tab` cycles focus, and `Enter` or `Space` activates it. The focused action has a visible outline and a screen-reader announcement. This input model may recreate the overlay but must not add tutorial data, mutate the current world, affect command timing, or enter saves, replay records, or multiplayer authority.
- Combat feedback renders existing authoritative strike events as a short projectile, expanding target impact pulse, and damage number. It may use only event payload and current entity positions, must never queue a command or mutate world state, and must remain disposable presentation rather than replay data.
- Command dock and Build palette controls expose a hover-only guidance card with their visible label and cost, target, terrain, or tactical detail. The card sizes to its content, stays within the tactical viewport, is renderer-local, does not consume input from the command itself, and must never add command state, save data, replay data, or multiplayer protocol fields.
- The renderer consumes `miracle-cast` events to show a brief named invocation and expanding halo at the affected battalion or settlement Castle. The effect derives its target solely from event payload and current snapshot position, never changes simulation state, and must never enter save, replay, or multiplayer data.
- Tactical Web Audio may be disabled through a locally persisted header control. The preference gates only `AudioDirector` playback and must not alter command submission, tick timing, event emission, save data, replay data, or multiplayer protocol.
- Scenario-health regression coverage must run every authored opening for a bounded unattended opening window. It verifies the Crown settlement, throne, population, health, food floor, unresolved victory state, and deterministic state/event hashes, catching accidental early-game collapse caused by future content or balance changes. A second 180-tick economic-opening pass verifies the campaign clock: the Crown must still be viable and uncaptured while a rival expedition has issued a throne attack and caused measurable throne damage.
- `campaign/CampaignBalance.ts` provides the complementary representative-opening balance suite. It schedules deterministic Civic and Hold Fast Crown plans for every Campaign Theatre and reports key civic, military, pressure, and objective signals at tick 180. `pnpm balance:report` prints the current tuning ledger, while `pnpm balance:soak` runs both plans across four deterministic seeds, every Campaign Theatre, and all three transparent Rival Doctrine profiles. Hold Fast recruits a larger militia immediately and therefore validates the intended early-security versus civilian-labor tradeoff. Matching Vitest coverage treats an unhealthy report, command rejection, missing enemy pressure, missing scenario lesson, or an inverted Disciple/Rival/Architect pressure order as a regression; the soak supplements rather than replaces human balance playtests.
- `pnpm check` is the canonical release-quality command and must run the entire deterministic suite before producing the browser bundle. The main GitHub workflow runs that same command on pull requests and main pushes, then retains the verified `dist` bundle as a bounded delivery artifact. A dedicated GitHub Pages workflow independently runs the same release gate, rebuilds with `VITE_BASE_PATH=/The_Last_Lesson/`, and deploys that static artifact through `configure-pages`, `upload-pages-artifact`, and `deploy-pages`. The repository must enable GitHub Pages with GitHub Actions as its publishing source. This publishes the complete single-player build while leaving the authoritative WebSocket host as a separate deployment concern.
- Captive policy exposes a deterministic player choice: `assimilate-captives` requires a completed Town Square and converts captives into citizens, while `release-captives` removes captives immediately and increases happiness, loyalty, devotion, and internal Faith. Both commands create explainable social doctrines through the shared learning pipeline.
- The Tactical Uplink derives a compact threat forecast from authoritative active-settlement state. Food shortage, captive rebellion, external religious pressure, and observed hostile proximity are evaluated in that order. Before any hostile contact, it may project the public Rival Doctrine opening-grace countdown selected for the reign. This forecast is presentation-only and cannot alter simulation state or reveal fogged entity positions.
- The renderer may schedule the fixed deterministic world tick at selectable 1x, 2x, or 3x presentation speed. Speed is never stored in the authoritative world state and must not alter tick order, command semantics, event order, save format, state hashing, or replay outcomes.
- A local, active reign pauses when the browser document becomes hidden and remains paused until the player resumes it. This is a presentation-clock safeguard only: it does not enqueue a command, change deterministic state, or apply to host-owned multiplayer time.
- Campaign difficulty is authoritative world state, represented by a named Rival Doctrine profile. A profile may set the Rival Crown's opening grace interval and doctrine-confidence gain only. It must never grant direct resource, combat, health, visibility, or map-state bonuses. Saves and replays inherit the profile through `WorldState`.
- The renderer may write a local recovery save at a fixed interval after a completed world tick. Auto-save storage errors must be ignored, and auto-save must not enqueue commands, write simulation state, or change event history. On a subsequent page load, a valid recovery save may be offered as a continuation entry point.
- Narrow presentation mode applies below 640 CSS pixels. It must preserve campaign selection, simulation controls, active-seat controls, building access, and command issuance; nonessential Tactical Uplink and minimap chrome may be suppressed when their simultaneous display would obscure actionable UI. Responsive presentation remains renderer-only.
- External religious pressure originates with enemy castles and may be amplified by completed, same-empire road corridors that follow the route between opposing thrones. Enemy caravans add a capped local influence near a settlement. Each contribution is deterministic, bounded, included in the existing rebellion and faith formulas, and emitted as an explainable source-level religious-pressure event.
- `divine-judgment` is a player-directed Faith miracle that spends 18 Faith to establish a three-tick, decaying religious ward at an owned settlement. The ward reduces only effective external religious pressure, remains fully visible in source-level pressure events, and never changes rival units, resources, or map visibility.
- Enemy outposts project a bounded local religious pressure, making a defended frontier a real ideological threat instead of an empty vision structure. Pressure events separately expose castle, road, caravan, and outpost contributions. Only battalions assigned to a settlement reduce that settlement's rebellion pressure; distant armies cannot stabilize a different domain.
- Faith generation applies the same local-domain rule. `faith-produced` events expose citizen Faith, locally assigned military Faith, internal-religion contribution, and external-pressure penalty so the UI and Book of Lessons never have to infer an opaque total.
- Multiplayer rooms are hosted through the same `LocalAuthority` used in deterministic tests. Browser clients submit untimestamped intents, receive immutable authoritative snapshots, and cannot command another empire's assets or mint fixture-only Faith.
- An in-game `MULTI` lobby starts local-network co-op, while the renderer freezes at the latest valid snapshot after connection loss. The host retains an empty room for two minutes so a returning player can rejoin its exact authority state while the host remains online.
- The browser persists a validated local Crown identity and retains the last successful connection request only while a remote reign is active. After a socket loss, `REJOIN` reconnects directly to that named room using the same identity; local campaign transitions and deliberate disconnection clear the request. This is convenience identity only, not an account, reconnect token, or authorization credential.
- Each hosted room applies a deterministic-host-adjacent transport budget of 48 submitted intents per connected Crown identity in a rolling five-second window. The budget is enforced before authority submission, is retained while an idle room awaits rejoin, and reports a protocol error without advancing the simulation. It is transport protection only: rate timing and counters never enter `WorldState`, saves, replays, command ordering, or state hashes.

Implementation intentionally keeps tactical identifiers explicit while presentation matures. Painterly terrain, responsive command UI, optional tactical audio, authored campaign theatres, full captive gameplay, transport vehicles, and authoritative multiplayer are implemented. Advanced diplomacy, account-backed internet matchmaking, and a complete bespoke art/content package remain production-delivery work rather than implied completed features.
