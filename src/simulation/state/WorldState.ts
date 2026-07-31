import type {
  BattalionId,
  BuildingId,
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

export interface Position {
  readonly x: number;
  readonly y: number;
}

export interface EmpireState {
  readonly id: EmpireId;
  readonly name: string;
  readonly resources: ResourceBundle;
  readonly settlementIds: SettlementId[];
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
  readonly happiness: number;
  readonly loyalty: number;
  readonly devotion: number;
  readonly health: number;
}

export interface SettlementState {
  readonly id: SettlementId;
  readonly ownerEmpireId: EmpireId;
  readonly heirId: HeirId;
  readonly centralBuildingId: BuildingId;
  readonly buildingIds: BuildingId[];
  readonly battalionIds: BattalionId[];
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
  | "road";

export interface BuildingState {
  readonly id: BuildingId;
  readonly ownerEmpireId: EmpireId;
  readonly settlementId: SettlementId;
  readonly kind: BuildingKind;
  readonly position: Position;
  readonly defense: number;
  readonly complete: boolean;
  readonly remainingBuildTicks: number;
}

export interface BattalionState {
  readonly id: BattalionId;
  readonly ownerEmpireId: EmpireId;
  readonly settlementId: SettlementId;
  readonly position: Position;
  readonly destination?: Position;
  readonly targetId?: BattalionId | BuildingId;
  readonly size: number;
  readonly attack: number;
  readonly defense: number;
  readonly maxDefense: number;
  readonly range: number;
  readonly speed: number;
  readonly morale: number;
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
  readonly doctrineIds: DoctrineId[];
}

export interface WorldState {
  readonly tick: number;
  readonly seed: number;
  readonly empires: Record<EmpireId, EmpireState>;
  readonly settlements: Record<SettlementId, SettlementState>;
  readonly buildings: Record<BuildingId, BuildingState>;
  readonly battalions: Record<BattalionId, BattalionState>;
  readonly heirs: Record<HeirId, HeirState>;
  readonly doctrines: Record<DoctrineId, DoctrineRule>;
}

export function createInitialWorld(seed: number): WorldState {
  return {
    tick: 0,
    seed,
    empires: {
      "empire-player": {
        id: "empire-player",
        name: "The Crown",
        resources: { food: 20, wood: 40, iron: 0, luxury: 0, faith: 0 },
        settlementIds: ["settlement-capital"]
      }
    },
    settlements: {
      "settlement-capital": {
        id: "settlement-capital",
        ownerEmpireId: "empire-player",
        heirId: "heir-prime",
        centralBuildingId: "building-castle",
        buildingIds: ["building-castle", "building-town-square"],
        battalionIds: [],
        population: {
          citizens: 24,
          captives: 0,
          militarizedCitizens: 0,
          farmers: 0,
          builders: 0,
          lumberjacks: 0,
          happiness: 70,
          loyalty: 80,
          devotion: 65,
          health: 90
        },
        localFood: 30,
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
      "building-town-square": {
        id: "building-town-square",
        ownerEmpireId: "empire-player",
        settlementId: "settlement-capital",
        kind: "town-square",
        position: { x: 520, y: 360 },
        defense: 150,
        complete: true,
        remainingBuildTicks: 0
      }
    },
    battalions: {},
    heirs: {
      "heir-prime": {
        id: "heir-prime",
        ownerEmpireId: "empire-player",
        name: "Prime Heir",
        mode: "learning",
        alive: true,
        doctrineIds: []
      }
    },
    doctrines: {}
  };
}
