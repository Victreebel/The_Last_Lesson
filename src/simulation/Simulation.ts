import { defaultSimulationConfig, type SimulationConfig } from "./SimulationConfig";
import type { GameCommand } from "./commands/GameCommand";
import { EventWriter } from "./events/EventWriter";
import type { GameEvent } from "./events/GameEvent";
import { stableHash } from "./hash/stableHash";
import { SeededRandom } from "./random/SeededRandom";
import {
  isBuildingTerrainCompatible,
  isBuildingPlacementClear,
  getBuildingCost,
  getBattalionTraits,
  isPositionVisibleToEmpire,
  RIVAL_DIFFICULTY_PROFILES,
  terrainAtPosition,
  terrainDefenseMultiplier,
  terrainMovementMultiplier,
  type BattalionSpecialization,
  type BattalionState,
  type BuildingState,
  type CaravanState,
  type DoctrineRule,
  type HeirState,
  type Position,
  type WorldState
} from "./state/WorldState";

interface DoctrineObservation {
  readonly domain: DoctrineRule["domain"];
  readonly key: string;
  readonly condition: string;
  readonly preferredAction: string;
  readonly goal: string;
}

export interface SimulationTickResult {
  readonly tick: number;
  readonly events: GameEvent[];
  readonly stateHash: string;
}

export interface SimulationHistory {
  readonly commandLog?: GameCommand[];
  readonly eventLog?: GameEvent[];
  readonly eventSequence?: number;
}

export class Simulation {
  private state: WorldState;
  private readonly config: SimulationConfig;
  private readonly random: SeededRandom;
  private readonly eventWriter: EventWriter;
  private readonly commandQueue: GameCommand[] = [];
  private readonly commandLog: GameCommand[] = [];
  private readonly eventLog: GameEvent[] = [];

  constructor(
    state: WorldState,
    config: SimulationConfig = defaultSimulationConfig,
    history: SimulationHistory = {}
  ) {
    this.state = state;
    this.config = config;
    this.random = new SeededRandom(state.seed);
    this.eventWriter = new EventWriter(history.eventSequence);
    this.commandLog.push(...(history.commandLog ?? []));
    this.eventLog.push(...(history.eventLog ?? []));
  }

  getState(): WorldState {
    return this.state;
  }

  getCommandLog(): GameCommand[] {
    return this.commandLog;
  }

  getPendingCommands(): GameCommand[] {
    return this.commandQueue;
  }

  getEventLog(): GameEvent[] {
    return this.eventLog;
  }

  getEventSequence(): number {
    return this.eventWriter.getSequence();
  }

  enqueueCommand(command: GameCommand): void {
    this.commandQueue.push(command);
    this.commandQueue.sort((a, b) => a.tick - b.tick || a.id.localeCompare(b.id));
  }

  tick(): SimulationTickResult {
    const nextTick = this.state.tick + 1;
    this.state = { ...this.state, tick: nextTick };

    if (!this.state.victory.winnerEmpireId) {
      this.applyCommandsForTick(nextTick);
      this.updateHeirGovernance(nextTick);
      this.updateEconomy(nextTick);
      this.updateConstruction(nextTick);
      this.updatePopulation(nextTick);
      this.updateSickness(nextTick);
      this.updateBattalionMovement(nextTick);
      this.updateCaravanMovement(nextTick);
      this.updateCaravanDeliveries(nextTick);
      this.updateBattalionSupply(nextTick);
      this.updateCombat(nextTick);
      this.updateShipCombat(nextTick);
      this.updateReligion(nextTick);
      this.updateCaptives(nextTick);
      this.updateSettlementDefections(nextTick);
      this.updateFaith(nextTick);
    }

    const events = this.eventWriter.flush();
    this.eventLog.push(...events);

    return {
      tick: nextTick,
      events,
      stateHash: stableHash(this.state)
    };
  }

  runTicks(count: number): SimulationTickResult[] {
    return Array.from({ length: count }, () => this.tick());
  }

  private applyCommandsForTick(tick: number): void {
    const readyCommands = this.commandQueue.filter((command) => command.tick === tick);
    this.removeCommands(readyCommands);

    for (const command of readyCommands) {
      this.commandLog.push(command);
      this.applyCommand(command, tick);
    }
  }

  private removeCommands(commands: GameCommand[]): void {
    const ids = new Set(commands.map((command) => command.id));
    for (let index = this.commandQueue.length - 1; index >= 0; index -= 1) {
      if (ids.has(this.commandQueue[index].id)) {
        this.commandQueue.splice(index, 1);
      }
    }
  }

  private applyCommand(command: GameCommand, tick: number): void {
    if (command.type === "assign-labor") {
      const settlement = this.state.settlements[command.payload.settlementId];
      if (!settlement) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }

      const assigned =
        command.payload.farmers +
        command.payload.builders +
        command.payload.lumberjacks +
        command.payload.miners +
        (command.payload.luxuryWorkers ?? 0);
      const available = settlement.population.citizens - settlement.population.militarizedCitizens;

      if (assigned > available) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }

      this.state = {
        ...this.state,
        settlements: {
          ...this.state.settlements,
          [settlement.id]: {
            ...settlement,
            population: {
              ...settlement.population,
              farmers: command.payload.farmers,
              builders: command.payload.builders,
              lumberjacks: command.payload.lumberjacks,
              miners: command.payload.miners,
              luxuryWorkers: command.payload.luxuryWorkers ?? 0
            }
          }
        }
      };
      this.eventWriter.emit(tick, "command-applied", { commandId: command.id });
      this.observePlayerCommand(command, tick);
      return;
    }

    if (command.type === "place-building") {
      const settlement = this.state.settlements[command.payload.settlementId];
      if (!settlement) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }

      const position = command.payload.position ?? { x: 620, y: 330 };
      const terrain = terrainAtPosition(this.state, position);
      const empire = this.state.empires[settlement.ownerEmpireId];
      const cost = getBuildingCost(command.payload.kind);
      if (
        !isBuildingTerrainCompatible(command.payload.kind, terrain) ||
        !isBuildingPlacementClear(this.state, command.payload.kind, position) ||
        empire.resources.wood < cost.wood ||
        empire.resources.iron < cost.iron
      ) {
        this.eventWriter.emit(tick, "command-rejected", {
          commandId: command.id,
          reason: !isBuildingPlacementClear(this.state, command.payload.kind, position) ? "occupied" : "invalid-placement"
        });
        return;
      }

      const buildingCount = settlement.buildingIds.length + 1;
      const buildingId = `building-${command.payload.kind}-${tick}-${buildingCount}`;
      const buildingStats = getBuildingStats(command.payload.kind);
      const building: BuildingState = {
        id: buildingId,
        ownerEmpireId: settlement.ownerEmpireId,
        settlementId: settlement.id,
        kind: command.payload.kind,
        position,
        defense: buildingStats.defense,
        complete: false,
        remainingBuildTicks: buildingStats.buildTicks
      };

      this.state = {
        ...this.state,
        buildings: {
          ...this.state.buildings,
          [buildingId]: building
        },
        empires: {
          ...this.state.empires,
          [empire.id]: {
            ...empire,
            resources: {
              ...empire.resources,
              wood: empire.resources.wood - cost.wood,
              iron: empire.resources.iron - cost.iron
            }
          }
        },
        settlements: {
          ...this.state.settlements,
          [settlement.id]: {
            ...settlement,
            buildingIds: [...settlement.buildingIds, buildingId]
          }
        }
      };
      this.eventWriter.emit(tick, "building-placed", {
        commandId: command.id,
        buildingId,
        kind: command.payload.kind,
        woodCost: cost.wood,
        ironCost: cost.iron
      });
      this.observePlayerCommand(command, tick);
      return;
    }

    if (command.type === "create-battalion") {
      const settlement = this.state.settlements[command.payload.settlementId];
      if (!settlement) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }

      const specialization = command.payload.specialization ?? "militia";
      const isScoutPack = specialization === "hounds";
      const available = settlement.population.citizens - settlement.population.militarizedCitizens;
      const size = isScoutPack ? 4 : Math.max(1, Math.floor(command.payload.size));
      const profile = getBattalionProfile(specialization);
      const hasMilitaryQuarters = settlement.buildingIds.some((id) => {
        const building = this.state.buildings[id];
        return building?.kind === "military-quarters" && building.complete;
      });
      const hasTownSquare = settlement.buildingIds.some((id) => {
        const building = this.state.buildings[id];
        return building?.kind === "town-square" && building.complete;
      });
      const empire = this.state.empires[settlement.ownerEmpireId];
      if (
        (!isScoutPack && size > available) ||
        settlement.localFood < size * profile.foodPerUnit ||
        empire.resources.wood < size * profile.woodPerUnit ||
        empire.resources.iron < size * profile.ironPerUnit ||
        (isScoutPack ? !hasTownSquare : specialization !== "militia" && !hasMilitaryQuarters)
      ) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }

      const castle = this.state.buildings[settlement.centralBuildingId];
      const battalionId = `battalion-${tick}-${settlement.battalionIds.length + 1}`;
      const battalion: BattalionState = {
        id: battalionId,
        ownerEmpireId: settlement.ownerEmpireId,
        settlementId: settlement.id,
        position: { x: castle.position.x + 70, y: castle.position.y + 10 },
        specialization,
        size,
        attack: size * profile.attackPerUnit,
        defense: size * profile.defensePerUnit,
        maxDefense: size * profile.defensePerUnit,
        range: profile.range,
        speed: profile.speed,
        attackCooldownTicks: profile.attackCooldownTicks,
        attackCooldownRemaining: 0,
        morale: 70,
        devotion: 55,
        supply: 100,
        experience: 0
      };

      this.state = {
        ...this.state,
        battalions: {
          ...this.state.battalions,
          [battalionId]: battalion
        },
        empires: {
          ...this.state.empires,
          [empire.id]: {
            ...empire,
            resources: {
              ...empire.resources,
              wood: empire.resources.wood - size * profile.woodPerUnit,
              iron: empire.resources.iron - size * profile.ironPerUnit
            }
          }
        },
        settlements: {
          ...this.state.settlements,
          [settlement.id]: {
            ...settlement,
            battalionIds: [...settlement.battalionIds, battalionId],
            population: {
              ...settlement.population,
              militarizedCitizens: settlement.population.militarizedCitizens + (isScoutPack ? 0 : size)
            },
            localFood: settlement.localFood - size * profile.foodPerUnit
          }
        }
      };
      this.eventWriter.emit(tick, "battalion-created", {
        commandId: command.id,
        battalionId,
        size,
        specialization
      });
      this.observePlayerCommand(command, tick);
      return;
    }

    if (command.type === "create-caravan") {
      const settlement = this.state.settlements[command.payload.settlementId];
      const hasTownSquare = settlement?.buildingIds.some((id) => {
        const building = this.state.buildings[id];
        return building?.kind === "town-square" && building.complete;
      });
      const empire = settlement ? this.state.empires[settlement.ownerEmpireId] : undefined;
      const foodLoad = settlement ? Math.min(24, settlement.localFood) : 0;
      if (!settlement || !empire || !hasTownSquare || empire.resources.wood < 8 || foodLoad < 12) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }
      const castle = this.state.buildings[settlement.centralBuildingId];
      const caravanId = `caravan-${tick}-${settlement.caravanIds.length + 1}`;
      const caravan: CaravanState = {
        id: caravanId,
        ownerEmpireId: settlement.ownerEmpireId,
        settlementId: settlement.id,
        kind: "caravan",
        position: { x: castle.position.x + 90, y: castle.position.y + 20 },
        cargoFood: foodLoad,
        capacity: 40,
        passengerBattalionIds: [],
        defense: 60,
        maxDefense: 60,
        speed: 48
      };
      this.state = {
        ...this.state,
        caravans: { ...this.state.caravans, [caravanId]: caravan },
        empires: {
          ...this.state.empires,
          [empire.id]: {
            ...empire,
            resources: { ...empire.resources, wood: empire.resources.wood - 8 }
          }
        },
        settlements: {
          ...this.state.settlements,
          [settlement.id]: {
            ...settlement,
            caravanIds: [...settlement.caravanIds, caravanId],
            localFood: settlement.localFood - foodLoad
          }
        }
      };
      this.eventWriter.emit(tick, "caravan-created", { commandId: command.id, caravanId, foodLoad });
      this.observePlayerCommand(command, tick);
      return;
    }

    if (command.type === "create-ship") {
      const settlement = this.state.settlements[command.payload.settlementId];
      const empire = settlement ? this.state.empires[settlement.ownerEmpireId] : undefined;
      const hasTownSquare = settlement?.buildingIds.some((id) => {
        const building = this.state.buildings[id];
        return building?.kind === "town-square" && building.complete;
      });
      const launch = settlement ? this.getWaterLaunchPoint(settlement.id) : undefined;
      const foodLoad = settlement ? Math.min(24, settlement.localFood) : 0;
      if (!settlement || !empire || !hasTownSquare || !launch || empire.resources.wood < 18 || empire.resources.iron < 4 || foodLoad < 12) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }
      const shipId = `ship-${tick}-${settlement.caravanIds.length + 1}`;
      const ship: CaravanState = {
        id: shipId, ownerEmpireId: settlement.ownerEmpireId, settlementId: settlement.id, kind: "ship", position: launch,
        cargoFood: foodLoad, capacity: 52, passengerBattalionIds: [], defense: 110, maxDefense: 110, speed: 56
      };
      this.state = {
        ...this.state,
        caravans: { ...this.state.caravans, [shipId]: ship },
        empires: { ...this.state.empires, [empire.id]: { ...empire, resources: { ...empire.resources, wood: empire.resources.wood - 18, iron: empire.resources.iron - 4 } } },
        settlements: { ...this.state.settlements, [settlement.id]: { ...settlement, caravanIds: [...settlement.caravanIds, shipId], localFood: settlement.localFood - foodLoad } }
      };
      this.eventWriter.emit(tick, "ship-created", { commandId: command.id, shipId, foodLoad });
      this.observePlayerCommand(command, tick);
      return;
    }

    if (command.type === "move-battalion") {
      const battalion = this.state.battalions[command.payload.battalionId];
      if (!battalion || battalion.embarkedInCaravanId) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }

      const garrison = battalion.garrisonedInBuildingId
        ? this.state.buildings[battalion.garrisonedInBuildingId]
        : undefined;
      const nextBuildings = garrison
        ? {
            ...this.state.buildings,
            [garrison.id]: {
              ...garrison,
              garrisonBattalionIds: (garrison.garrisonBattalionIds ?? []).filter((id) => id !== battalion.id)
            }
          }
        : this.state.buildings;

      this.state = {
        ...this.state,
        buildings: nextBuildings,
        battalions: {
          ...this.state.battalions,
          [battalion.id]: {
            ...battalion,
            garrisonedInBuildingId: undefined,
            destination: command.payload.destination,
            targetId: undefined
          }
        }
      };
      if (garrison) {
        this.eventWriter.emit(tick, "battalion-ungarrisoned", {
          battalionId: battalion.id,
          buildingId: garrison.id,
          reason: "move-order"
        });
      }
      this.eventWriter.emit(tick, "command-applied", { commandId: command.id });
      this.observePlayerCommand(command, tick);
      return;
    }

    if (command.type === "retreat-battalion") {
      const battalion = this.state.battalions[command.payload.battalionId];
      const home = battalion ? this.state.settlements[battalion.settlementId] : undefined;
      const castle = home ? this.state.buildings[home.centralBuildingId] : undefined;
      if (!battalion || !castle || battalion.embarkedInCaravanId) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }
      const garrison = battalion.garrisonedInBuildingId
        ? this.state.buildings[battalion.garrisonedInBuildingId]
        : undefined;
      this.state = {
        ...this.state,
        buildings: garrison
          ? {
              ...this.state.buildings,
              [garrison.id]: {
                ...garrison,
                garrisonBattalionIds: (garrison.garrisonBattalionIds ?? []).filter((id) => id !== battalion.id)
              }
            }
          : this.state.buildings,
        battalions: {
          ...this.state.battalions,
          [battalion.id]: {
            ...battalion,
            targetId: undefined,
            garrisonedInBuildingId: undefined,
            destination: castle.position,
            morale: Math.max(0, battalion.morale - 2)
          }
        }
      };
      if (garrison) {
        this.eventWriter.emit(tick, "battalion-ungarrisoned", {
          battalionId: battalion.id,
          buildingId: garrison.id,
          reason: "retreat-order"
        });
      }
      this.eventWriter.emit(tick, "battalion-retreated", {
        battalionId: battalion.id,
        settlementId: battalion.settlementId,
        moraleCost: 2
      });
      this.observePlayerCommand(command, tick);
      return;
    }

    if (command.type === "move-caravan") {
      const caravan = this.state.caravans[command.payload.caravanId];
      const terrain = terrainAtPosition(this.state, command.payload.destination);
      if (
        !caravan ||
        (caravan.kind === "caravan" && terrain === "water") ||
        (caravan.kind === "ship" && terrain !== "water")
      ) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }
      this.state = {
        ...this.state,
        caravans: {
          ...this.state.caravans,
          [caravan.id]: { ...caravan, destination: command.payload.destination }
        }
      };
      this.eventWriter.emit(tick, "command-applied", { commandId: command.id });
      this.observePlayerCommand(command, tick);
      return;
    }

    if (command.type === "embark-battalion") {
      const battalion = this.state.battalions[command.payload.battalionId];
      const caravan = this.state.caravans[command.payload.caravanId];
      if (
        !battalion ||
        !caravan ||
        battalion.embarkedInCaravanId ||
        battalion.garrisonedInBuildingId ||
        battalion.ownerEmpireId !== caravan.ownerEmpireId ||
        distance(battalion.position, caravan.position) > 72 ||
        this.getCaravanUsedCapacity(caravan) + battalion.size > caravan.capacity
      ) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }
      this.state = {
        ...this.state,
        caravans: {
          ...this.state.caravans,
          [caravan.id]: {
            ...caravan,
            passengerBattalionIds: [...caravan.passengerBattalionIds, battalion.id]
          }
        },
        battalions: {
          ...this.state.battalions,
          [battalion.id]: {
            ...battalion,
            embarkedInCaravanId: caravan.id,
            position: caravan.position,
            destination: undefined
          }
        }
      };
      this.eventWriter.emit(tick, "battalion-embarked", {
        commandId: command.id,
        battalionId: battalion.id,
        caravanId: caravan.id
      });
      this.observePlayerCommand(command, tick);
      return;
    }

    if (command.type === "disembark-caravan") {
      const caravan = this.state.caravans[command.payload.caravanId];
      if (!caravan || caravan.passengerBattalionIds.length === 0) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }
      const nextBattalions: Record<string, BattalionState> = { ...this.state.battalions };
      for (const battalionId of caravan.passengerBattalionIds) {
        const battalion = nextBattalions[battalionId];
        if (battalion) {
          nextBattalions[battalionId] = {
            ...battalion,
            embarkedInCaravanId: undefined,
            position: caravan.position
          };
        }
      }
      this.state = {
        ...this.state,
        caravans: {
          ...this.state.caravans,
          [caravan.id]: { ...caravan, passengerBattalionIds: [] }
        },
        battalions: nextBattalions
      };
      this.eventWriter.emit(tick, "battalion-disembarked", {
        commandId: command.id,
        caravanId: caravan.id
      });
      this.observePlayerCommand(command, tick);
      return;
    }

    if (command.type === "garrison-battalion") {
      const battalion = this.state.battalions[command.payload.battalionId];
      const building = this.state.buildings[command.payload.buildingId];
      const garrisonIds = building?.garrisonBattalionIds ?? [];
      if (
        !battalion ||
        !building ||
        battalion.specialization === "hounds" ||
        battalion.embarkedInCaravanId ||
        battalion.garrisonedInBuildingId ||
        battalion.ownerEmpireId !== building.ownerEmpireId ||
        !building.complete ||
        !this.isGarrisonable(building.kind) ||
        distance(battalion.position, building.position) > 84 ||
        garrisonIds.length >= this.getGarrisonCapacity(building.kind)
      ) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }

      this.state = {
        ...this.state,
        buildings: {
          ...this.state.buildings,
          [building.id]: { ...building, garrisonBattalionIds: [...garrisonIds, battalion.id] }
        },
        battalions: {
          ...this.state.battalions,
          [battalion.id]: {
            ...battalion,
            garrisonedInBuildingId: building.id,
            position: building.position,
            destination: undefined
          }
        }
      };
      this.eventWriter.emit(tick, "battalion-garrisoned", {
        commandId: command.id,
        battalionId: battalion.id,
        buildingId: building.id
      });
      this.observePlayerCommand(command, tick);
      return;
    }

    if (command.type === "attack-with-ship") {
      const ship = this.state.caravans[command.payload.shipId];
      const target = this.state.caravans[command.payload.targetId];
      if (
        !ship ||
        !target ||
        ship.kind !== "ship" ||
        target.ownerEmpireId === ship.ownerEmpireId
      ) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }
      this.state = {
        ...this.state,
        caravans: {
          ...this.state.caravans,
          [ship.id]: { ...ship, targetId: target.id, destination: target.position }
        }
      };
      this.eventWriter.emit(tick, "attack-ordered", {
        commandId: command.id,
        shipId: ship.id,
        targetId: target.id
      });
      this.observePlayerCommand(command, tick);
      return;
    }

    if (command.type === "attack-target") {
      const battalion = this.state.battalions[command.payload.battalionId];
      const target = this.findTarget(command.payload.targetId);
      if (!battalion || !target || battalion.ownerEmpireId === target.ownerEmpireId) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }

      this.state = {
        ...this.state,
        battalions: {
          ...this.state.battalions,
          [battalion.id]: {
            ...battalion,
            targetId: command.payload.targetId,
            destination: target.position
          }
        }
      };
      this.eventWriter.emit(tick, "attack-ordered", {
        commandId: command.id,
        battalionId: battalion.id,
        targetId: command.payload.targetId
      });
      this.observePlayerCommand(command, tick);
      return;
    }

    if (command.type === "assimilate-captives") {
      const settlement = this.state.settlements[command.payload.settlementId];
      const hasTownSquare = settlement?.buildingIds.some((id) => {
        const building = this.state.buildings[id];
        return building?.kind === "town-square" && building.complete;
      });
      const count = Math.max(1, Math.floor(command.payload.count));
      if (!settlement || !hasTownSquare || settlement.population.captives < count) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }
      this.state = {
        ...this.state,
        settlements: {
          ...this.state.settlements,
          [settlement.id]: {
            ...settlement,
            population: {
              ...settlement.population,
              captives: settlement.population.captives - count,
              citizens: settlement.population.citizens + count,
              loyalty: Math.min(100, settlement.population.loyalty + 2),
              devotion: Math.min(100, settlement.population.devotion + 1)
            }
          }
        }
      };
      this.eventWriter.emit(tick, "captives-assimilated", {
        commandId: command.id,
        settlementId: settlement.id,
        count
      });
      this.recordMoralMemory(settlement.ownerEmpireId, "captivesIntegrated", count, tick);
      this.observePlayerCommand(command, tick);
      return;
    }

    if (command.type === "release-captives") {
      const settlement = this.state.settlements[command.payload.settlementId];
      const count = Math.max(1, Math.floor(command.payload.count));
      if (!settlement || settlement.population.captives < count) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }
      this.state = {
        ...this.state,
        settlements: {
          ...this.state.settlements,
          [settlement.id]: {
            ...settlement,
            internalFaith: Math.min(100, settlement.internalFaith + 4),
            population: {
              ...settlement.population,
              captives: settlement.population.captives - count,
              happiness: Math.min(100, settlement.population.happiness + 5),
              loyalty: Math.min(100, settlement.population.loyalty + 7),
              devotion: Math.min(100, settlement.population.devotion + 6)
            }
          }
        }
      };
      this.eventWriter.emit(tick, "captives-released", {
        commandId: command.id,
        settlementId: settlement.id,
        count,
        reason: "royal-decree"
      });
      this.recordMoralMemory(settlement.ownerEmpireId, "captivesReleased", count, tick);
      this.observePlayerCommand(command, tick);
      return;
    }

    if (command.type === "reward-heir" || command.type === "punish-heir") {
      this.applyHeirFeedback(
        command.payload.heirId,
        command.type === "reward-heir" ? 16 : -18,
        command.type === "reward-heir" ? 5 : -6,
        tick,
        command.id
      );
      return;
    }

    if (command.type === "generate-faith") {
      const empire = this.state.empires[command.payload.empireId];
      if (!empire) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }

      this.state = {
        ...this.state,
        empires: {
          ...this.state.empires,
          [empire.id]: {
            ...empire,
            resources: {
              ...empire.resources,
              faith: empire.resources.faith + command.payload.amount
            }
          }
        }
      };
      this.eventWriter.emit(tick, "command-applied", { commandId: command.id });
      this.observePlayerCommand(command, tick);
      return;
    }

    if (command.type === "cast-miracle") {
      const empire = this.state.empires[command.payload.empireId];
      const cost = getMiracleCost(command.payload.kind);
      if (!empire || empire.resources.faith < cost) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }

      if (command.payload.kind === "divine-judgment") {
        const settlement = command.payload.settlementId
          ? this.state.settlements[command.payload.settlementId]
          : undefined;
        if (!settlement || settlement.ownerEmpireId !== empire.id) {
          this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
          return;
        }
        this.state = {
          ...this.state,
          empires: {
            ...this.state.empires,
            [empire.id]: {
              ...empire,
              resources: { ...empire.resources, faith: empire.resources.faith - cost }
            }
          },
          settlements: {
            ...this.state.settlements,
            [settlement.id]: {
              ...settlement,
              religiousWardTicks: 3,
              internalFaith: Math.min(100, settlement.internalFaith + 8),
              population: {
                ...settlement.population,
                loyalty: Math.min(100, settlement.population.loyalty + 4),
                devotion: Math.min(100, settlement.population.devotion + 5)
              }
            }
          }
        };
        this.eventWriter.emit(tick, "miracle-cast", {
          commandId: command.id,
          miracle: command.payload.kind,
          settlementId: settlement.id,
          faithCost: cost,
          wardTicks: 3
        });
        this.observePlayerCommand(command, tick);
        return;
      }

      if (command.payload.kind === "bless-harvest") {
        const settlement = command.payload.settlementId
          ? this.state.settlements[command.payload.settlementId]
          : Object.values(this.state.settlements)
              .filter((candidate) => candidate.ownerEmpireId === empire.id)
              .sort((left, right) => left.id.localeCompare(right.id))[0];
        if (!settlement || settlement.ownerEmpireId !== empire.id) {
          this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
          return;
        }
        this.state = {
          ...this.state,
          empires: {
            ...this.state.empires,
            [empire.id]: {
              ...empire,
              resources: { ...empire.resources, faith: empire.resources.faith - cost }
            }
          },
          settlements: {
            ...this.state.settlements,
            [settlement.id]: {
              ...settlement,
              localFood: settlement.localFood + 24,
              internalFaith: Math.min(100, settlement.internalFaith + 8),
              population: {
                ...settlement.population,
                happiness: Math.min(100, settlement.population.happiness + 5),
                devotion: Math.min(100, settlement.population.devotion + 6)
              }
            }
          }
        };
        this.eventWriter.emit(tick, "miracle-cast", {
          commandId: command.id,
          miracle: command.payload.kind,
          settlementId: settlement.id,
          faithCost: cost
        });
        this.observePlayerCommand(command, tick);
        return;
      }

      const battalion = command.payload.targetId ? this.state.battalions[command.payload.targetId] : undefined;
      if (!battalion || battalion.ownerEmpireId !== empire.id) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }
      this.state = {
        ...this.state,
        empires: {
          ...this.state.empires,
          [empire.id]: {
            ...empire,
            resources: { ...empire.resources, faith: empire.resources.faith - cost }
          }
        },
        battalions: {
          ...this.state.battalions,
          [battalion.id]: {
            ...battalion,
            morale: Math.min(100, battalion.morale + 24),
            devotion: Math.min(100, battalion.devotion + 10)
          }
        }
      };
      this.eventWriter.emit(tick, "miracle-cast", {
        commandId: command.id,
        miracle: command.payload.kind,
        battalionId: battalion.id,
        faithCost: cost
      });
      this.observePlayerCommand(command, tick);
    }
  }

  private observePlayerCommand(command: GameCommand, tick: number): void {
    if (command.issuedBy === "system") {
      return;
    }

    const observation = getDoctrineObservation(command, this.state);
    if (!observation) {
      return;
    }

    const learningHeirs = Object.values(this.state.heirs)
      .filter((heir) => heir.ownerEmpireId === "empire-player" && heir.alive && heir.mode === "learning")
      .sort((a, b) => a.id.localeCompare(b.id));

    for (const heir of learningHeirs) {
      const existing = heir.doctrineIds
        .map((id) => this.state.doctrines[id])
        .find((doctrine) => doctrine?.id === `doctrine-${heir.id}-${observation.key}`);
      const doctrineId = existing?.id ?? `doctrine-${heir.id}-${observation.key}`;
      const doctrine: DoctrineRule = existing
        ? {
            ...existing,
            confidence: Math.min(100, existing.confidence + 6),
            updatedAtTick: tick
          }
        : {
            id: doctrineId,
            ownerId: heir.id,
            domain: observation.domain,
            condition: observation.condition,
            preferredAction: observation.preferredAction,
            goal: observation.goal,
            confidence: 22,
            createdAtTick: tick,
            updatedAtTick: tick
          };
      const nextHeir: HeirState = {
        ...heir,
        lastDoctrineId: doctrineId,
        doctrineIds: existing ? heir.doctrineIds : [...heir.doctrineIds, doctrineId]
      };

      this.state = {
        ...this.state,
        doctrines: { ...this.state.doctrines, [doctrineId]: doctrine },
        heirs: { ...this.state.heirs, [heir.id]: nextHeir }
      };
      this.eventWriter.emit(tick, "doctrine-observed", {
        heirId: heir.id,
        doctrineId,
        action: doctrine.preferredAction,
        confidence: doctrine.confidence
      });
    }
  }

  private applyHeirFeedback(
    heirId: string,
    confidenceDelta: number,
    trustDelta: number,
    tick: number,
    commandId: string
  ): void {
    const heir = this.state.heirs[heirId];
    const doctrine = heir?.lastDoctrineId ? this.state.doctrines[heir.lastDoctrineId] : undefined;
    if (!heir || !doctrine) {
      this.eventWriter.emit(tick, "command-rejected", { commandId });
      return;
    }

    const nextDoctrine: DoctrineRule = {
      ...doctrine,
      confidence: Math.max(0, Math.min(100, doctrine.confidence + confidenceDelta)),
      updatedAtTick: tick
    };
    const nextHeir: HeirState = {
      ...heir,
      trust: Math.max(0, Math.min(100, heir.trust + trustDelta)),
      lastDoctrineId: nextDoctrine.id
    };
    this.state = {
      ...this.state,
      doctrines: { ...this.state.doctrines, [nextDoctrine.id]: nextDoctrine },
      heirs: { ...this.state.heirs, [heir.id]: nextHeir }
    };
    this.eventWriter.emit(
      tick,
      confidenceDelta > 0 ? "doctrine-reinforced" : "doctrine-disciplined",
      { heirId: heir.id, doctrineId: nextDoctrine.id, confidence: nextDoctrine.confidence }
    );
  }

  private updateHeirGovernance(tick: number): void {
    const governors = Object.values(this.state.heirs)
      .filter((heir) => heir.alive && heir.mode === "governance")
      .sort((left, right) => left.id.localeCompare(right.id));

    for (const heir of governors) {
      const settlement = Object.values(this.state.settlements).find(
        (candidate) => candidate.heirId === heir.id
      );
      if (!settlement) {
        continue;
      }

      const availableCitizens = settlement.population.citizens - settlement.population.militarizedCitizens;
      const ownBattalions = Object.values(this.state.battalions)
        .filter(
          (battalion) =>
            battalion.ownerEmpireId === settlement.ownerEmpireId && battalion.settlementId === settlement.id
        )
        .sort((left, right) => left.id.localeCompare(right.id));
      const castle = this.state.buildings[settlement.centralBuildingId];
      const nearestEnemy = castle
        ? Object.values(this.state.battalions)
            .filter(
              (battalion) =>
                battalion.ownerEmpireId !== settlement.ownerEmpireId &&
                isPositionVisibleToEmpire(this.state, settlement.ownerEmpireId, battalion.position)
            )
            .sort(
              (left, right) =>
                distance(left.position, castle.position) - distance(right.position, castle.position) ||
                left.id.localeCompare(right.id)
            )[0]
        : undefined;
      const enemyDistance = nearestEnemy && castle ? distance(nearestEnemy.position, castle.position) : Infinity;
      const enemyCastle = castle
        ? Object.values(this.state.buildings)
            .filter(
              (building) =>
                building.kind === "castle" &&
                building.ownerEmpireId !== settlement.ownerEmpireId &&
                building.complete &&
                isPositionVisibleToEmpire(this.state, settlement.ownerEmpireId, building.position)
            )
            .sort(
              (left, right) =>
                distance(left.position, castle.position) - distance(right.position, castle.position) ||
                left.id.localeCompare(right.id)
            )[0]
        : undefined;
      this.recordHeirConcern(heir, settlement, ownBattalions, enemyDistance, tick);
      const currentHeir = this.state.heirs[heir.id] ?? heir;
      const currentSettlement = this.state.settlements[settlement.id] ?? settlement;
      const currentEmpire = this.state.empires[currentSettlement.ownerEmpireId];
      const hasTownSquare = currentSettlement.buildingIds.some((buildingId) => {
        const building = this.state.buildings[buildingId];
        return building?.kind === "town-square" && building.complete;
      });
      const weakestBattalion = [...ownBattalions].sort(
        (left, right) => left.morale - right.morale || left.id.localeCompare(right.id)
      )[0];
      const garrisonTarget = Object.values(this.state.buildings)
        .filter(
          (building) =>
            building.ownerEmpireId === currentSettlement.ownerEmpireId &&
            building.settlementId === currentSettlement.id &&
            building.complete &&
            this.isGarrisonable(building.kind) &&
            (building.garrisonBattalionIds?.length ?? 0) < this.getGarrisonCapacity(building.kind)
        )
        .sort((left, right) => left.id.localeCompare(right.id))[0];
      const garrisonCandidate = ownBattalions.find((battalion) => !battalion.garrisonedInBuildingId);
      const expeditionCandidate = ownBattalions.find(
        (battalion) => !battalion.garrisonedInBuildingId && !battalion.embarkedInCaravanId
      );
      const expeditionTarget = nearestEnemy && enemyDistance < 170 ? nearestEnemy : enemyCastle;
      const rivalOpeningComplete =
        currentEmpire?.id === "empire-rival" &&
        tick >= RIVAL_DIFFICULTY_PROFILES[this.state.rivalDifficulty].openingGraceTicks;

      const retreatCandidate = ownBattalions
        .filter((battalion) => !battalion.garrisonedInBuildingId && !battalion.embarkedInCaravanId)
        .sort((left, right) => left.morale - right.morale || left.supply - right.supply || left.id.localeCompare(right.id))[0];
      if (
        castle &&
        nearestEnemy &&
        retreatCandidate &&
        (retreatCandidate.morale <= 35 || retreatCandidate.supply <= 15)
      ) {
        this.state = {
          ...this.state,
          battalions: {
            ...this.state.battalions,
            [retreatCandidate.id]: {
              ...retreatCandidate,
              targetId: undefined,
              destination: castle.position,
              morale: Math.max(0, retreatCandidate.morale - 2)
            }
          }
        };
        this.eventWriter.emit(tick, "battalion-retreated", {
          battalionId: retreatCandidate.id,
          settlementId: currentSettlement.id,
          moraleCost: 2,
          heirId: currentHeir.id
        });
        this.recordHeirDecision(
          currentHeir.id,
          "Retreat to Crown",
          "A nearby enemy could destroy an exhausted field force before it could be resupplied.",
          80 + Math.max(0, 35 - retreatCandidate.morale) + Math.max(0, 15 - retreatCandidate.supply),
          tick
        );
        continue;
      }

      const unfinishedBuildings = currentSettlement.buildingIds.filter((buildingId) => {
        const building = this.state.buildings[buildingId];
        return building && !building.complete;
      }).length;
      const requiredBuilders = Math.min(unfinishedBuildings, availableCitizens);
      if (requiredBuilders > currentSettlement.population.builders) {
        const remainingWorkers = Math.max(0, availableCitizens - requiredBuilders);
        const farmers = Math.min(currentSettlement.population.farmers, remainingWorkers);
        const lumberjacks = Math.min(currentSettlement.population.lumberjacks, Math.max(0, remainingWorkers - farmers));
        const miners = Math.min(currentSettlement.population.miners, Math.max(0, remainingWorkers - farmers - lumberjacks));
        const luxuryWorkers = Math.min(
          currentSettlement.population.luxuryWorkers,
          Math.max(0, remainingWorkers - farmers - lumberjacks - miners)
        );
        this.state = {
          ...this.state,
          settlements: {
            ...this.state.settlements,
            [currentSettlement.id]: {
              ...currentSettlement,
              population: {
                ...currentSettlement.population,
                builders: requiredBuilders,
                farmers,
                lumberjacks,
                miners,
                luxuryWorkers
              }
            }
          }
        };
        this.recordHeirDecision(
          currentHeir.id,
          "Prioritize construction",
          "Unfinished foundations required labor before the settlement could benefit from its planned infrastructure.",
          66 + unfinishedBuildings * 6 + this.getDoctrineUtility(currentHeir, "Prioritize construction"),
          tick
        );
        continue;
      }

      const farmUtility =
        Math.max(0, 56 - currentSettlement.localFood) * 2 +
        Math.max(0, 8 - currentSettlement.population.farmers) * 10 +
        this.getDoctrineUtility(currentHeir, "Prioritize farm labor");
      const recruitUtility =
        availableCitizens >= 6 && (ownBattalions.length === 0 || (rivalOpeningComplete && ownBattalions.length < 2))
          ? 48 + Math.max(0, 260 - enemyDistance) / 5 + this.getDoctrineUtility(currentHeir, "Raise a battalion")
          : 0;
      const defendUtility =
        nearestEnemy && ownBattalions.length > 0 && enemyDistance < 240
          ? 42 + (240 - enemyDistance) / 4 + this.getDoctrineUtility(currentHeir, "Attack designated targets")
          : 0;
      const assimilationUtility =
        hasTownSquare &&
        currentSettlement.population.captives >= 4 &&
        this.getCitizenCapacity(currentSettlement.id) > currentSettlement.population.citizens
          ? currentSettlement.population.captives * 7 +
            currentSettlement.pressures.rebellion * 1.5 +
            this.getDoctrineUtility(currentHeir, "Assimilate captives")
          : 0;
      const inspireUtility =
        weakestBattalion && weakestBattalion.morale < 65 && currentEmpire?.resources.faith >= 16
          ? (65 - weakestBattalion.morale) * 3 +
            currentSettlement.pressures.military +
            this.getDoctrineUtility(currentHeir, "Inspire battalions")
          : 0;
      const garrisonUtility =
        garrisonTarget && garrisonCandidate && enemyDistance < 300
          ? 36 + (300 - enemyDistance) / 5 + this.getDoctrineUtility(currentHeir, "Garrison defensive works")
          : 0;
      const expeditionUtility =
        expeditionCandidate &&
        expeditionTarget &&
        rivalOpeningComplete &&
        ownBattalions.length >= 2 &&
        enemyDistance > 240
          ? 46 +
            Math.min(18, ownBattalions.reduce((total, battalion) => total + battalion.morale, 0) / 12) +
            this.getDoctrineUtility(currentHeir, "Lead an expedition")
          : 0;

      if (rivalOpeningComplete && ownBattalions.length >= 2 && expeditionCandidate && !expeditionTarget) {
        const scoutDestination = { x: 650, y: 300 };
        if (
          expeditionCandidate.destination?.x !== scoutDestination.x ||
          expeditionCandidate.destination?.y !== scoutDestination.y
        ) {
          this.state = {
            ...this.state,
            battalions: {
              ...this.state.battalions,
              [expeditionCandidate.id]: {
                ...expeditionCandidate,
                targetId: undefined,
                destination: scoutDestination
              }
            }
          };
          this.recordHeirDecision(
            currentHeir.id,
            "Scout the frontier",
            "No rival force was observed, so the field force advanced to contested ground to establish contact.",
            38 + this.getDoctrineUtility(currentHeir, "Scout the frontier"),
            tick
          );
        }
        continue;
      }

      if (
        expeditionUtility >= 30 &&
        expeditionCandidate &&
        expeditionTarget &&
        expeditionCandidate.targetId !== expeditionTarget.id
      ) {
        this.state = {
          ...this.state,
          battalions: {
            ...this.state.battalions,
            [expeditionCandidate.id]: {
              ...expeditionCandidate,
              targetId: expeditionTarget.id,
              destination: expeditionTarget.position
            }
          }
        };
        this.eventWriter.emit(tick, "attack-ordered", {
          battalionId: expeditionCandidate.id,
          targetId: expeditionTarget.id,
          heirId: currentHeir.id
        });
        this.recordHeirDecision(
          currentHeir.id,
          "Lead an expedition",
          "A prepared field force could pressure the rival throne before local danger required its return.",
          expeditionUtility,
          tick
        );
        continue;
      }

      if (
        farmUtility >= recruitUtility &&
        farmUtility >= defendUtility &&
        farmUtility >= assimilationUtility &&
        farmUtility >= inspireUtility &&
        farmUtility >= garrisonUtility &&
        farmUtility >= expeditionUtility &&
        farmUtility >= 30
      ) {
        const nextFarmers = Math.min(availableCitizens, Math.max(8, settlement.population.farmers));
        const remainingWorkers = Math.max(0, availableCitizens - nextFarmers);
        this.state = {
          ...this.state,
          settlements: {
            ...this.state.settlements,
            [settlement.id]: {
              ...settlement,
              population: {
                ...settlement.population,
                farmers: nextFarmers,
                builders: Math.min(settlement.population.builders, remainingWorkers),
                lumberjacks: Math.min(
                  settlement.population.lumberjacks,
                  Math.max(0, remainingWorkers - settlement.population.builders)
                ),
                miners: Math.min(
                  settlement.population.miners,
                  Math.max(
                    0,
                    remainingWorkers - settlement.population.builders - settlement.population.lumberjacks
                  )
                ),
                luxuryWorkers: Math.min(
                  settlement.population.luxuryWorkers,
                  Math.max(
                    0,
                    remainingWorkers -
                      settlement.population.builders -
                      settlement.population.lumberjacks -
                      settlement.population.miners
                  )
                )
              }
            }
          }
        };
        this.recordHeirDecision(
          heir.id,
          "Prioritize farm labor",
          "Food reserves and farm capacity outweighed every other pressure.",
          farmUtility,
          tick
        );
        continue;
      }

      if (
        assimilationUtility >= recruitUtility &&
        assimilationUtility >= defendUtility &&
        assimilationUtility >= inspireUtility &&
        assimilationUtility >= garrisonUtility &&
        assimilationUtility >= expeditionUtility &&
        assimilationUtility >= 30
      ) {
        const count = Math.min(4, currentSettlement.population.captives);
        this.state = {
          ...this.state,
          settlements: {
            ...this.state.settlements,
            [currentSettlement.id]: {
              ...currentSettlement,
              population: {
                ...currentSettlement.population,
                captives: currentSettlement.population.captives - count,
                citizens: currentSettlement.population.citizens + count,
                loyalty: Math.min(100, currentSettlement.population.loyalty + 3),
                devotion: Math.min(100, currentSettlement.population.devotion + 2)
              }
            }
          }
        };
        this.eventWriter.emit(tick, "captives-assimilated", {
          settlementId: currentSettlement.id,
          count,
          heirId: currentHeir.id
        });
        this.recordMoralMemory(currentSettlement.ownerEmpireId, "captivesIntegrated", count, tick);
        this.recordHeirDecision(
          currentHeir.id,
          "Assimilate captives",
          "Rebellion pressure made captive integration more valuable than further labor extraction.",
          assimilationUtility,
          tick
        );
        continue;
      }

      if (
        inspireUtility >= recruitUtility &&
        inspireUtility >= defendUtility &&
        inspireUtility >= garrisonUtility &&
        inspireUtility >= expeditionUtility &&
        inspireUtility >= 30 &&
        weakestBattalion &&
        currentEmpire
      ) {
        this.state = {
          ...this.state,
          empires: {
            ...this.state.empires,
            [currentEmpire.id]: {
              ...currentEmpire,
              resources: { ...currentEmpire.resources, faith: currentEmpire.resources.faith - 16 }
            }
          },
          battalions: {
            ...this.state.battalions,
            [weakestBattalion.id]: {
              ...weakestBattalion,
              morale: Math.min(100, weakestBattalion.morale + 18),
              devotion: Math.min(100, weakestBattalion.devotion + 8)
            }
          }
        };
        this.eventWriter.emit(tick, "miracle-cast", {
          miracle: "inspire-battalion",
          battalionId: weakestBattalion.id,
          faithCost: 16,
          heirId: currentHeir.id
        });
        this.recordHeirDecision(
          currentHeir.id,
          "Inspire battalions",
          "A failing field force needed divine assurance before it could hold the line.",
          inspireUtility,
          tick
        );
        continue;
      }

      if (
        garrisonUtility >= defendUtility &&
        garrisonUtility >= expeditionUtility &&
        garrisonUtility >= 30 &&
        garrisonTarget &&
        garrisonCandidate
      ) {
        this.state = {
          ...this.state,
          buildings: {
            ...this.state.buildings,
            [garrisonTarget.id]: {
              ...garrisonTarget,
              garrisonBattalionIds: [...(garrisonTarget.garrisonBattalionIds ?? []), garrisonCandidate.id]
            }
          },
          battalions: {
            ...this.state.battalions,
            [garrisonCandidate.id]: {
              ...garrisonCandidate,
              garrisonedInBuildingId: garrisonTarget.id,
              position: garrisonTarget.position,
              destination: undefined
            }
          }
        };
        this.eventWriter.emit(tick, "battalion-garrisoned", {
          battalionId: garrisonCandidate.id,
          buildingId: garrisonTarget.id,
          heirId: currentHeir.id
        });
        this.recordHeirDecision(
          currentHeir.id,
          "Garrison defensive works",
          "An enemy force approached within the settlement's defensive perimeter.",
          garrisonUtility,
          tick
        );
        continue;
      }

      if (
        recruitUtility >= defendUtility &&
        recruitUtility >= assimilationUtility &&
        recruitUtility >= inspireUtility &&
        recruitUtility >= garrisonUtility &&
        recruitUtility >= expeditionUtility &&
        recruitUtility >= 30 &&
        castle
      ) {
        const size = Math.min(8, availableCitizens);
        const profile = getBattalionProfile("militia");
        const battalionId = `battalion-governed-${tick}-${settlement.battalionIds.length + 1}`;
        const battalion: BattalionState = {
          id: battalionId,
          ownerEmpireId: settlement.ownerEmpireId,
          settlementId: settlement.id,
          position: { x: castle.position.x + 70, y: castle.position.y + 10 },
          specialization: "militia",
          size,
          attack: size * profile.attackPerUnit,
          defense: size * profile.defensePerUnit,
          maxDefense: size * profile.defensePerUnit,
          range: profile.range,
          speed: profile.speed,
          attackCooldownTicks: profile.attackCooldownTicks,
          attackCooldownRemaining: 0,
          morale: 70,
          devotion: 55,
          supply: 100,
          experience: 0
        };
        this.state = {
          ...this.state,
          battalions: { ...this.state.battalions, [battalionId]: battalion },
          settlements: {
            ...this.state.settlements,
            [settlement.id]: {
              ...settlement,
              battalionIds: [...settlement.battalionIds, battalionId],
              population: {
                ...settlement.population,
                militarizedCitizens: settlement.population.militarizedCitizens + size
              }
            }
          }
        };
        this.eventWriter.emit(tick, "battalion-created", { battalionId, size, heirId: heir.id });
        this.recordHeirDecision(
          heir.id,
          "Raise a battalion",
          "The settlement lacked a field force while military pressure rose.",
          recruitUtility,
          tick
        );
        continue;
      }

      if (defendUtility >= 30 && nearestEnemy) {
        const defender = ownBattalions[0];
        this.state = {
          ...this.state,
          battalions: {
            ...this.state.battalions,
            [defender.id]: {
              ...defender,
              targetId: nearestEnemy.id,
              destination: nearestEnemy.position
            }
          }
        };
        this.eventWriter.emit(tick, "attack-ordered", {
          battalionId: defender.id,
          targetId: nearestEnemy.id,
          heirId: heir.id
        });
        this.recordHeirDecision(
          heir.id,
          "Attack designated targets",
          "An enemy force breached the settlement's defensive perimeter.",
          defendUtility,
          tick
        );
        continue;
      }

      if (
        expeditionUtility >= 30 &&
        expeditionCandidate &&
        expeditionTarget &&
        expeditionCandidate.targetId !== expeditionTarget.id
      ) {
        this.state = {
          ...this.state,
          battalions: {
            ...this.state.battalions,
            [expeditionCandidate.id]: {
              ...expeditionCandidate,
              targetId: expeditionTarget.id,
              destination: expeditionTarget.position
            }
          }
        };
        this.eventWriter.emit(tick, "attack-ordered", {
          battalionId: expeditionCandidate.id,
          targetId: expeditionTarget.id,
          heirId: currentHeir.id
        });
        this.recordHeirDecision(
          currentHeir.id,
          "Lead an expedition",
          "A prepared field force could pressure the rival throne before local danger required its return.",
          expeditionUtility,
          tick
        );
      }
    }
  }

  private recordHeirConcern(
    heir: HeirState,
    settlement: WorldState["settlements"][string],
    battalions: BattalionState[],
    enemyDistance: number,
    tick: number
  ): void {
    const empire = this.state.empires[settlement.ownerEmpireId];
    const concern =
      settlement.localFood < 12
        ? { category: "starvation" as const, message: "Food stores are near exhaustion.", severity: 90 }
        : settlement.pressures.rebellion >= 50
          ? { category: "rebellion" as const, message: "Captive unrest threatens the settlement.", severity: settlement.pressures.rebellion }
          : enemyDistance < 260
            ? { category: "military" as const, message: "Enemy forces are inside the defensive perimeter.", severity: Math.round(260 - enemyDistance) }
            : (empire?.resources.faith ?? 0) < 12 && battalions.some((battalion) => battalion.morale < 60)
              ? { category: "faith" as const, message: "Faith reserves cannot sustain the field force.", severity: 55 }
              : undefined;
    if (
      !concern ||
      (heir.concern?.category === concern.category && heir.concern.message === concern.message)
    ) {
      return;
    }
    this.state = {
      ...this.state,
      heirs: {
        ...this.state.heirs,
        [heir.id]: { ...heir, concern: { ...concern, raisedAtTick: tick } }
      }
    };
    this.eventWriter.emit(tick, "heir-concern", { heirId: heir.id, ...concern });
  }

  private getDoctrineUtility(heir: HeirState, preferredAction: string): number {
    const doctrine = heir.doctrineIds
      .map((id) => this.state.doctrines[id])
      .filter((candidate): candidate is DoctrineRule => Boolean(candidate))
      .filter((candidate) => candidate.preferredAction === preferredAction)
      .sort((left, right) => right.confidence - left.confidence || left.id.localeCompare(right.id))[0];
    return doctrine ? doctrine.confidence * 0.45 : 0;
  }

  private recordHeirDecision(
    heirId: string,
    action: string,
    rationale: string,
    utility: number,
    tick: number
  ): void {
    const heir = this.state.heirs[heirId];
    if (!heir) {
      return;
    }
    const doctrineId = `doctrine-${heir.id}-govern-${action.toLowerCase().replaceAll(" ", "-")}`;
    const existingDoctrine = this.state.doctrines[doctrineId];
    const domain =
      action === "Prioritize farm labor"
        ? "economy"
        : action === "Assimilate captives"
          ? "society"
          : action === "Inspire battalions"
            ? "faith"
            : "military";
    const goal =
      action === "Assimilate captives"
        ? "Stabilize the settlement"
        : action === "Inspire battalions"
          ? "Restore military morale"
          : "Secure the settlement";
    const confidenceGain =
      heir.ownerEmpireId === "empire-rival"
        ? RIVAL_DIFFICULTY_PROFILES[this.state.rivalDifficulty].doctrineConfidenceGain
        : 1;
    const doctrine: DoctrineRule = existingDoctrine
      ? {
          ...existingDoctrine,
          confidence: Math.min(100, existingDoctrine.confidence + confidenceGain),
          updatedAtTick: tick
        }
      : {
          id: doctrineId,
          ownerId: heir.id,
          domain,
          condition: "Governance pressure requires action",
          preferredAction: action,
          goal,
          confidence: 20,
          createdAtTick: tick,
          updatedAtTick: tick
        };
    const nextHeir: HeirState = {
      ...heir,
      lastDoctrineId: doctrine.id,
      lastDecision: {
        tick,
        action,
        rationale,
        utility: Math.round(utility)
      },
      doctrineIds: existingDoctrine ? heir.doctrineIds : [...heir.doctrineIds, doctrine.id]
    };
    this.state = {
      ...this.state,
      doctrines: { ...this.state.doctrines, [doctrine.id]: doctrine },
      heirs: { ...this.state.heirs, [heir.id]: nextHeir }
    };
    this.eventWriter.emit(tick, "heir-decision", {
      heirId,
      action,
      rationale,
      utility: Math.round(utility),
      doctrineId: doctrine.id
    });
  }

  private updateEconomy(tick: number): void {
    for (const settlement of Object.values(this.state.settlements).sort((a, b) =>
      a.id.localeCompare(b.id)
    )) {
      const operationalBuildings = settlement.buildingIds
        .map((id) => this.state.buildings[id])
        .filter((building): building is BuildingState => Boolean(building?.complete));
      const farmCapacity = operationalBuildings.filter((building) => building.kind === "farm").length * 8;
      const lumberCapacity =
        operationalBuildings.filter((building) => building.kind === "lumber-mill").length * 8;
      const mineCapacity = operationalBuildings.filter((building) => building.kind === "mine").length * 8;
      const plantationCapacity =
        operationalBuildings.filter((building) => building.kind === "plantation").length * 8;
      const foodProduced = Math.min(settlement.population.farmers, farmCapacity) * 2;
      const woodProduced = Math.min(settlement.population.lumberjacks, lumberCapacity);
      const ironProduced = Math.min(settlement.population.miners, mineCapacity);
      const luxuryProduced = Math.min(settlement.population.luxuryWorkers, plantationCapacity);
      const empire = this.state.empires[settlement.ownerEmpireId];

      this.state = {
        ...this.state,
        empires: {
          ...this.state.empires,
          [empire.id]: {
            ...empire,
            resources: {
              ...empire.resources,
              wood: empire.resources.wood + woodProduced,
              iron: empire.resources.iron + ironProduced,
              luxury: empire.resources.luxury + luxuryProduced
            }
          }
        },
        settlements: {
          ...this.state.settlements,
          [settlement.id]: {
            ...settlement,
            localFood: settlement.localFood + foodProduced,
            population:
              luxuryProduced > 0
                ? {
                    ...settlement.population,
                    happiness: Math.min(100, settlement.population.happiness + Math.min(2, luxuryProduced)),
                    devotion: Math.min(100, settlement.population.devotion + 1)
                  }
                : settlement.population
          }
        }
      };

      if (foodProduced > 0) {
        this.eventWriter.emit(tick, "food-produced", {
          settlementId: settlement.id,
          amount: foodProduced
        });
      }

      if (woodProduced > 0) {
        this.eventWriter.emit(tick, "wood-produced", {
          settlementId: settlement.id,
          amount: woodProduced
        });
      }

      if (ironProduced > 0) {
        this.eventWriter.emit(tick, "iron-produced", {
          settlementId: settlement.id,
          amount: ironProduced
        });
      }
      if (luxuryProduced > 0) {
        this.eventWriter.emit(tick, "luxury-produced", {
          settlementId: settlement.id,
          amount: luxuryProduced,
          happinessGain: Math.min(2, luxuryProduced),
          devotionGain: 1
        });
      }
    }
  }

  private updateConstruction(tick: number): void {
    const updatedBuildings: Record<string, BuildingState> = {};
    const buildersAssigned: Record<string, number> = {};

    for (const building of Object.values(this.state.buildings).sort((a, b) =>
      a.id.localeCompare(b.id)
    )) {
      if (building.complete) {
        updatedBuildings[building.id] = building;
        continue;
      }

      const settlement = this.state.settlements[building.settlementId];
      const availableBuilders = settlement?.population.builders ?? 0;
      const assignedBuilders = buildersAssigned[building.settlementId] ?? 0;
      if (assignedBuilders >= availableBuilders) {
        updatedBuildings[building.id] = building;
        this.eventWriter.emit(tick, "construction-stalled", {
          buildingId: building.id,
          settlementId: building.settlementId,
          reason: "no-builders"
        });
        continue;
      }
      buildersAssigned[building.settlementId] = assignedBuilders + 1;

      const nextRemainingTicks = Math.max(0, building.remainingBuildTicks - 1);
      updatedBuildings[building.id] = {
        ...building,
        complete: nextRemainingTicks === 0,
        remainingBuildTicks: nextRemainingTicks
      };

      this.eventWriter.emit(tick, "construction-progressed", {
        buildingId: building.id,
        complete: nextRemainingTicks === 0
      });
    }

    this.state = {
      ...this.state,
      buildings: updatedBuildings
    };
  }

  private updatePopulation(tick: number): void {
    for (const settlement of Object.values(this.state.settlements).sort((left, right) =>
      left.id.localeCompare(right.id)
    )) {
      const population = settlement.population;
      const totalPopulation = population.citizens + population.captives;
      // One simulation tick represents five seconds of world time. This keeps
      // food consequential without turning the opening castle into a famine trap.
      const foodRequired = Math.max(1, Math.ceil(totalPopulation / 8));
      const citizenCapacity = this.getCitizenCapacity(settlement.id);

      if (settlement.localFood < foodRequired) {
        const shortage = foodRequired - settlement.localFood;
        const deaths = Math.min(population.citizens, Math.max(1, Math.ceil(shortage / 6)));
        const survivingCitizens = population.citizens - deaths;
        this.state = {
          ...this.state,
          settlements: {
            ...this.state.settlements,
            [settlement.id]: {
              ...settlement,
              localFood: 0,
              population: {
                ...population,
                citizens: survivingCitizens,
                militarizedCitizens: Math.min(population.militarizedCitizens, survivingCitizens),
                happiness: Math.max(0, population.happiness - 5),
                loyalty: Math.max(0, population.loyalty - 3),
                health: Math.max(0, population.health - 8),
                growthProgress: 0
              },
              pressures: {
                ...settlement.pressures,
                food: Math.min(100, settlement.pressures.food + shortage * 5)
              }
            }
          }
        };
        this.eventWriter.emit(tick, "starvation", { settlementId: settlement.id, deaths, shortage });
        continue;
      }

      const foodAfterConsumption = settlement.localFood - foodRequired;
      const surplus = Math.max(0, foodAfterConsumption - 20);
      const accumulatedGrowth = population.growthProgress + surplus;
      const potentialBirths = Math.floor(accumulatedGrowth / 80);
      const births = Math.max(0, Math.min(potentialBirths, citizenCapacity - population.citizens));
      const nextGrowthProgress = births > 0 ? accumulatedGrowth % 80 : Math.min(79, accumulatedGrowth);
      this.state = {
        ...this.state,
        settlements: {
          ...this.state.settlements,
          [settlement.id]: {
            ...settlement,
            localFood: foodAfterConsumption,
            population: {
              ...population,
              citizens: population.citizens + births,
              health: Math.min(100, population.health + 1),
              growthProgress: nextGrowthProgress
            },
            pressures: {
              ...settlement.pressures,
              food: Math.max(0, settlement.pressures.food - Math.min(5, Math.floor(surplus / 10)))
            }
          }
        }
      };
      if (births > 0) {
        this.eventWriter.emit(tick, "population-grown", { settlementId: settlement.id, births });
      }
    }
  }

  private updateSickness(tick: number): void {
    for (const settlement of Object.values(this.state.settlements).sort((left, right) =>
      left.id.localeCompare(right.id)
    )) {
      const population = settlement.population;
      const totalPopulation = population.citizens + population.captives;
      const startsOutbreak =
        (settlement.plagueTicks ?? 0) === 0 &&
        totalPopulation >= 12 &&
        population.health <= 35 &&
        settlement.pressures.food >= 30;
      const plagueTicks = settlement.plagueTicks ?? 0;
      if (!startsOutbreak && plagueTicks === 0) {
        continue;
      }

      const activeTicks = startsOutbreak ? 3 : plagueTicks;
      const nextPlagueTicks = Math.max(0, activeTicks - 1);
      const deaths = Math.min(population.citizens, Math.max(1, Math.floor(totalPopulation / 24)));
      const nextPopulation = {
        ...population,
        citizens: population.citizens - deaths,
        militarizedCitizens: Math.min(population.militarizedCitizens, population.citizens - deaths),
        health: Math.max(0, population.health - 4),
        happiness: Math.max(0, population.happiness - 4),
        loyalty: Math.max(0, population.loyalty - 2)
      };
      this.state = {
        ...this.state,
        settlements: {
          ...this.state.settlements,
          [settlement.id]: { ...settlement, plagueTicks: nextPlagueTicks, population: nextPopulation }
        }
      };

      if (startsOutbreak) {
        this.eventWriter.emit(tick, "plague-started", { settlementId: settlement.id, plagueTicks: 3 });
      }
      this.eventWriter.emit(tick, "plague-spread", {
        settlementId: settlement.id,
        deaths,
        plagueTicks: nextPlagueTicks
      });
      if (nextPlagueTicks === 0) {
        this.eventWriter.emit(tick, "plague-ended", { settlementId: settlement.id });
      }
    }
  }

  private getCitizenCapacity(settlementId: string): number {
    const settlement = this.state.settlements[settlementId];
    if (!settlement) {
      return 0;
    }
    return settlement.buildingIds.reduce((capacity, buildingId) => {
      const building = this.state.buildings[buildingId];
      if (!building?.complete) {
        return capacity;
      }
      if (building.kind === "castle") {
        return capacity + 24;
      }
      return capacity + (building.kind === "villa" ? 12 : 0);
    }, 0);
  }

  private updateReligion(tick: number): void {
    const nextSettlements: WorldState["settlements"] = { ...this.state.settlements };

    for (const settlement of Object.values(this.state.settlements).sort((left, right) =>
      left.id.localeCompare(right.id)
    )) {
      const castle = this.state.buildings[settlement.centralBuildingId];
      if (!castle) {
        continue;
      }
      const pressureSources = Object.values(this.state.empires)
        .filter((empire) => empire.id !== settlement.ownerEmpireId)
        .reduce(
          (totals, rivalEmpire) => {
            const rivalCastles = Object.values(this.state.settlements)
              .filter((other) => other.ownerEmpireId === rivalEmpire.id)
              .map((other) => this.state.buildings[other.centralBuildingId])
              .filter((otherCastle): otherCastle is BuildingState => Boolean(otherCastle));
            return {
              castle:
                totals.castle +
                rivalCastles.reduce(
                  (total, otherCastle) => total + Math.max(0, Math.floor(36 - distance(castle.position, otherCastle.position) / 18)),
                  0
                ),
              roads:
                totals.roads +
                rivalCastles.reduce(
                  (total, otherCastle) =>
                    total + this.getRoadReligiousPressure(rivalEmpire.id, otherCastle.position, castle.position),
                  0
                ),
              caravans:
                totals.caravans + this.getCaravanReligiousPressure(rivalEmpire.id, castle.position),
              outposts: totals.outposts + this.getOutpostReligiousPressure(rivalEmpire.id, castle.position)
            };
          },
          { castle: 0, roads: 0, caravans: 0, outposts: 0 }
        );
      const rawExternalPressure = Math.min(
        100,
        pressureSources.castle + pressureSources.roads + pressureSources.caravans + pressureSources.outposts
      );
      const wardPressure = Math.min(18, settlement.religiousWardTicks * 6);
      const externalPressure = Math.max(0, rawExternalPressure - wardPressure);
      const garrisonStrength = Object.values(this.state.battalions)
        .filter(
          (battalion) =>
            battalion.ownerEmpireId === settlement.ownerEmpireId && battalion.settlementId === settlement.id
        )
        .reduce((total, battalion) => total + battalion.size, 0);
      const totalPopulation = settlement.population.citizens + settlement.population.captives;
      const captiveRatio = totalPopulation === 0 ? 0 : (settlement.population.captives / totalPopulation) * 100;
      const captiveCapacity = this.getCaptiveCapacity(settlement.id);
      const overcrowding = Math.max(0, settlement.population.captives - captiveCapacity);
      const moralBurden = this.getMoralBurden(this.state.empires[settlement.ownerEmpireId]);
      const rebellionPressure = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            captiveRatio +
              externalPressure -
              settlement.internalFaith * 0.3 -
              settlement.population.loyalty * 0.25 -
              garrisonStrength * 1.5 +
              overcrowding * 4 +
              moralBurden
          )
        )
      );
      const religiousPressure = Math.max(0, externalPressure - settlement.internalFaith);
      const nextSettlement = {
        ...settlement,
        externalReligiousPressure: externalPressure,
        religiousWardTicks: Math.max(0, settlement.religiousWardTicks - 1),
        pressures: {
          ...settlement.pressures,
          rebellion: rebellionPressure,
          religion: religiousPressure,
          housing: overcrowding
        }
      };
      nextSettlements[settlement.id] = nextSettlement;
      if (externalPressure !== settlement.externalReligiousPressure) {
        this.eventWriter.emit(tick, "religious-pressure-changed", {
          settlementId: settlement.id,
          externalPressure,
          castlePressure: pressureSources.castle,
          roadPressure: pressureSources.roads,
          caravanPressure: pressureSources.caravans,
          outpostPressure: pressureSources.outposts,
          moralBurden,
          wardPressure,
          rebellionPressure
        });
      }
    }

    this.state = { ...this.state, settlements: nextSettlements };
  }

  private getRoadReligiousPressure(empireId: string, source: Position, target: Position): number {
    const routeLength = distance(source, target);
    if (routeLength < 80) {
      return 0;
    }
    const routeSegments = Object.values(this.state.buildings).filter(
      (building) =>
        building.ownerEmpireId === empireId &&
        building.kind === "road" &&
        building.complete &&
        distanceToSegment(building.position, source, target) <= 48
    ).length;
    const requiredSegments = Math.max(1, Math.ceil(routeLength / 96));
    return Math.min(12, Math.floor((routeSegments / requiredSegments) * 12));
  }

  private getCaravanReligiousPressure(empireId: string, target: Position): number {
    const influence = Object.values(this.state.caravans)
      .filter((caravan) => caravan.ownerEmpireId === empireId)
      .reduce(
        (total, caravan) => total + Math.max(0, Math.floor(12 - distance(caravan.position, target) / 20)),
        0
      );
    return Math.min(12, influence);
  }

  private getOutpostReligiousPressure(empireId: string, target: Position): number {
    const influence = Object.values(this.state.buildings)
      .filter(
        (building) =>
          building.ownerEmpireId === empireId && building.kind === "outpost" && building.complete
      )
      .reduce(
        (total, outpost) => total + Math.max(0, Math.floor(14 - distance(outpost.position, target) / 18)),
        0
      );
    return Math.min(18, influence);
  }

  private getMoralBurden(empire: WorldState["empires"][string] | undefined): number {
    const memory = empire?.moralMemory;
    if (!memory) {
      return 0;
    }
    return Math.max(0, Math.floor((memory.captivesTaken - memory.captivesIntegrated - memory.captivesReleased * 2) / 4));
  }

  private moatMovementMultiplier(ownerEmpireId: string, position: Position): number {
    const isCrossingEnemyMoat = Object.values(this.state.buildings).some(
      (building) =>
        building.ownerEmpireId !== ownerEmpireId &&
        building.kind === "moat" &&
        building.complete &&
        distance(building.position, position) <= 62
    );
    return isCrossingEnemyMoat ? 0.5 : 1;
  }

  private fortificationMovementMultiplier(ownerEmpireId: string, position: Position): number {
    const obstacles = Object.values(this.state.buildings)
      .filter(
        (building) =>
          building.ownerEmpireId !== ownerEmpireId &&
          building.complete &&
          (building.kind === "wall" || building.kind === "gate") &&
          distance(building.position, position) <= 38
      )
      .map((building) => (building.kind === "gate" ? 0.55 : 0.25));
    return obstacles.length === 0 ? 1 : Math.min(...obstacles);
  }

  private updateCaptives(tick: number): void {
    for (const settlement of Object.values(this.state.settlements).sort((left, right) =>
      left.id.localeCompare(right.id)
    )) {
      const captives = settlement.population.captives;
      if (captives === 0) {
        continue;
      }
      const capacity = this.getCaptiveCapacity(settlement.id);
      const overflow = Math.max(0, captives - capacity);
      const escapeCount =
        overflow > 0
          ? overflow
          : settlement.pressures.rebellion >= 70
            ? Math.max(1, Math.floor((captives * (settlement.pressures.rebellion - 65)) / 100))
            : 0;
      if (escapeCount === 0) {
        continue;
      }
      const nextCaptives = Math.max(0, captives - escapeCount);
      this.state = {
        ...this.state,
        settlements: {
          ...this.state.settlements,
          [settlement.id]: {
            ...settlement,
            population: {
              ...settlement.population,
              captives: nextCaptives,
              loyalty: Math.max(0, settlement.population.loyalty - (overflow > 0 ? 2 : 1))
            }
          }
        }
      };
      this.eventWriter.emit(tick, overflow > 0 ? "captives-liberated" : "captive-escape", {
        settlementId: settlement.id,
        count: escapeCount,
        reason: overflow > 0 ? "hovel-capacity" : "rebellion"
      });
    }
  }

  private updateSettlementDefections(tick: number): void {
    for (const settlement of Object.values(this.state.settlements).sort((left, right) =>
      left.id.localeCompare(right.id)
    )) {
      const hasLocalFieldDefense = Object.values(this.state.battalions).some(
        (battalion) => battalion.ownerEmpireId === settlement.ownerEmpireId && battalion.settlementId === settlement.id
      );
      const qualifiesForDefection =
        settlement.pressures.rebellion >= 85 &&
        settlement.externalReligiousPressure >= 30 &&
        settlement.population.loyalty <= 30 &&
        !hasLocalFieldDefense;
      if (!qualifiesForDefection) {
        continue;
      }

      const castle = this.state.buildings[settlement.centralBuildingId];
      const receivingEmpire = castle
        ? Object.values(this.state.empires)
            .filter((empire) => empire.id !== settlement.ownerEmpireId)
            .map((empire) => ({
              empire,
              distanceToSettlement: this.distanceFromNearestEmpireCastle(empire.id, castle.position)
            }))
            .filter(({ distanceToSettlement }) => Number.isFinite(distanceToSettlement))
            .sort(
              (left, right) =>
                left.distanceToSettlement - right.distanceToSettlement ||
                left.empire.id.localeCompare(right.empire.id)
            )[0]?.empire
        : undefined;
      if (receivingEmpire) {
        this.transferSettlement(settlement.id, receivingEmpire.id, tick, "defected");
      }
    }
  }

  private distanceFromNearestEmpireCastle(empireId: string, target: Position): number {
    const distances = Object.values(this.state.settlements)
      .filter((settlement) => settlement.ownerEmpireId === empireId)
      .map((settlement) => this.state.buildings[settlement.centralBuildingId])
      .filter((castle): castle is BuildingState => Boolean(castle))
      .map((castle) => distance(castle.position, target));

    return distances.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...distances);
  }

  private getCaptiveCapacity(settlementId: string): number {
    const settlement = this.state.settlements[settlementId];
    if (!settlement) {
      return 0;
    }
    return settlement.buildingIds.reduce((capacity, buildingId) => {
      const building = this.state.buildings[buildingId];
      return capacity + (building?.kind === "hovel" && building.complete ? 12 : 0);
    }, 0);
  }

  private updateFaith(tick: number): void {
    for (const settlement of Object.values(this.state.settlements).sort((a, b) =>
      a.id.localeCompare(b.id)
    )) {
      const empire = this.state.empires[settlement.ownerEmpireId];
      const militaryFaith = Math.floor(
        Object.values(this.state.battalions)
          .filter(
            (battalion) =>
              battalion.ownerEmpireId === settlement.ownerEmpireId && battalion.settlementId === settlement.id
          )
          .reduce(
            (total, battalion) =>
              total + (battalion.size * (battalion.morale + battalion.devotion)) / 200,
            0
          ) / 5
      );
      const citizenFaith = Math.floor(
        (settlement.population.citizens *
          (settlement.population.happiness +
            settlement.population.loyalty +
            settlement.population.devotion)) /
          1800
      );
      const generatedFaith = Math.max(
        0,
        citizenFaith +
          militaryFaith +
          Math.floor(settlement.internalFaith / 50) -
          Math.floor(settlement.externalReligiousPressure / 50)
      );

      if (generatedFaith <= 0) {
        continue;
      }

      this.state = {
        ...this.state,
        empires: {
          ...this.state.empires,
          [empire.id]: {
            ...empire,
            resources: {
              ...empire.resources,
              faith: empire.resources.faith + generatedFaith
            }
          }
        }
      };

      this.eventWriter.emit(tick, "faith-produced", {
        settlementId: settlement.id,
        amount: generatedFaith,
        citizenFaith,
        militaryFaith,
        internalFaith: Math.floor(settlement.internalFaith / 50),
        externalPressurePenalty: Math.floor(settlement.externalReligiousPressure / 50)
      });
    }
  }

  private updateBattalionMovement(tick: number): void {
    const updatedBattalions: Record<string, BattalionState> = {};

    for (const battalion of Object.values(this.state.battalions).sort((a, b) =>
      a.id.localeCompare(b.id)
    )) {
      if (battalion.embarkedInCaravanId) {
        const caravan = this.state.caravans[battalion.embarkedInCaravanId];
        updatedBattalions[battalion.id] = caravan
          ? { ...battalion, position: caravan.position, destination: undefined }
          : { ...battalion, embarkedInCaravanId: undefined, destination: undefined };
        continue;
      }

      if (battalion.garrisonedInBuildingId) {
        const building = this.state.buildings[battalion.garrisonedInBuildingId];
        updatedBattalions[battalion.id] = building
          ? { ...battalion, position: building.position, destination: undefined }
          : { ...battalion, garrisonedInBuildingId: undefined, destination: undefined };
        continue;
      }

      if (!battalion.destination) {
        updatedBattalions[battalion.id] = battalion;
        continue;
      }

      const terrain = terrainAtPosition(this.state, battalion.position);
      const moatMultiplier = this.moatMovementMultiplier(battalion.ownerEmpireId, battalion.position);
      const fortificationMultiplier = this.fortificationMovementMultiplier(battalion.ownerEmpireId, battalion.position);
      const speed =
        battalion.speed * this.getBattalionTerrainMovementMultiplier(battalion, terrain) * this.roadMovementMultiplier(battalion) * moatMultiplier * fortificationMultiplier;
      if (speed === 0) {
        updatedBattalions[battalion.id] = battalion;
        continue;
      }

      const nextPosition = moveToward(battalion.position, battalion.destination, speed);
      const arrived = distance(nextPosition, battalion.destination) < 1;
      updatedBattalions[battalion.id] = {
        ...battalion,
        position: nextPosition,
        destination: arrived ? undefined : battalion.destination
      };

      this.eventWriter.emit(tick, "battalion-moved", {
        battalionId: battalion.id,
        x: Math.round(nextPosition.x),
        y: Math.round(nextPosition.y),
        moatMultiplier,
        fortificationMultiplier
      });
    }

    this.state = {
      ...this.state,
      battalions: updatedBattalions
    };
  }

  private updateCaravanMovement(tick: number): void {
    const nextCaravans: Record<string, CaravanState> = {};
    for (const caravan of Object.values(this.state.caravans).sort((left, right) =>
      left.id.localeCompare(right.id)
    )) {
      if (!caravan.destination) {
        nextCaravans[caravan.id] = caravan;
        continue;
      }
      const terrain = terrainAtPosition(this.state, caravan.position);
      const moatMultiplier = this.moatMovementMultiplier(caravan.ownerEmpireId, caravan.position);
      const fortificationMultiplier = this.fortificationMovementMultiplier(caravan.ownerEmpireId, caravan.position);
      const speed =
        caravan.speed * terrainMovementMultiplier(terrain) * this.roadMovementMultiplier(caravan) * moatMultiplier * fortificationMultiplier;
      if (speed === 0) {
        nextCaravans[caravan.id] = caravan;
        continue;
      }
      const nextPosition = moveToward(caravan.position, caravan.destination, speed);
      const arrived = distance(nextPosition, caravan.destination) < 1;
      nextCaravans[caravan.id] = {
        ...caravan,
        position: nextPosition,
        destination: arrived ? undefined : caravan.destination
      };
      this.eventWriter.emit(tick, "caravan-moved", {
        caravanId: caravan.id,
        x: Math.round(nextPosition.x),
        y: Math.round(nextPosition.y),
        moatMultiplier,
        fortificationMultiplier
      });
    }
    const nextBattalions: Record<string, BattalionState> = { ...this.state.battalions };
    for (const caravan of Object.values(nextCaravans)) {
      for (const battalionId of caravan.passengerBattalionIds) {
        const battalion = nextBattalions[battalionId];
        if (battalion?.embarkedInCaravanId === caravan.id) {
          nextBattalions[battalion.id] = {
            ...battalion,
            position: caravan.position,
            destination: undefined
          };
        }
      }
    }
    this.state = { ...this.state, caravans: nextCaravans, battalions: nextBattalions };
  }

  private updateCaravanDeliveries(tick: number): void {
    let caravans = this.state.caravans;
    let battalions = this.state.battalions;
    for (const caravan of Object.values(caravans).sort((left, right) => left.id.localeCompare(right.id))) {
      if (caravan.cargoFood === 0) {
        continue;
      }
      const recipient = Object.values(battalions)
        .filter(
          (battalion) =>
            battalion.ownerEmpireId === caravan.ownerEmpireId &&
            battalion.supply < 100 &&
            distance(battalion.position, caravan.position) <= 72
        )
        .sort((left, right) => left.supply - right.supply || left.id.localeCompare(right.id))[0];
      if (!recipient) {
        continue;
      }
      const foodUsed = Math.min(caravan.cargoFood, Math.ceil((100 - recipient.supply) / 2));
      const supplyRestored = Math.min(100 - recipient.supply, foodUsed * 2);
      caravans = {
        ...caravans,
        [caravan.id]: { ...caravan, cargoFood: caravan.cargoFood - foodUsed }
      };
      battalions = {
        ...battalions,
        [recipient.id]: { ...recipient, supply: recipient.supply + supplyRestored }
      };
      this.eventWriter.emit(tick, "supply-delivered", {
        caravanId: caravan.id,
        battalionId: recipient.id,
        foodUsed,
        supplyRestored
      });
    }
    this.state = { ...this.state, caravans, battalions };
  }

  private getCaravanUsedCapacity(caravan: CaravanState): number {
    return (
      caravan.cargoFood +
      caravan.passengerBattalionIds.reduce(
        (used, battalionId) => used + (this.state.battalions[battalionId]?.size ?? 0),
        0
      )
    );
  }

  private getWaterLaunchPoint(settlementId: string): Position | undefined {
    const settlement = this.state.settlements[settlementId];
    const castle = settlement ? this.state.buildings[settlement.centralBuildingId] : undefined;
    if (!castle) {
      return undefined;
    }
    return this.state.terrainZones
      .filter((zone) => zone.kind === "water")
      .map((zone) => ({ x: zone.bounds.x + zone.bounds.width / 2, y: zone.bounds.y + zone.bounds.height / 2 }))
      .sort((left, right) => distance(left, castle.position) - distance(right, castle.position))[0];
  }

  private roadMovementMultiplier(unit: BattalionState | CaravanState): number {
    const onRoad = Object.values(this.state.buildings).some(
      (building) =>
        building.ownerEmpireId === unit.ownerEmpireId &&
        building.kind === "road" &&
        building.complete &&
        distance(building.position, unit.position) <= 28
    );
    return onRoad ? 1.3 : 1;
  }

  private getBattalionTerrainMovementMultiplier(
    battalion: BattalionState,
    terrain: ReturnType<typeof terrainAtPosition>
  ): number {
    const traits = getBattalionTraits(battalion.battlefieldTraining);
    if (terrain === "forest" && traits.includes("Forest Veterans")) return 0.88;
    if (terrain === "hills" && traits.includes("Hill Fighters")) return 0.84;
    if (terrain === "marsh" && traits.includes("Marsh Runners")) return 0.72;
    return terrainMovementMultiplier(terrain);
  }

  private updateBattalionSupply(tick: number): void {
    const nextBattalions: Record<string, BattalionState> = {};
    for (const battalion of Object.values(this.state.battalions).sort((left, right) =>
      left.id.localeCompare(right.id)
    )) {
      const homeSettlement = this.state.settlements[battalion.settlementId];
      const supplied = Object.values(this.state.buildings).some(
        (building) =>
          building.ownerEmpireId === battalion.ownerEmpireId &&
          building.complete &&
          (building.kind === "castle" || building.kind === "outpost" || building.kind === "road") &&
          distance(building.position, battalion.position) <= (building.kind === "road" ? 64 : 120)
      );
      const nextSupply = Math.max(0, Math.min(100, battalion.supply + (supplied ? 5 : -2)));
      const moraleLoss = Math.max(0, 2 - Math.floor((battalion.experience ?? 0) / 50));
      const civicRecovery = this.getCivicMoraleRecovery(homeSettlement, battalion, nextSupply, tick);
      const nextMorale =
        nextSupply === 0
          ? Math.max(0, battalion.morale - moraleLoss)
          : Math.min(100, battalion.morale + civicRecovery);
      nextBattalions[battalion.id] = {
        ...battalion,
        supply: nextSupply,
        morale: nextMorale
      };
      if (nextSupply !== battalion.supply) {
        this.eventWriter.emit(tick, "supply-changed", {
          battalionId: battalion.id,
          supply: nextSupply,
          supplied,
          moraleLoss
        });
      }
      if (civicRecovery > 0 && homeSettlement) {
        this.eventWriter.emit(tick, "morale-recovered", {
          battalionId: battalion.id,
          settlementId: homeSettlement.id,
          moraleRecovered: civicRecovery,
          reason: "peace-housing-religion"
        });
      }
    }
    this.state = { ...this.state, battalions: nextBattalions };
  }

  private getCivicMoraleRecovery(
    settlement: WorldState["settlements"][string] | undefined,
    battalion: BattalionState,
    supply: number,
    tick: number
  ): number {
    if (!settlement || supply === 0 || tick % 3 !== 0) {
      return 0;
    }
    const castle = this.state.buildings[settlement.centralBuildingId];
    const enemyNearHome =
      castle &&
      Object.values(this.state.battalions).some(
        (enemy) =>
          enemy.ownerEmpireId !== battalion.ownerEmpireId &&
          isPositionVisibleToEmpire(this.state, battalion.ownerEmpireId, enemy.position) &&
          distance(enemy.position, castle.position) <= 240
      );
    const hasHousing = settlement.population.citizens <= this.getCitizenCapacity(settlement.id);
    const hasCivicConfidence =
      settlement.population.happiness >= 75 &&
      settlement.population.loyalty >= 75 &&
      settlement.internalFaith >= settlement.externalReligiousPressure;

    return !enemyNearHome && hasHousing && hasCivicConfidence ? 1 : 0;
  }

  private updateShipCombat(tick: number): void {
    let caravans: Record<string, CaravanState> = { ...this.state.caravans };
    const destroyed: CaravanState[] = [];
    for (const candidate of Object.values(caravans).sort((left, right) => left.id.localeCompare(right.id))) {
      const ship = caravans[candidate.id];
      if (!ship || ship.kind !== "ship" || !ship.targetId) {
        continue;
      }
      const target = caravans[ship.targetId];
      if (!target || target.ownerEmpireId === ship.ownerEmpireId) {
        caravans = { ...caravans, [ship.id]: { ...ship, targetId: undefined } };
        continue;
      }
      if ((ship.attackCooldownRemaining ?? 0) > 0) {
        caravans = {
          ...caravans,
          [ship.id]: { ...ship, attackCooldownRemaining: (ship.attackCooldownRemaining ?? 0) - 1 }
        };
        continue;
      }
      if (distance(ship.position, target.position) > 150) {
        continue;
      }
      const damage = 22;
      const nextDefense = Math.max(0, target.defense - damage);
      if (nextDefense === 0) {
        const { [target.id]: _destroyed, ...remaining } = caravans;
        caravans = remaining;
        destroyed.push(target);
        this.eventWriter.emit(tick, "entity-destroyed", { entityId: target.id, reason: "ship-fire" });
        this.eventWriter.emit(tick, "caravan-destroyed", { caravanId: target.id, cargoFoodLost: target.cargoFood, reason: "ship-fire" });
      } else {
        caravans = { ...caravans, [target.id]: { ...target, defense: nextDefense } };
      }
      const survivingShip = caravans[ship.id];
      if (survivingShip) {
        caravans = { ...caravans, [ship.id]: { ...survivingShip, attackCooldownRemaining: 2 } };
      }
      this.eventWriter.emit(tick, "ship-fired", { shipId: ship.id, targetId: target.id, damage });
    }
    this.state = { ...this.state, caravans };
    this.removeDestroyedCaravans(destroyed.map((caravan) => caravan.id));
    this.ejectPassengersFromDestroyedCaravans(destroyed, tick);
  }

  private updateCombat(tick: number): void {
    let buildings = this.state.buildings;
    let battalions = this.state.battalions;
    let caravans = this.state.caravans;
    const capturedCastleIds: Array<{ readonly castleId: string; readonly attackerId: string }> = [];
    const defeatedBattalions: Array<{ readonly attackerId: string; readonly defender: BattalionState }> = [];
    const destroyedBuildingIds: string[] = [];
    const destroyedCaravans: CaravanState[] = [];

    for (const candidate of Object.values(battalions).sort((a, b) => a.id.localeCompare(b.id))) {
      const battalion = battalions[candidate.id];
      if (!battalion) {
        continue;
      }
      if (battalion.embarkedInCaravanId && caravans[battalion.embarkedInCaravanId]?.kind === "ship") {
        continue;
      }
      if (!battalion.targetId) {
        continue;
      }

      if (battalion.attackCooldownRemaining > 0) {
        battalions = {
          ...battalions,
          [battalion.id]: {
            ...battalion,
            attackCooldownRemaining: battalion.attackCooldownRemaining - 1
          }
        };
        continue;
      }

      const targetBattalion = battalions[battalion.targetId];
      const targetBuilding = buildings[battalion.targetId];
      const targetCaravan = caravans[battalion.targetId];
      if (!targetBattalion && !targetBuilding && !targetCaravan) {
        battalions = {
          ...battalions,
          [battalion.id]: { ...battalion, targetId: undefined }
        };
        continue;
      }

      const target = targetBattalion ?? targetBuilding ?? targetCaravan;
      if (distance(battalion.position, target.position) > battalion.range) {
        continue;
      }

      const defenderTerrain = terrainAtPosition(this.state, target.position);
      const specializationMultiplier = targetBattalion
        ? getSpecializationAdvantage(battalion.specialization, targetBattalion.specialization)
        : 1;
      const supplyMultiplier = battalion.supply === 0 ? 0.65 : 0.8 + battalion.supply / 500;
      const traits = getBattalionTraits(battalion.battlefieldTraining);
      const siegeMultiplier = targetBuilding && traits.includes("Siege Specialists") ? 1.18 : 1;
      const damage = Math.max(
        1,
        Math.floor(
          (battalion.attack *
            (battalion.morale / 100) *
            specializationMultiplier *
            supplyMultiplier *
            siegeMultiplier) /
          terrainDefenseMultiplier(defenderTerrain)
        )
      );
      let experienceGain = 1;

      if (targetBattalion) {
        const nextDefense = Math.max(0, targetBattalion.defense - damage);
        if (nextDefense === 0) {
          const { [targetBattalion.id]: _destroyed, ...remainingBattalions } = battalions;
          battalions = remainingBattalions;
          defeatedBattalions.push({ attackerId: battalion.id, defender: targetBattalion });
          experienceGain = 12;
          this.eventWriter.emit(tick, "entity-destroyed", { entityId: targetBattalion.id });
        } else {
          battalions = {
            ...battalions,
            [targetBattalion.id]: { ...targetBattalion, defense: nextDefense }
          };
        }
      } else if (targetBuilding) {
        const nextDefense = Math.max(0, targetBuilding.defense - damage);
        buildings = {
          ...buildings,
          [targetBuilding.id]: { ...targetBuilding, defense: nextDefense }
        };
        if (nextDefense === 0) {
          this.eventWriter.emit(tick, "entity-destroyed", { entityId: targetBuilding.id });
          if (targetBuilding.kind === "castle" && targetBuilding.ownerEmpireId !== battalion.ownerEmpireId) {
            capturedCastleIds.push({ castleId: targetBuilding.id, attackerId: battalion.id });
          } else {
            destroyedBuildingIds.push(targetBuilding.id);
          }
        }
      } else if (targetCaravan) {
        const nextDefense = Math.max(0, targetCaravan.defense - damage);
        if (nextDefense === 0) {
          const { [targetCaravan.id]: _destroyed, ...remainingCaravans } = caravans;
          caravans = remainingCaravans;
          destroyedCaravans.push(targetCaravan);
          this.eventWriter.emit(tick, "entity-destroyed", { entityId: targetCaravan.id });
          this.eventWriter.emit(tick, "caravan-destroyed", {
            caravanId: targetCaravan.id,
            cargoFoodLost: targetCaravan.cargoFood
          });
        } else {
          caravans = {
            ...caravans,
            [targetCaravan.id]: { ...targetCaravan, defense: nextDefense }
          };
        }
      }

      const attackingBattalion = battalions[battalion.id];
      if (attackingBattalion) {
        const previousExperience = attackingBattalion.experience ?? 0;
        const experience = Math.min(100, previousExperience + experienceGain);
        const trainingKey = targetBuilding ? "siege" : defenderTerrain === "forest" || defenderTerrain === "hills" || defenderTerrain === "marsh" ? defenderTerrain : undefined;
        const previousTraining = attackingBattalion.battlefieldTraining ?? {};
        const battlefieldTraining = trainingKey
          ? { ...previousTraining, [trainingKey]: Math.min(10, (previousTraining[trainingKey] ?? 0) + 1) }
          : previousTraining;
        const newlyLearned = getBattalionTraits(battlefieldTraining).filter(
          (trait) => !getBattalionTraits(previousTraining).includes(trait)
        );
        battalions = {
          ...battalions,
          [battalion.id]: {
            ...attackingBattalion,
            attackCooldownRemaining: battalion.attackCooldownTicks,
            experience,
            battlefieldTraining
          }
        };
        this.eventWriter.emit(tick, "battalion-experienced", {
          battalionId: battalion.id,
          gained: experience - previousExperience,
          experience
        });
        for (const trait of newlyLearned) {
          this.eventWriter.emit(tick, "battalion-trained", { battalionId: battalion.id, trait });
        }
      }

      this.eventWriter.emit(tick, "damage-dealt", {
        attackerId: battalion.id,
        targetId: target.id,
        damage,
        specialization: battalion.specialization
      });
    }

    this.state = {
      ...this.state,
      buildings,
      battalions,
      caravans
    };

    const breachedBuildingIds = [
      ...destroyedBuildingIds,
      ...capturedCastleIds.map((capture) => capture.castleId)
    ];
    this.destroyGarrisonsInBreachedStructures(breachedBuildingIds, tick);
    this.removeDestroyedBuildings(destroyedBuildingIds, tick);
    this.removeDestroyedCaravans(destroyedCaravans.map((caravan) => caravan.id));
    this.ejectPassengersFromDestroyedCaravans(destroyedCaravans, tick);
    for (const defeated of defeatedBattalions) {
      const attacker = this.state.battalions[defeated.attackerId];
      if (attacker) {
        this.applyBattleMoraleOutcome(attacker, defeated.defender, tick);
        this.captureDefeatedBattalion(attacker, defeated.defender, tick);
      }
    }

    for (const capture of capturedCastleIds) {
      const attacker = this.state.battalions[capture.attackerId];
      if (attacker) {
        this.captureSettlement(attacker, capture.castleId, tick);
      }
    }
  }

  private isGarrisonable(kind: BuildingState["kind"]): boolean {
    return kind === "castle" || kind === "wall" || kind === "gate" || kind === "outpost";
  }

  private getGarrisonCapacity(kind: BuildingState["kind"]): number {
    switch (kind) {
      case "castle":
        return 2;
      case "wall":
      case "gate":
      case "outpost":
        return 1;
      default:
        return 0;
    }
  }

  private destroyGarrisonsInBreachedStructures(buildingIds: string[], tick: number): void {
    const breached = new Set(buildingIds);
    if (breached.size === 0) {
      return;
    }
    const garrisonedBattalionIds = new Set<string>();
    const nextBuildings: Record<string, BuildingState> = { ...this.state.buildings };
    for (const buildingId of breached) {
      const building = nextBuildings[buildingId];
      if (!building) {
        continue;
      }
      for (const battalionId of building.garrisonBattalionIds ?? []) {
        garrisonedBattalionIds.add(battalionId);
      }
      nextBuildings[buildingId] = { ...building, garrisonBattalionIds: [] };
    }
    if (garrisonedBattalionIds.size === 0) {
      this.state = { ...this.state, buildings: nextBuildings };
      return;
    }
    const nextBattalions = Object.fromEntries(
      Object.entries(this.state.battalions).filter(([id]) => !garrisonedBattalionIds.has(id))
    ) as Record<string, BattalionState>;
    const nextSettlements = Object.fromEntries(
      Object.entries(this.state.settlements).map(([id, settlement]) => [
        id,
        {
          ...settlement,
          battalionIds: settlement.battalionIds.filter((battalionId) => !garrisonedBattalionIds.has(battalionId)),
          population: {
            ...settlement.population,
            militarizedCitizens: Math.max(
              0,
              settlement.population.militarizedCitizens -
                Object.values(this.state.battalions)
                  .filter((battalion) =>
                    battalion.settlementId === settlement.id &&
                    battalion.specialization !== "hounds" &&
                    garrisonedBattalionIds.has(battalion.id)
                  )
                  .reduce((total, battalion) => total + battalion.size, 0)
            )
          }
        }
      ])
    ) as WorldState["settlements"];
    this.state = {
      ...this.state,
      buildings: nextBuildings,
      battalions: nextBattalions,
      settlements: nextSettlements
    };
    for (const battalionId of [...garrisonedBattalionIds].sort()) {
      this.eventWriter.emit(tick, "entity-destroyed", { entityId: battalionId, reason: "garrison-breached" });
    }
  }

  private removeDestroyedBuildings(buildingIds: string[], tick: number): void {
    if (buildingIds.length === 0) {
      return;
    }
    const destroyed = new Set(buildingIds);
    const destroyedVillasBySettlement = Object.values(this.state.buildings)
      .filter((building) => destroyed.has(building.id) && building.kind === "villa")
      .reduce<Record<string, number>>(
        (totals, villa) => ({ ...totals, [villa.settlementId]: (totals[villa.settlementId] ?? 0) + 1 }),
        {}
      );
    const civilianDeathsBySettlement = Object.fromEntries(
      Object.entries(destroyedVillasBySettlement).map(([settlementId, villasDestroyed]) => [
        settlementId,
        Math.min(this.state.settlements[settlementId]?.population.citizens ?? 0, villasDestroyed * 2)
      ])
    ) as Record<string, number>;
    const nextBuildings: Record<string, BuildingState> = { ...this.state.buildings };
    for (const id of destroyed) {
      delete nextBuildings[id];
    }
    const nextSettlements = Object.fromEntries(
      Object.entries(this.state.settlements).map(([id, settlement]) => {
        const villasDestroyed = destroyedVillasBySettlement[settlement.id] ?? 0;
        const civilianDeaths = civilianDeathsBySettlement[settlement.id] ?? 0;
        return [
          id,
          {
            ...settlement,
            buildingIds: settlement.buildingIds.filter((buildingId) => !destroyed.has(buildingId)),
            population:
              civilianDeaths === 0
                ? settlement.population
                : {
                    ...settlement.population,
                    citizens: settlement.population.citizens - civilianDeaths,
                    militarizedCitizens: Math.min(
                      settlement.population.militarizedCitizens,
                      settlement.population.citizens - civilianDeaths
                    ),
                    health: Math.max(0, settlement.population.health - villasDestroyed * 6),
                    happiness: Math.max(0, settlement.population.happiness - villasDestroyed * 10),
                    loyalty: Math.max(0, settlement.population.loyalty - villasDestroyed * 6)
                  }
          }
        ];
      })
    ) as WorldState["settlements"];
    this.state = { ...this.state, buildings: nextBuildings, settlements: nextSettlements };
    for (const [settlementId, villasDestroyed] of Object.entries(destroyedVillasBySettlement).sort(([left], [right]) =>
      left.localeCompare(right)
    )) {
      const settlement = nextSettlements[settlementId];
      const civilianDeaths = civilianDeathsBySettlement[settlementId] ?? 0;
      this.eventWriter.emit(tick, "housing-destroyed", {
        settlementId,
        buildingKind: "villa",
        villasDestroyed,
        civilianDeaths,
        remainingCitizens: settlement?.population.citizens ?? 0
      });
    }
  }

  private removeDestroyedCaravans(caravanIds: string[]): void {
    if (caravanIds.length === 0) {
      return;
    }
    const destroyed = new Set(caravanIds);
    const nextSettlements = Object.fromEntries(
      Object.entries(this.state.settlements).map(([id, settlement]) => [
        id,
        {
          ...settlement,
          caravanIds: settlement.caravanIds.filter((caravanId) => !destroyed.has(caravanId))
        }
      ])
    ) as WorldState["settlements"];
    this.state = { ...this.state, settlements: nextSettlements };
  }

  private ejectPassengersFromDestroyedCaravans(caravans: CaravanState[], tick: number): void {
    if (caravans.length === 0) {
      return;
    }
    const nextBattalions: Record<string, BattalionState> = { ...this.state.battalions };
    for (const caravan of caravans) {
      for (const battalionId of caravan.passengerBattalionIds) {
        const battalion = nextBattalions[battalionId];
        if (!battalion) {
          continue;
        }
        nextBattalions[battalion.id] = {
          ...battalion,
          embarkedInCaravanId: undefined,
          position: caravan.position,
          morale: Math.max(0, battalion.morale - 20),
          supply: Math.max(0, battalion.supply - 25)
        };
        this.eventWriter.emit(tick, "battalion-disembarked", {
          battalionId: battalion.id,
          caravanId: caravan.id,
          reason: "caravan-destroyed"
        });
      }
    }
    this.state = { ...this.state, battalions: nextBattalions };
  }

  private captureDefeatedBattalion(
    attacker: BattalionState,
    defeated: BattalionState,
    tick: number
  ): void {
    const defenderSettlement = this.state.settlements[defeated.settlementId];
    const captorSettlement = this.state.settlements[attacker.settlementId];
    if (!defenderSettlement || !captorSettlement) {
      return;
    }
    const capacity = this.getCaptiveCapacity(captorSettlement.id);
    const availableHousing = Math.max(0, capacity - captorSettlement.population.captives);
    const capturedCount =
      defeated.specialization === "hounds" ? 0 : Math.min(availableHousing, Math.max(1, Math.floor(defeated.size / 2)));
    const nextDefenderSettlement = {
      ...defenderSettlement,
      battalionIds: defenderSettlement.battalionIds.filter((id) => id !== defeated.id),
      population: {
        ...defenderSettlement.population,
        militarizedCitizens: Math.max(
          0,
          defenderSettlement.population.militarizedCitizens - (defeated.specialization === "hounds" ? 0 : defeated.size)
        )
      }
    };
    const nextCaptorSettlement = {
      ...captorSettlement,
      population: {
        ...captorSettlement.population,
        captives: captorSettlement.population.captives + capturedCount
      }
    };
    this.state = {
      ...this.state,
      settlements: {
        ...this.state.settlements,
        [defenderSettlement.id]: nextDefenderSettlement,
        [captorSettlement.id]: nextCaptorSettlement
      }
    };
    if (capturedCount > 0) {
      this.eventWriter.emit(tick, "captives-taken", {
        attackerId: attacker.id,
        settlementId: captorSettlement.id,
        count: capturedCount
      });
      this.recordMoralMemory(captorSettlement.ownerEmpireId, "captivesTaken", capturedCount, tick);
    }
  }

  private applyBattleMoraleOutcome(attacker: BattalionState, defeated: BattalionState, tick: number): void {
    const nextBattalions: Record<string, BattalionState> = {};
    const victorMoraleGain = attacker.supply === 0 ? 0 : 8;
    for (const battalion of Object.values(this.state.battalions).sort((left, right) =>
      left.id.localeCompare(right.id)
    )) {
      const sharesVictoriousSettlement =
        battalion.ownerEmpireId === attacker.ownerEmpireId && battalion.settlementId === attacker.settlementId;
      const sharesDefeatedSettlement =
        battalion.ownerEmpireId === defeated.ownerEmpireId && battalion.settlementId === defeated.settlementId;
      const moraleDelta =
        battalion.id === attacker.id
          ? victorMoraleGain
          : sharesVictoriousSettlement && battalion.supply > 0
            ? 2
            : sharesDefeatedSettlement
              ? -4
              : 0;
      const devotionDelta = battalion.id === attacker.id ? 2 : sharesVictoriousSettlement ? 1 : 0;
      nextBattalions[battalion.id] =
        moraleDelta === 0 && devotionDelta === 0
          ? battalion
          : {
              ...battalion,
              morale: Math.max(0, Math.min(100, battalion.morale + moraleDelta)),
              devotion: Math.max(0, Math.min(100, battalion.devotion + devotionDelta))
            };
    }
    this.state = { ...this.state, battalions: nextBattalions };
    this.eventWriter.emit(tick, "battle-morale-shifted", {
      victorId: attacker.id,
      defeatedId: defeated.id,
      victorMoraleGain,
      alliedMoraleGain: 2,
      defenderMoraleLoss: 4
    });
  }

  private recordMoralMemory(
    empireId: string,
    field: keyof import("./state/WorldState").MoralMemory,
    count: number,
    tick: number
  ): void {
    const empire = this.state.empires[empireId];
    if (!empire || count <= 0) {
      return;
    }
    const memory = empire.moralMemory ?? { captivesTaken: 0, captivesIntegrated: 0, captivesReleased: 0 };
    const nextMemory = { ...memory, [field]: memory[field] + count };
    this.state = {
      ...this.state,
      empires: { ...this.state.empires, [empire.id]: { ...empire, moralMemory: nextMemory } }
    };
    this.eventWriter.emit(tick, "moral-memory-changed", { empireId, field, count, ...nextMemory });
  }

  private captureSettlement(attacker: BattalionState, castleId: string, tick: number): void {
    const castle = this.state.buildings[castleId];
    if (!castle || castle.kind !== "castle" || castle.ownerEmpireId === attacker.ownerEmpireId) {
      return;
    }

    this.transferSettlement(castle.settlementId, attacker.ownerEmpireId, tick, "captured");
  }

  private transferSettlement(
    settlementId: string,
    receivingEmpireId: string,
    tick: number,
    reason: "captured" | "defected"
  ): void {
    const settlement = this.state.settlements[settlementId];
    if (!settlement || settlement.ownerEmpireId === receivingEmpireId) {
      return;
    }

    const losingEmpire = this.state.empires[settlement.ownerEmpireId];
    const winningEmpire = this.state.empires[receivingEmpireId];
    if (!losingEmpire || !winningEmpire) {
      return;
    }

    const successorHeirId = `heir-${settlement.id}-${tick}`;
    const fallenHeir = this.state.heirs[settlement.heirId];
    const nextHeirs: Record<string, HeirState> = {
      ...this.state.heirs,
      [successorHeirId]: {
        id: successorHeirId,
        ownerEmpireId: winningEmpire.id,
        name: `${winningEmpire.name} Governor`,
        mode: "governance",
        alive: true,
        trust: 50,
        doctrineIds: []
      }
    };
    if (fallenHeir && reason === "captured") {
      nextHeirs[fallenHeir.id] = { ...fallenHeir, alive: false };
    }

    const nextBuildings: Record<string, BuildingState> = { ...this.state.buildings };
    for (const buildingId of settlement.buildingIds) {
      const building = nextBuildings[buildingId];
      if (!building) {
        continue;
      }
      nextBuildings[buildingId] = {
        ...building,
        ownerEmpireId: winningEmpire.id,
        defense:
          reason === "captured" && building.id === settlement.centralBuildingId
            ? getBuildingStats("castle").defense
            : Math.max(1, building.defense)
      };
    }

    const nextBattalions = Object.fromEntries(
      Object.entries(this.state.battalions).filter(
        ([, battalion]) =>
          !(battalion.settlementId === settlement.id && battalion.ownerEmpireId === losingEmpire.id)
      )
    ) as Record<string, BattalionState>;
    const losingSettlementIds = losingEmpire.settlementIds.filter((id) => id !== settlement.id);
    const winningSettlementIds = winningEmpire.settlementIds.includes(settlement.id)
      ? winningEmpire.settlementIds
      : [...winningEmpire.settlementIds, settlement.id];
    const victory =
      losingSettlementIds.length === 0
        ? { winnerEmpireId: winningEmpire.id, completedAtTick: tick }
        : this.state.victory;

    this.state = {
      ...this.state,
      victory,
      buildings: nextBuildings,
      battalions: nextBattalions,
      heirs: nextHeirs,
      empires: {
        ...this.state.empires,
        [losingEmpire.id]: { ...losingEmpire, settlementIds: losingSettlementIds },
        [winningEmpire.id]: { ...winningEmpire, settlementIds: winningSettlementIds }
      },
      settlements: {
        ...this.state.settlements,
        [settlement.id]: {
          ...settlement,
          ownerEmpireId: winningEmpire.id,
          heirId: successorHeirId,
          battalionIds: [],
          population: {
            ...settlement.population,
            militarizedCitizens: 0
          }
        }
      }
    };

    this.eventWriter.emit(tick, reason === "captured" ? "settlement-captured" : "settlement-defected", {
      settlementId: settlement.id,
      formerEmpireId: losingEmpire.id,
      newEmpireId: winningEmpire.id,
      fallenHeirId: reason === "captured" ? settlement.heirId : undefined,
      displacedHeirId: reason === "defected" ? settlement.heirId : undefined,
      successorHeirId,
      reason: reason === "defected" ? "rebellion" : undefined
    });
    if (victory.winnerEmpireId) {
      this.eventWriter.emit(tick, "victory-achieved", { winnerEmpireId: winningEmpire.id });
    }
  }

  private findTarget(targetId: string): BattalionState | BuildingState | CaravanState | undefined {
    return this.state.battalions[targetId] ?? this.state.buildings[targetId] ?? this.state.caravans[targetId];
  }
}

function distance(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToSegment(point: Position, start: Position, end: Position): number {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) {
    return distance(point, start);
  }
  const progress = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared)
  );
  return distance(point, { x: start.x + progress * deltaX, y: start.y + progress * deltaY });
}

function moveToward(from: Position, to: Position, maxDistance: number): Position {
  const totalDistance = distance(from, to);
  if (totalDistance <= maxDistance || totalDistance === 0) {
    return to;
  }

  const ratio = maxDistance / totalDistance;
  return {
    x: Math.round((from.x + (to.x - from.x) * ratio) * 100) / 100,
    y: Math.round((from.y + (to.y - from.y) * ratio) * 100) / 100
  };
}

function getBuildingStats(kind: BuildingState["kind"]): { defense: number; buildTicks: number } {
  switch (kind) {
    case "farm":
    case "road":
      return { defense: 40, buildTicks: 2 };
    case "moat":
      return { defense: 160, buildTicks: 3 };
    case "villa":
    case "lumber-mill":
    case "mine":
    case "plantation":
      return { defense: 75, buildTicks: 3 };
    case "wall":
      return { defense: 250, buildTicks: 4 };
    case "gate":
      return { defense: 200, buildTicks: 4 };
    case "outpost":
    case "military-quarters":
    case "town-square":
      return { defense: 150, buildTicks: 4 };
    case "hovel":
      return { defense: 50, buildTicks: 2 };
    case "castle":
      return { defense: 500, buildTicks: 6 };
  }
}

interface BattalionProfile {
  readonly attackPerUnit: number;
  readonly defensePerUnit: number;
  readonly range: number;
  readonly speed: number;
  readonly attackCooldownTicks: number;
  readonly foodPerUnit: number;
  readonly woodPerUnit: number;
  readonly ironPerUnit: number;
}

function getBattalionProfile(specialization: BattalionSpecialization): BattalionProfile {
  switch (specialization) {
    case "hounds":
      return {
        attackPerUnit: 1,
        defensePerUnit: 6,
        range: 24,
        speed: 68,
        attackCooldownTicks: 1,
        foodPerUnit: 2,
        woodPerUnit: 1,
        ironPerUnit: 0
      };
    case "spears":
      return {
        attackPerUnit: 2,
        defensePerUnit: 12,
        range: 42,
        speed: 38,
        attackCooldownTicks: 1,
        foodPerUnit: 1,
        woodPerUnit: 0,
        ironPerUnit: 1
      };
    case "archers":
      return {
        attackPerUnit: 2,
        defensePerUnit: 7,
        range: 120,
        speed: 38,
        attackCooldownTicks: 2,
        foodPerUnit: 1,
        woodPerUnit: 1,
        ironPerUnit: 0
      };
    case "raiders":
      return {
        attackPerUnit: 2,
        defensePerUnit: 8,
        range: 36,
        speed: 56,
        attackCooldownTicks: 1,
        foodPerUnit: 1,
        woodPerUnit: 1,
        ironPerUnit: 1
      };
    case "militia":
      return {
        attackPerUnit: 1,
        defensePerUnit: 10,
        range: 42,
        speed: 44,
        attackCooldownTicks: 1,
        foodPerUnit: 1,
        woodPerUnit: 0,
        ironPerUnit: 0
      };
  }
}

function getSpecializationAdvantage(
  attacker: BattalionSpecialization,
  defender: BattalionSpecialization
): number {
  if (
    (attacker === "spears" && defender === "raiders") ||
    (attacker === "raiders" && defender === "archers") ||
    (attacker === "archers" && defender === "spears")
  ) {
    return 1.3;
  }
  return 1;
}

function getMiracleCost(kind: "bless-harvest" | "inspire-battalion" | "divine-judgment"): number {
  if (kind === "bless-harvest") {
    return 12;
  }
  return kind === "inspire-battalion" ? 16 : 18;
}

function getDoctrineObservation(command: GameCommand, state: WorldState): DoctrineObservation | undefined {
  switch (command.type) {
    case "assign-labor": {
      const assignments = [
        ["farm", command.payload.farmers],
        ["build", command.payload.builders],
        ["lumber", command.payload.lumberjacks],
        ["mine", command.payload.miners],
        ["luxury", command.payload.luxuryWorkers ?? 0]
      ] as const;
      const [focus] = [...assignments].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      return {
        domain: "economy",
        key: `labor-${focus}`,
        condition: "Labor is available",
        preferredAction: `Prioritize ${focus} labor`,
        goal: "Sustain the settlement",
      };
    }
    case "place-building": {
      const position = command.payload.position ?? { x: 620, y: 330 };
      const terrain = terrainAtPosition(state, position);
      return {
        domain: "economy",
        key: `build-${command.payload.kind}`,
        condition: `${terrain.replace("-", " ")} terrain is available`,
        preferredAction: `Build ${command.payload.kind.replace("-", " ")}`,
        goal: "Develop the settlement"
      };
    }
    case "create-battalion":
      return {
        domain: "military",
        key: command.payload.specialization === "hounds" ? "train-hounds" : "raise-battalion",
        condition:
          command.payload.specialization === "hounds"
            ? "A Town Square can support a scout pack"
            : "Citizens can be mobilized",
        preferredAction: command.payload.specialization === "hounds" ? "Train scout hounds" : "Raise a battalion",
        goal: command.payload.specialization === "hounds" ? "Reveal hostile movements" : "Secure the settlement"
      };
    case "create-caravan":
      return {
        domain: "economy",
        key: "create-caravan",
        condition: "Food reserves and a Town Square are available",
        preferredAction: "Establish supply caravans",
        goal: "Sustain distant forces"
      };
    case "create-ship":
      return {
        domain: "military",
        key: "create-ship",
        condition: "Water access and a Town Square are available",
        preferredAction: "Launch warships",
        goal: "Control waterways"
      };
    case "move-battalion":
      return {
        domain: "military",
        key: "reposition-battalion",
        condition: "A battalion receives a destination",
        preferredAction: "Reposition battalions",
        goal: "Control the battlefield"
      };
    case "retreat-battalion":
      return {
        domain: "military",
        key: "retreat-to-crown",
        condition: "A field force is exposed",
        preferredAction: "Retreat to the Crown",
        goal: "Preserve the army"
      };
    case "move-caravan":
      return {
        domain: "economy",
        key: "reposition-caravan",
        condition: "A supply caravan receives a destination",
        preferredAction: "Route supply caravans",
        goal: "Sustain distant forces"
      };
    case "garrison-battalion":
      return {
        domain: "military",
        key: "garrison-defense-works",
        condition: "A defensive structure is within reach",
        preferredAction: "Garrison defensive works",
        goal: "Hold strategic ground"
      };
    case "attack-target":
      return {
        domain: "military",
        key: "attack-designated-target",
        condition: "An enemy target is designated",
        preferredAction: "Attack designated targets",
        goal: "Break enemy resistance"
      };
    case "attack-with-ship":
      return {
        domain: "military",
        key: "ship-fire",
        condition: "An enemy vessel is designated",
        preferredAction: "Control waterways",
        goal: "Break enemy resistance"
      };
    case "assimilate-captives":
      return {
        domain: "society",
        key: "assimilate-captives",
        condition: "Captives are housed and a Town Square is available",
        preferredAction: "Assimilate captives",
        goal: "Grow the citizen population"
      };
    case "release-captives":
      return {
        domain: "society",
        key: "release-captives",
        condition: "Captives are held by the Crown",
        preferredAction: "Release captives",
        goal: "Strengthen loyalty and divine legitimacy"
      };
    case "generate-faith":
      return {
        domain: "faith",
        key: "generate-faith",
        condition: "Divine authority is needed",
        preferredAction: "Invest in faith",
        goal: "Strengthen divine rule"
      };
    case "cast-miracle":
      return {
        domain: "faith",
        key: `miracle-${command.payload.kind}`,
        condition: "Faith reserves can support divine intervention",
        preferredAction:
          command.payload.kind === "bless-harvest"
            ? "Bless harvests"
            : command.payload.kind === "inspire-battalion"
              ? "Inspire battalions"
              : "Pronounce divine judgment",
        goal: "Strengthen divine rule"
      };
    case "reward-heir":
    case "punish-heir":
      return undefined;
  }
}
