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

export type RivalDifficulty = "disciple" | "rival" | "architect";

export type ScenarioId = "crownfall" | "rivergate" | "ashen-oath" | "stonewall";

export interface ScenarioProfile {
  readonly label: string;
  readonly summary: string;
  /** Compact tactical identity used by Campaign Theatre cards. */
  readonly terrainTag: string;
  /** Short Campaign Theatre intelligence, not a simulation modifier. */
  readonly terrainIntel: string;
  /** First actionable priority shown before the player begins this Theatre. */
  readonly openingDirective: string;
}

export const SCENARIO_PROFILES: Record<ScenarioId, ScenarioProfile> = {
  crownfall: {
    label: "CROWNFALL",
    summary: "Balanced opening. Establish the Crown and break both rival thrones.",
    terrainTag: "FERTILE HEARTLAND",
    terrainIntel: "FERTILE HEARTLAND // EXPANSION",
    openingDirective: "Establish food, then train the first Crown battalion."
  },
  rivergate: {
    label: "RIVERGATE",
    summary: "A prepared civic port. Turn supply routes and warships into an advantage.",
    terrainTag: "NAVIGABLE RIVER",
    terrainIntel: "NAVIGABLE RIVER // SUPPLY & WARSHIPS",
    openingDirective: "Commission a supply wagon and secure the river route."
  },
  "ashen-oath": {
    label: "ASHEN OATH",
    summary: "A plague-struck captive settlement tests mercy, recovery, prisoner accords, and religious legitimacy.",
    terrainTag: "BLIGHTED MARSH",
    terrainIntel: "BLIGHTED MARSH // PLAGUE & ACCORD",
    openingDirective: "Mend Crownkeep, then choose the captive policy or Prisoner Accord."
  },
  stonewall: {
    label: "STONEWALL",
    summary: "A fortified frontier. Hold the gate, protect supply, then break the siege.",
    terrainTag: "HILL-FORT RIDGE",
    terrainIntel: "HILL-FORT RIDGE // GATE DEFENSE",
    openingDirective: "Raise a battalion and garrison the opening gate."
  }
};

export interface RivalDifficultyProfile {
  readonly label: string;
  /** Player-facing rival temperament. Presentation only; never a simulation modifier. */
  readonly briefing: string;
  readonly openingGraceTicks: number;
  readonly doctrineConfidenceGain: number;
}

export const RIVAL_DIFFICULTY_PROFILES: Record<RivalDifficulty, RivalDifficultyProfile> = {
  disciple: {
    label: "DISCIPLE",
    briefing: "Measured opening. The rival learns slowly from each exchange.",
    openingGraceTicks: 11,
    doctrineConfidenceGain: 1
  },
  rival: {
    label: "RIVAL",
    briefing: "Balanced pressure. The rival adapts at the standard campaign pace.",
    openingGraceTicks: 8,
    doctrineConfidenceGain: 3
  },
  architect: {
    label: "ARCHITECT",
    briefing: "Relentless opening. The rival prepares early and learns quickly.",
    openingGraceTicks: 5,
    doctrineConfidenceGain: 6
  }
};

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
  readonly moralMemory?: MoralMemory;
}

export interface MoralMemory {
  readonly captivesTaken: number;
  readonly captivesIntegrated: number;
  readonly captivesReleased: number;
  /** Optional so prior save files retain a compatible Civic Record. */
  readonly captivesExchanged?: number;
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
  readonly luxuryWorkers: number;
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
  readonly religiousWardTicks: number;
  readonly plagueTicks?: number;
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
  | "plantation"
  | "moat"
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

export type BattalionSpecialization = "militia" | "spears" | "archers" | "raiders" | "hounds";

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
  /** The final march point retained while an attack-move engages nearby enemies. */
  readonly attackMoveDestination?: Position;
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
  readonly experience?: number;
  readonly battlefieldTraining?: BattlefieldTraining;
}

export interface BattlefieldTraining {
  readonly forest?: number;
  readonly hills?: number;
  readonly marsh?: number;
  readonly siege?: number;
}

export type BattalionTrait = "Forest Veterans" | "Hill Fighters" | "Marsh Runners" | "Siege Specialists";

export function getBattalionTraits(training: BattlefieldTraining | undefined): BattalionTrait[] {
  const traits: BattalionTrait[] = [];
  if ((training?.forest ?? 0) >= 6) traits.push("Forest Veterans");
  if ((training?.hills ?? 0) >= 6) traits.push("Hill Fighters");
  if ((training?.marsh ?? 0) >= 6) traits.push("Marsh Runners");
  if ((training?.siege ?? 0) >= 6) traits.push("Siege Specialists");
  return traits;
}

export type BattalionRank = "Militia" | "Regular" | "Veteran" | "Elite" | "Legendary";

export function getBattalionRank(experience = 0): BattalionRank {
  if (experience >= 90) return "Legendary";
  if (experience >= 60) return "Elite";
  if (experience >= 30) return "Veteran";
  if (experience >= 10) return "Regular";
  return "Militia";
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
  readonly scenarioId: ScenarioId;
  readonly rivalDifficulty: RivalDifficulty;
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

export function createInitialWorld(
  seed: number,
  rivalDifficulty: RivalDifficulty = "rival",
  scenarioId: ScenarioId = "crownfall"
): WorldState {
  return applyScenario(
    {
    tick: 0,
    seed,
    scenarioId,
    rivalDifficulty,
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
        id: "rival-fields",
        kind: "fertile",
        label: "RIVAL FIELDS",
        bounds: { x: 930, y: 245, width: 180, height: 125 }
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
        id: "grove-fields",
        kind: "fertile",
        label: "GROVE FIELDS",
        bounds: { x: 890, y: 645, width: 125, height: 120 }
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
        settlementIds: ["settlement-capital"],
        moralMemory: { captivesTaken: 0, captivesIntegrated: 0, captivesReleased: 0, captivesExchanged: 0 }
      },
      "empire-rival": {
        id: "empire-rival",
        name: "The Rival Crown",
        resources: { food: 20, wood: 40, iron: 0, luxury: 0, faith: 0 },
        settlementIds: ["settlement-rival", "settlement-rival-grove"],
        moralMemory: { captivesTaken: 0, captivesIntegrated: 0, captivesReleased: 0, captivesExchanged: 0 }
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
          luxuryWorkers: 0,
          happiness: 70,
          loyalty: 80,
          devotion: 65,
          health: 90,
          growthProgress: 0
        },
        localFood: 60,
        internalFaith: 50,
        externalReligiousPressure: 0,
        religiousWardTicks: 0,
        plagueTicks: 0,
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
        buildingIds: ["building-rival-castle", "building-rival-farm"],
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
          luxuryWorkers: 0,
          happiness: 65,
          loyalty: 75,
          devotion: 55,
          health: 90,
          growthProgress: 0
        },
        localFood: 60,
        internalFaith: 45,
        externalReligiousPressure: 0,
        religiousWardTicks: 0,
        plagueTicks: 0,
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
      },
      "settlement-rival-grove": {
        id: "settlement-rival-grove",
        ownerEmpireId: "empire-rival",
        heirId: "heir-rival-grove",
        centralBuildingId: "building-rival-grove-castle",
        buildingIds: ["building-rival-grove-castle", "building-rival-grove-farm"],
        battalionIds: [],
        caravanIds: [],
        population: {
          citizens: 20,
          captives: 0,
          militarizedCitizens: 0,
          farmers: 6,
          builders: 2,
          lumberjacks: 4,
          miners: 0,
          luxuryWorkers: 0,
          happiness: 62,
          loyalty: 72,
          devotion: 50,
          health: 88,
          growthProgress: 0
        },
        localFood: 54,
        internalFaith: 42,
        externalReligiousPressure: 0,
        religiousWardTicks: 0,
        plagueTicks: 0,
        pressures: {
          food: 24,
          supply: 0,
          faith: 28,
          construction: 14,
          expansion: 5,
          military: 16,
          rebellion: 0,
          loyalty: 18,
          devotion: 28,
          religion: 18,
          housing: 0,
          defense: 28
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
      "building-rival-farm": {
        id: "building-rival-farm",
        ownerEmpireId: "empire-rival",
        settlementId: "settlement-rival",
        kind: "farm",
        position: { x: 980, y: 300 },
        defense: 40,
        complete: true,
        remainingBuildTicks: 0
      },
      "building-rival-grove-castle": {
        id: "building-rival-grove-castle",
        ownerEmpireId: "empire-rival",
        settlementId: "settlement-rival-grove",
        kind: "castle",
        position: { x: 1160, y: 700 },
        defense: 500,
        complete: true,
        remainingBuildTicks: 0
      },
      "building-rival-grove-farm": {
        id: "building-rival-grove-farm",
        ownerEmpireId: "empire-rival",
        settlementId: "settlement-rival-grove",
        kind: "farm",
        position: { x: 940, y: 700 },
        defense: 40,
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
        supply: 100,
        experience: 0
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
      },
      "heir-rival-grove": {
        id: "heir-rival-grove",
        ownerEmpireId: "empire-rival",
        name: "Grove Heir",
        mode: "governance",
        alive: true,
        trust: 45,
        doctrineIds: []
      }
    },
    doctrines: {}
    },
    scenarioId
  );
}

function applyScenario(world: WorldState, scenarioId: ScenarioId): WorldState {
  if (scenarioId === "crownfall") {
    return world;
  }

  const playerEmpire = world.empires["empire-player"];
  const capital = world.settlements["settlement-capital"];
  if (scenarioId === "rivergate") {
    const townSquareId = "building-rivergate-town-square";
    return {
      ...world,
      terrainZones: world.terrainZones.map((zone) => {
        if (zone.id === "central-grassland") {
          return { ...zone, bounds: { ...zone.bounds, height: 170 } };
        }
        if (zone.id === "river") {
          return {
            ...zone,
            id: "rivergate-waterway",
            label: "RIVERGATE WATERWAY",
            // Keep the enemy land approach viable while making the southern waterway
            // large enough to be a meaningful naval and supply theatre.
            bounds: { x: 530, y: 470, width: 470, height: 145 }
          };
        }
        return zone;
      }),
      empires: {
        ...world.empires,
        "empire-player": {
          ...playerEmpire,
          resources: { ...playerEmpire.resources, wood: 56, iron: 4, faith: 8 }
        }
      },
      settlements: {
        ...world.settlements,
        "settlement-capital": {
          ...capital,
          buildingIds: [...capital.buildingIds, townSquareId],
          localFood: 48
        }
      },
      buildings: {
        ...world.buildings,
        [townSquareId]: {
          id: townSquareId,
          ownerEmpireId: "empire-player",
          settlementId: "settlement-capital",
          kind: "town-square",
          position: { x: 500, y: 400 },
          defense: 120,
          complete: true,
          remainingBuildTicks: 0
        }
      }
    };
  }

  if (scenarioId === "stonewall") {
    const wallIds = ["building-stonewall-wall-1", "building-stonewall-gate", "building-stonewall-wall-2"];
    return {
      ...world,
      terrainZones: [
        {
          id: "stonewall-ridge",
          kind: "hills",
          label: "STONEWALL RIDGE",
          bounds: { x: 300, y: 150, width: 280, height: 270 }
        },
        ...world.terrainZones
      ],
      empires: {
        ...world.empires,
        "empire-player": {
          ...playerEmpire,
          resources: { ...playerEmpire.resources, wood: 42, iron: 10, faith: 6 }
        }
      },
      settlements: {
        ...world.settlements,
        "settlement-capital": {
          ...capital,
          buildingIds: [...capital.buildingIds, ...wallIds],
          localFood: 72,
          population: { ...capital.population, builders: 2, farmers: 6 }
        }
      },
      buildings: {
        ...world.buildings,
        "building-stonewall-wall-1": { id: "building-stonewall-wall-1", ownerEmpireId: "empire-player", settlementId: "settlement-capital", kind: "wall", position: { x: 500, y: 260 }, defense: 200, complete: true, remainingBuildTicks: 0 },
        "building-stonewall-gate": { id: "building-stonewall-gate", ownerEmpireId: "empire-player", settlementId: "settlement-capital", kind: "gate", position: { x: 500, y: 320 }, defense: 150, complete: true, remainingBuildTicks: 0 },
        "building-stonewall-wall-2": { id: "building-stonewall-wall-2", ownerEmpireId: "empire-player", settlementId: "settlement-capital", kind: "wall", position: { x: 500, y: 380 }, defense: 200, complete: true, remainingBuildTicks: 0 }
      }
    };
  }

  const hovelId = "building-ashen-hovel";
  const villaId = "building-ashen-villa";
  const rivalHovelId = "building-ashen-rival-hovel";
  const rivalVillaId = "building-ashen-rival-villa";
  const rivalRoadIds = ["building-ashen-road-1", "building-ashen-road-2", "building-ashen-road-3"];
  return {
    ...world,
    terrainZones: world.terrainZones.map((zone) => {
      if (zone.id === "southern-marsh") {
        return {
          ...zone,
          id: "ashen-marsh",
          label: "ASHEN MARSH",
          bounds: { x: 250, y: 470, width: 420, height: 260 }
        };
      }
      if (zone.id === "luxury-grove") {
        return { ...zone, id: "blighted-grove", label: "BLIGHTED GROVE" };
      }
      return zone;
    }),
    empires: {
      ...world.empires,
      "empire-player": {
        ...playerEmpire,
        resources: { ...playerEmpire.resources, wood: 28, faith: 18 }
      }
    },
    settlements: {
      ...world.settlements,
      "settlement-capital": {
        ...capital,
        buildingIds: [...capital.buildingIds, hovelId, villaId],
        internalFaith: 34,
        plagueTicks: 3,
        population: {
          ...capital.population,
          captives: 12,
          happiness: 62,
          loyalty: 68,
          devotion: 54,
          health: 44
        }
      },
      "settlement-rival": {
        ...world.settlements["settlement-rival"],
        buildingIds: [
          ...world.settlements["settlement-rival"].buildingIds,
          ...rivalRoadIds,
          rivalHovelId,
          rivalVillaId
        ],
        population: {
          ...world.settlements["settlement-rival"].population,
          captives: 4
        }
      }
    },
    buildings: {
      ...world.buildings,
      [hovelId]: {
        id: hovelId,
        ownerEmpireId: "empire-player",
        settlementId: "settlement-capital",
        kind: "hovel",
        position: { x: 350, y: 330 },
        defense: 80,
        complete: true,
        remainingBuildTicks: 0
      },
      [villaId]: {
        id: villaId,
        ownerEmpireId: "empire-player",
        settlementId: "settlement-capital",
        kind: "villa",
        position: { x: 320, y: 240 },
        defense: 90,
        complete: true,
        remainingBuildTicks: 0
      },
      [rivalHovelId]: {
        id: rivalHovelId,
        ownerEmpireId: "empire-rival",
        settlementId: "settlement-rival",
        kind: "hovel",
        position: { x: 1210, y: 450 },
        defense: 70,
        complete: true,
        remainingBuildTicks: 0
      },
      [rivalVillaId]: {
        id: rivalVillaId,
        ownerEmpireId: "empire-rival",
        settlementId: "settlement-rival",
        kind: "villa",
        position: { x: 1210, y: 315 },
        defense: 90,
        complete: true,
        remainingBuildTicks: 0
      },
      "building-ashen-road-1": {
        id: "building-ashen-road-1",
        ownerEmpireId: "empire-rival",
        settlementId: "settlement-rival",
        kind: "road",
        position: { x: 950, y: 365 },
        defense: 40,
        complete: true,
        remainingBuildTicks: 0
      },
      "building-ashen-road-2": {
        id: "building-ashen-road-2",
        ownerEmpireId: "empire-rival",
        settlementId: "settlement-rival",
        kind: "road",
        position: { x: 760, y: 340 },
        defense: 40,
        complete: true,
        remainingBuildTicks: 0
      },
      "building-ashen-road-3": {
        id: "building-ashen-road-3",
        ownerEmpireId: "empire-rival",
        settlementId: "settlement-rival",
        kind: "road",
        position: { x: 570, y: 320 },
        defense: 40,
        complete: true,
        remainingBuildTicks: 0
      }
    }
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
        isInRange(battalion.position, battalion.specialization === "hounds" ? 440 : 300)
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
  if (kind === "plantation") {
    return terrain === "luxury-grove";
  }
  if (kind === "moat") {
    return terrain === "grassland" || terrain === "fertile" || terrain === "hills";
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
    case "plantation":
    case "outpost":
      return { wood: 10, iron: 0 };
    case "road":
      return { wood: 2, iron: 0 };
    case "moat":
      return { wood: 4, iron: 0 };
    case "wall":
      return { wood: 6, iron: 4 };
    case "gate":
      return { wood: 8, iron: 6 };
    case "castle":
      return { wood: 0, iron: 0 };
  }
}

export function getBuildingFootprint(kind: BuildingKind): number {
  switch (kind) {
    case "road":
      return 17;
    case "outpost":
    case "hovel":
      return 24;
    case "farm":
    case "villa":
    case "mine":
    case "lumber-mill":
    case "plantation":
    case "moat":
    case "wall":
    case "gate":
      return 28;
    case "town-square":
    case "military-quarters":
      return 32;
    case "castle":
      return 38;
  }
}

export function isBuildingPlacementClear(state: WorldState, kind: BuildingKind, position: Position): boolean {
  const footprint = getBuildingFootprint(kind);
  return !Object.values(state.buildings).some((building) =>
    Math.hypot(building.position.x - position.x, building.position.y - position.y) <
    footprint + getBuildingFootprint(building.kind)
  );
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
