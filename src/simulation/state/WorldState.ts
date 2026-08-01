import type {
  BattalionId,
  BuildingId,
  CaravanId,
  DoctrineId,
  EmpireId,
  HeirId,
  SettlementId
} from "./Ids";

export interface ResourceBundle {
  readonly food: number;
  readonly wood: number;
  readonly iron: number;
  readonly luxury: number;
  readonly faith: number;
}

export interface ResourceCost {
  readonly wood: number;
  readonly iron: number;
}

export interface Position {
  readonly x: number;
  readonly y: number;
}

export type TerrainKind =
  | "grassland"
  | "fertile"
  | "forest"
  | "iron-vein"
  | "luxury-grove"
  | "hills"
  | "water"
  | "marsh";

export interface TerrainZone {
  readonly id: string;
  readonly kind: TerrainKind;
  readonly label: string;
  readonly bounds: Position & { readonly width: number; readonly height: number };
}

export interface EmpireState {
  readonly id: EmpireId;
  readonly name: string;
  readonly resources: ResourceBundle;
  readonly settlementIds: SettlementId[];
}

export interface VictoryState {
  readonly winnerEmpireId?: EmpireId;
  readonly completedAtTick?: number;
}

export interface SettlementPressures {
  readonly food: number;
  readonly supply: number;
  readonly faith: number;
  readonly construction: number;
  readonly expansion: number;
  readonly military: number;
  readonly rebellion: number;
  readonly loyalty: number;
  readonly devotion: number;
  readonly religion: number;
  readonly housing: number;
  readonly defense: number;
}

export interface CitizenPopulation {
  readonly citizens: number;
  readonly captives: number;
  readonly militarizedCitizens: number;
  readonly farmers: number;
  readonly builders: number;
  readonly lumberjacks: number;
  readonly miners: number;
  readonly happiness: number;
  readonly loyalty: number;
  readonly devotion: number;
  readonly health: number;
  readonly growthProgress: number;
}

export interface SettlementState {
  readonly id: SettlementId;
  readonly ownerEmpireId: EmpireId;
  readonly heirId: HeirId;
  readonly centralBuildingId: BuildingId;
  readonly buildingIds: BuildingId[];
  readonly battalionIds: BattalionId[];
  readonly caravanIds: CaravanId[];
  readonly population: CitizenPopulation;
  readonly localFood: number;
  readonly internalFaith: number;
  readonly externalReligiousPressure: number;
  readonly pressures: SettlementPressures;
}

export type BuildingKind =
  | "castle"
  | "military-quarters"
  | "town-square"
  | "farm"
  | "villa"
  | "hovel"
  | "road"
  | "mine"
  | "lumber-mill"
  | "wall"
  | "gate"
  | "outpost";

export interface BuildingState {
  readonly id: BuildingId;
  readonly ownerEmpireId: EmpireId;
  readonly settlementId: SettlementId;
  readonly kind: BuildingKind;
  readonly position: Position;
  readonly defense: number;
  readonly complete: boolean;
  readonly remainingBuildTicks: number;
  readonly garrisonBattalionIds?: BattalionId[];
}

export type BattalionSpecialization = "militia" | "spears" | "archers" | "raiders";

export type CaravanKind = "caravan" | "ship";

export interface CaravanState {
  readonly id: CaravanId;
  readonly ownerEmpireId: EmpireId;
  readonly settlementId: SettlementId;
  readonly kind: CaravanKind;
  readonly position: Position;
  readonly destination?: Position;
  readonly targetId?: CaravanId;
  readonly attackCooldownRemaining?: number;
  readonly cargoFood: number;
  readonly capacity: number;
  readonly passengerBattalionIds: BattalionId[];
  readonly defense: number;
  readonly maxDefense: number;
  readonly speed: number;
}

export interface BattalionState {
  readonly id: BattalionId;
  readonly ownerEmpireId: EmpireId;
  readonly settlementId: SettlementId;
  readonly position: Position;
  readonly destination?: Position;
  readonly targetId?: BattalionId | BuildingId | CaravanId;
  readonly embarkedInCaravanId?: CaravanId;
  readonly garrisonedInBuildingId?: BuildingId;
  readonly specialization: BattalionSpecialization;
  readonly size: number;
  readonly attack: number;
  readonly defense: number;
  readonly maxDefense: number;
  readonly range: number;
  readonly speed: number;
  readonly attackCooldownTicks: number;
  readonly attackCooldownRemaining: number;
  readonly morale: number;
  readonly devotion: number;
  readonly supply: number;
}

export interface DoctrineRule {
  readonly id: DoctrineId;
  readonly ownerId: HeirId | BattalionId | EmpireId;
  readonly domain: "military" | "economy" | "faith" | "religion" | "society";
  readonly condition: string;
  readonly preferredAction: string;
  readonly goal: string;
  readonly confidence: number;
  readonly createdAtTick: number;
  readonly updatedAtTick: number;
}

export interface HeirState {
  readonly id: HeirId;
  readonly ownerEmpireId: EmpireId;
  readonly name: string;
  readonly mode: "learning" | "governance";
  readonly alive: boolean;
  readonly trust: number;
  readonly lastDoctrineId?: DoctrineId;
  readonly lastDecision?: HeirDecision;
  readonly concern?: HeirConcern;
  readonly doctrineIds: DoctrineId[];
}

export interface HeirDecision {
  readonly tick: number;
  readonly action: string;
  readonly rationale: string;
  readonly utility: number;
}

export interface HeirConcern {
  readonly category: "starvation" | "rebellion" | "military" | "faith";
  readonly message: string;
  readonly severity: number;
  readonly raisedAtTick: number;
}

export interface WorldState {
  readonly tick: number;
  readonly seed: number;
  readonly victory: VictoryState;
  readonly terrainZones: TerrainZone[];
  readonly empires: Record<EmpireId, EmpireState>;
  readonly settlements: Record<SettlementId, SettlementState>;
  readonly buildings: Record<BuildingId, BuildingState>;
  readonly battalions: Record<BattalionId, BattalionState>;
  readonly caravans: Record<CaravanId, CaravanState>;
  readonly heirs: Record<HeirId, HeirState>;
  readonly doctrines: Record<DoctrineId, DoctrineRule>;
}

export function createInitialWorld(seed: number): WorldState {
  return {
    tick: 0,
    seed,
    victory: {},
    terrainZones: [
      {
        id: "central-grassland",
        kind: "grassland",
        label: "GRASSLAND",
        bounds: { x: 320, y: 200, width: 260, height: 190 }
      },
      {
        id: "fertile-fields",
        kind: "fertile",
        label: "FERTILE FIELDS",
        bounds: { x: 80, y: 110, width: 230, height: 155 }
      },
      {
        id: "northern-hills",
        kind: "hills",
        label: "HILLS",
        bounds: { x: 700, y: 90, width: 210, height: 185 }
      },
      {
        id: "iron-vein",
        kind: "iron-vein",
        label: "IRON VEIN",
        bounds: { x: 1030, y: 110, width: 245, height: 175 }
      },
      {
        id: "western-forest",
        kind: "forest",
        label: "FOREST",
        bounds: { x: 90, y: 570, width: 270, height: 205 }
      },
      {
        id: "river",
        kind: "water",
        label: "RIVER",
        bounds: { x: 550, y: 470, width: 360, height: 125 }
      },
      {
        id: "luxury-grove",
        kind: "luxury-grove",
        label: "LUXURY GROVE",
        bounds: { x: 1035, y: 615, width: 240, height: 155 }
      },
      {
        id: "southern-marsh",
        kind: "marsh",
        label: "MARSH",
        bounds: { x: 635, y: 690, width: 240, height: 145 }
      }
    ],
    empires: {
      "empire-player": {
        id: "empire-player",
        name: "The Crown",
        resources: { food: 20, wood: 40, iron: 0, luxury: 0, faith: 0 },
        settlementIds: ["settlement-capital"]
      },
      "empire-rival": {
        id: "empire-rival",
        name: "The Rival Crown",
        resources: { food: 20, wood: 40, iron: 0, luxury: 0, faith: 0 },
        settlementIds: ["settlement-rival"]
      }
    },
    settlements: {
      "settlement-capital": {
        id: "settlement-capital",
        ownerEmpireId: "empire-player",
        heirId: "heir-prime",
        centralBuildingId: "building-castle",
        buildingIds: ["building-castle"],
        battalionIds: [],
        caravanIds: [],
        population: {
          citizens: 24,
          captives: 0,
          militarizedCitizens: 0,
          farmers: 0,
          builders: 0,
          lumberjacks: 0,
          miners: 0,
          happiness: 70,
          loyalty: 80,
          devotion: 65,
          health: 90,
          growthProgress: 0
        },
        localFood: 60,
        internalFaith: 50,
        externalReligiousPressure: 0,
        pressures: {
          food: 20,
          supply: 0,
          faith: 20,
          construction: 10,
          expansion: 0,
          military: 10,
          rebellion: 0,
          loyalty: 10,
          devotion: 20,
          religion: 10,
          housing: 0,
          defense: 20
        }
      },
      "settlement-rival": {
        id: "settlement-rival",
        ownerEmpireId: "empire-rival",
        heirId: "heir-rival",
        centralBuildingId: "building-rival-castle",
        buildingIds: ["building-rival-castle"],
        battalionIds: ["battalion-rival-1"],
        caravanIds: [],
        population: {
          citizens: 24,
          captives: 0,
          militarizedCitizens: 8,
          farmers: 6,
          builders: 4,
          lumberjacks: 4,
          miners: 0,
          happiness: 65,
          loyalty: 75,
          devotion: 55,
          health: 90,
          growthProgress: 0
        },
        localFood: 60,
        internalFaith: 45,
        externalReligiousPressure: 0,
        pressures: {
          food: 20,
          supply: 0,
          faith: 25,
          construction: 10,
          expansion: 0,
          military: 20,
          rebellion: 0,
          loyalty: 15,
          devotion: 25,
          religion: 15,
          housing: 0,
          defense: 25
        }
      }
    },
    buildings: {
      "building-castle": {
        id: "building-castle",
        ownerEmpireId: "empire-player",
        settlementId: "settlement-capital",
        kind: "castle",
        position: { x: 420, y: 300 },
        defense: 500,
        complete: true,
        remainingBuildTicks: 0
      },
      "building-rival-castle": {
        id: "building-rival-castle",
        ownerEmpireId: "empire-rival",
        settlementId: "settlement-rival",
        kind: "castle",
        position: { x: 1120, y: 390 },
        defense: 500,
        complete: true,
        remainingBuildTicks: 0
      },
    },
    battalions: {
      "battalion-rival-1": {
        id: "battalion-rival-1",
        ownerEmpireId: "empire-rival",
        settlementId: "settlement-rival",
        position: { x: 1040, y: 420 },
        specialization: "spears",
        size: 8,
        attack: 11,
        defense: 80,
        maxDefense: 80,
        range: 42,
        speed: 40,
        attackCooldownTicks: 1,
        attackCooldownRemaining: 0,
        morale: 70,
        devotion: 55,
        supply: 100
      }
    },
    caravans: {},
    heirs: {
      "heir-prime": {
        id: "heir-prime",
        ownerEmpireId: "empire-player",
        name: "Prime Heir",
        mode: "learning",
        alive: true,
        trust: 50,
        doctrineIds: []
      },
      "heir-rival": {
        id: "heir-rival",
        ownerEmpireId: "empire-rival",
        name: "Rival Heir",
        mode: "governance",
        alive: true,
        trust: 50,
        doctrineIds: []
      }
    },
    doctrines: {}
  };
}

export function terrainAtPosition(state: WorldState, position: Position): TerrainKind {
  const zone = state.terrainZones.find(({ bounds }) =>
    position.x >= bounds.x &&
    position.x <= bounds.x + bounds.width &&
    position.y >= bounds.y &&
    position.y <= bounds.y + bounds.height
  );

  return zone?.kind ?? "grassland";
}

export function isPositionVisibleToEmpire(state: WorldState, empireId: string, position: Position): boolean {
  const isInRange = (observer: Position, range: number) =>
    Math.hypot(observer.x - position.x, observer.y - position.y) <= range;

  return (
    Object.values(state.buildings).some(
      (building) =>
        building.ownerEmpireId === empireId &&
        building.complete &&
        isInRange(building.position, building.kind === "castle" ? 280 : building.kind === "outpost" ? 220 : 130)
    ) ||
    Object.values(state.battalions).some(
      (battalion) =>
        battalion.ownerEmpireId === empireId &&
        !battalion.embarkedInCaravanId &&
        isInRange(battalion.position, 300)
    ) ||
    Object.values(state.caravans).some(
      (caravan) => caravan.ownerEmpireId === empireId && isInRange(caravan.position, caravan.kind === "ship" ? 260 : 180)
    )
  );
}

export function isBuildingTerrainCompatible(kind: BuildingKind, terrain: TerrainKind): boolean {
  if (kind === "farm") {
    return terrain === "fertile";
  }
  if (kind === "lumber-mill") {
    return terrain === "forest";
  }
  if (kind === "mine") {
    return terrain === "iron-vein";
  }
  if (kind === "villa") {
    return terrain === "grassland" || terrain === "fertile" || terrain === "luxury-grove";
  }

  return terrain !== "water" && terrain !== "marsh" && terrain !== "forest" && terrain !== "iron-vein";
}

export function getBuildingCost(kind: BuildingKind): ResourceCost {
  switch (kind) {
    case "farm":
      return { wood: 8, iron: 0 };
    case "villa":
      return { wood: 8, iron: 0 };
    case "hovel":
      return { wood: 6, iron: 0 };
    case "town-square":
      return { wood: 10, iron: 0 };
    case "military-quarters":
      return { wood: 14, iron: 0 };
    case "mine":
    case "lumber-mill":
    case "outpost":
      return { wood: 10, iron: 0 };
    case "road":
      return { wood: 2, iron: 0 };
    case "wall":
      return { wood: 6, iron: 4 };
    case "gate":
      return { wood: 8, iron: 6 };
    case "castle":
      return { wood: 0, iron: 0 };
  }
}

export function terrainMovementMultiplier(terrain: TerrainKind): number {
  switch (terrain) {
    case "forest":
      return 0.72;
    case "hills":
      return 0.68;
    case "marsh":
      return 0.45;
    case "water":
      return 0;
    default:
      return 1;
  }
}

export function terrainDefenseMultiplier(terrain: TerrainKind): number {
  switch (terrain) {
    case "forest":
      return 1.12;
    case "hills":
      return 1.22;
    case "marsh":
      return 0.9;
    default:
      return 1;
  }
}
