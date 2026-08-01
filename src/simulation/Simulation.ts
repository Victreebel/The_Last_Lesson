import { defaultSimulationConfig, type SimulationConfig } from "./SimulationConfig";
import type { GameCommand } from "./commands/GameCommand";
import { EventWriter } from "./events/EventWriter";
import type { GameEvent } from "./events/GameEvent";
import { stableHash } from "./hash/stableHash";
import { SeededRandom } from "./random/SeededRandom";
import {
  isBuildingTerrainCompatible,
  getBuildingCost,
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
      this.updateBattalionMovement(nextTick);
      this.updateCaravanMovement(nextTick);
      this.updateCaravanDeliveries(nextTick);
      this.updateBattalionSupply(nextTick);
      this.updateCombat(nextTick);
      this.updateReligion(nextTick);
      this.updateCaptives(nextTick);
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
        command.payload.miners;
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
              miners: command.payload.miners
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
        empire.resources.wood < cost.wood ||
        empire.resources.iron < cost.iron
      ) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
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

      const available = settlement.population.citizens - settlement.population.militarizedCitizens;
      const size = Math.max(1, Math.floor(command.payload.size));
      const specialization = command.payload.specialization ?? "militia";
      const profile = getBattalionProfile(specialization);
      const hasMilitaryQuarters = settlement.buildingIds.some((id) => {
        const building = this.state.buildings[id];
        return building?.kind === "military-quarters" && building.complete;
      });
      const empire = this.state.empires[settlement.ownerEmpireId];
      if (
        size > available ||
        settlement.localFood < size * profile.foodPerUnit ||
        empire.resources.wood < size * profile.woodPerUnit ||
        empire.resources.iron < size * profile.ironPerUnit ||
        (specialization !== "militia" && !hasMilitaryQuarters)
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
        supply: 100
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
              militarizedCitizens: settlement.population.militarizedCitizens + size
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
        capacity: 24,
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

    if (command.type === "move-battalion") {
      const battalion = this.state.battalions[command.payload.battalionId];
      if (!battalion) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }

      this.state = {
        ...this.state,
        battalions: {
          ...this.state.battalions,
          [battalion.id]: {
            ...battalion,
            destination: command.payload.destination,
            targetId: undefined
          }
        }
      };
      this.eventWriter.emit(tick, "command-applied", { commandId: command.id });
      this.observePlayerCommand(command, tick);
      return;
    }

    if (command.type === "move-caravan") {
      const caravan = this.state.caravans[command.payload.caravanId];
      const terrain = terrainAtPosition(this.state, command.payload.destination);
      if (!caravan || terrain === "water") {
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
            .filter((battalion) => battalion.ownerEmpireId !== settlement.ownerEmpireId)
            .sort(
              (left, right) =>
                distance(left.position, castle.position) - distance(right.position, castle.position) ||
                left.id.localeCompare(right.id)
            )[0]
        : undefined;
      const enemyDistance = nearestEnemy && castle ? distance(nearestEnemy.position, castle.position) : Infinity;

      const farmUtility =
        Math.max(0, 56 - settlement.localFood) * 2 +
        Math.max(0, 8 - settlement.population.farmers) * 10 +
        this.getDoctrineUtility(heir, "Prioritize farm labor");
      const recruitUtility =
        availableCitizens >= 6 && ownBattalions.length === 0
          ? 48 + Math.max(0, 260 - enemyDistance) / 5 + this.getDoctrineUtility(heir, "Raise a battalion")
          : 0;
      const defendUtility =
        nearestEnemy && ownBattalions.length > 0 && enemyDistance < 240
          ? 42 + (240 - enemyDistance) / 4 + this.getDoctrineUtility(heir, "Attack designated targets")
          : 0;

      if (farmUtility >= recruitUtility && farmUtility >= defendUtility && farmUtility >= 30) {
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

      if (recruitUtility >= defendUtility && recruitUtility >= 30 && castle) {
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
          supply: 100
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
      }
    }
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
    const doctrine: DoctrineRule = existingDoctrine
      ? { ...existingDoctrine, updatedAtTick: tick }
      : {
          id: doctrineId,
          ownerId: heir.id,
          domain: action === "Prioritize farm labor" ? "economy" : "military",
          condition: "Governance pressure requires action",
          preferredAction: action,
          goal: "Secure the settlement",
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
      const foodProduced = Math.min(settlement.population.farmers, farmCapacity) * 2;
      const woodProduced = Math.min(settlement.population.lumberjacks, lumberCapacity);
      const ironProduced = Math.min(settlement.population.miners, mineCapacity);
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
              iron: empire.resources.iron + ironProduced
            }
          }
        },
        settlements: {
          ...this.state.settlements,
          [settlement.id]: {
            ...settlement,
            localFood: settlement.localFood + foodProduced
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
    }
  }

  private updateConstruction(tick: number): void {
    const updatedBuildings: Record<string, BuildingState> = {};

    for (const building of Object.values(this.state.buildings).sort((a, b) =>
      a.id.localeCompare(b.id)
    )) {
      if (building.complete) {
        updatedBuildings[building.id] = building;
        continue;
      }

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

  private updateReligion(tick: number): void {
    const nextSettlements: WorldState["settlements"] = { ...this.state.settlements };

    for (const settlement of Object.values(this.state.settlements).sort((left, right) =>
      left.id.localeCompare(right.id)
    )) {
      const castle = this.state.buildings[settlement.centralBuildingId];
      if (!castle) {
        continue;
      }
      const externalPressure = Object.values(this.state.settlements)
        .filter((other) => other.ownerEmpireId !== settlement.ownerEmpireId)
        .reduce((total, other) => {
          const otherCastle = this.state.buildings[other.centralBuildingId];
          if (!otherCastle) {
            return total;
          }
          return total + Math.max(0, Math.floor(36 - distance(castle.position, otherCastle.position) / 18));
        }, 0);
      const garrisonStrength = Object.values(this.state.battalions)
        .filter((battalion) => battalion.ownerEmpireId === settlement.ownerEmpireId)
        .reduce((total, battalion) => total + battalion.size, 0);
      const totalPopulation = settlement.population.citizens + settlement.population.captives;
      const captiveRatio = totalPopulation === 0 ? 0 : (settlement.population.captives / totalPopulation) * 100;
      const captiveCapacity = this.getCaptiveCapacity(settlement.id);
      const overcrowding = Math.max(0, settlement.population.captives - captiveCapacity);
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
              overcrowding * 4
          )
        )
      );
      const religiousPressure = Math.max(0, externalPressure - settlement.internalFaith);
      const nextSettlement = {
        ...settlement,
        externalReligiousPressure: externalPressure,
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
          rebellionPressure
        });
      }
    }

    this.state = { ...this.state, settlements: nextSettlements };
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
          .filter((battalion) => battalion.ownerEmpireId === settlement.ownerEmpireId)
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
        amount: generatedFaith
      });
    }
  }

  private updateBattalionMovement(tick: number): void {
    const updatedBattalions: Record<string, BattalionState> = {};

    for (const battalion of Object.values(this.state.battalions).sort((a, b) =>
      a.id.localeCompare(b.id)
    )) {
      if (!battalion.destination) {
        updatedBattalions[battalion.id] = battalion;
        continue;
      }

      const terrain = terrainAtPosition(this.state, battalion.position);
      const speed =
        battalion.speed * terrainMovementMultiplier(terrain) * this.roadMovementMultiplier(battalion);
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
        y: Math.round(nextPosition.y)
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
      const speed = caravan.speed * terrainMovementMultiplier(terrain) * this.roadMovementMultiplier(caravan);
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
        y: Math.round(nextPosition.y)
      });
    }
    this.state = { ...this.state, caravans: nextCaravans };
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

  private updateBattalionSupply(tick: number): void {
    const nextBattalions: Record<string, BattalionState> = {};
    for (const battalion of Object.values(this.state.battalions).sort((left, right) =>
      left.id.localeCompare(right.id)
    )) {
      const supplied = Object.values(this.state.buildings).some(
        (building) =>
          building.ownerEmpireId === battalion.ownerEmpireId &&
          building.complete &&
          (building.kind === "castle" || building.kind === "outpost" || building.kind === "road") &&
          distance(building.position, battalion.position) <= (building.kind === "road" ? 64 : 120)
      );
      const nextSupply = Math.max(0, Math.min(100, battalion.supply + (supplied ? 5 : -2)));
      const nextMorale = nextSupply === 0 ? Math.max(0, battalion.morale - 2) : battalion.morale;
      nextBattalions[battalion.id] = {
        ...battalion,
        supply: nextSupply,
        morale: nextMorale
      };
      if (nextSupply !== battalion.supply) {
        this.eventWriter.emit(tick, "supply-changed", {
          battalionId: battalion.id,
          supply: nextSupply,
          supplied
        });
      }
    }
    this.state = { ...this.state, battalions: nextBattalions };
  }

  private updateCombat(tick: number): void {
    let buildings = this.state.buildings;
    let battalions = this.state.battalions;
    let caravans = this.state.caravans;
    const capturedCastleIds: Array<{ readonly castleId: string; readonly attackerId: string }> = [];
    const defeatedBattalions: Array<{ readonly attackerId: string; readonly defender: BattalionState }> = [];
    const destroyedBuildingIds: string[] = [];
    const destroyedCaravanIds: string[] = [];

    for (const candidate of Object.values(battalions).sort((a, b) => a.id.localeCompare(b.id))) {
      const battalion = battalions[candidate.id];
      if (!battalion) {
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
      const damage = Math.max(
        1,
        Math.floor(
          (battalion.attack *
            (battalion.morale / 100) *
            specializationMultiplier *
            supplyMultiplier) /
            terrainDefenseMultiplier(defenderTerrain)
        )
      );

      if (targetBattalion) {
        const nextDefense = Math.max(0, targetBattalion.defense - damage);
        if (nextDefense === 0) {
          const { [targetBattalion.id]: _destroyed, ...remainingBattalions } = battalions;
          battalions = remainingBattalions;
          defeatedBattalions.push({ attackerId: battalion.id, defender: targetBattalion });
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
          destroyedCaravanIds.push(targetCaravan.id);
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
        battalions = {
          ...battalions,
          [battalion.id]: {
            ...attackingBattalion,
            attackCooldownRemaining: battalion.attackCooldownTicks
          }
        };
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

    this.removeDestroyedBuildings(destroyedBuildingIds);
    this.removeDestroyedCaravans(destroyedCaravanIds);
    for (const defeated of defeatedBattalions) {
      const attacker = this.state.battalions[defeated.attackerId];
      if (attacker) {
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

  private removeDestroyedBuildings(buildingIds: string[]): void {
    if (buildingIds.length === 0) {
      return;
    }
    const destroyed = new Set(buildingIds);
    const nextBuildings: Record<string, BuildingState> = { ...this.state.buildings };
    for (const id of destroyed) {
      delete nextBuildings[id];
    }
    const nextSettlements = Object.fromEntries(
      Object.entries(this.state.settlements).map(([id, settlement]) => [
        id,
        {
          ...settlement,
          buildingIds: settlement.buildingIds.filter((buildingId) => !destroyed.has(buildingId))
        }
      ])
    ) as WorldState["settlements"];
    this.state = { ...this.state, buildings: nextBuildings, settlements: nextSettlements };
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
    const capturedCount = Math.min(availableHousing, Math.max(1, Math.floor(defeated.size / 2)));
    const nextDefenderSettlement = {
      ...defenderSettlement,
      battalionIds: defenderSettlement.battalionIds.filter((id) => id !== defeated.id),
      population: {
        ...defenderSettlement.population,
        militarizedCitizens: Math.max(0, defenderSettlement.population.militarizedCitizens - defeated.size)
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
    }
  }

  private captureSettlement(attacker: BattalionState, castleId: string, tick: number): void {
    const castle = this.state.buildings[castleId];
    if (!castle || castle.kind !== "castle" || castle.ownerEmpireId === attacker.ownerEmpireId) {
      return;
    }

    const settlement = this.state.settlements[castle.settlementId];
    const losingEmpire = this.state.empires[settlement.ownerEmpireId];
    const winningEmpire = this.state.empires[attacker.ownerEmpireId];
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
    if (fallenHeir) {
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
        defense: building.id === castleId ? getBuildingStats("castle").defense : Math.max(1, building.defense)
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

    this.eventWriter.emit(tick, "settlement-captured", {
      settlementId: settlement.id,
      formerEmpireId: losingEmpire.id,
      newEmpireId: winningEmpire.id,
      fallenHeirId: settlement.heirId,
      successorHeirId
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
    case "villa":
    case "lumber-mill":
    case "mine":
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

function getMiracleCost(kind: "bless-harvest" | "inspire-battalion"): number {
  return kind === "bless-harvest" ? 12 : 16;
}

function getDoctrineObservation(command: GameCommand, state: WorldState): DoctrineObservation | undefined {
  switch (command.type) {
    case "assign-labor": {
      const assignments = [
        ["farm", command.payload.farmers],
        ["build", command.payload.builders],
        ["lumber", command.payload.lumberjacks],
        ["mine", command.payload.miners]
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
        key: "raise-battalion",
        condition: "Citizens can be mobilized",
        preferredAction: "Raise a battalion",
        goal: "Secure the settlement"
      };
    case "create-caravan":
      return {
        domain: "economy",
        key: "create-caravan",
        condition: "Food reserves and a Town Square are available",
        preferredAction: "Establish supply caravans",
        goal: "Sustain distant forces"
      };
    case "move-battalion":
      return {
        domain: "military",
        key: "reposition-battalion",
        condition: "A battalion receives a destination",
        preferredAction: "Reposition battalions",
        goal: "Control the battlefield"
      };
    case "move-caravan":
      return {
        domain: "economy",
        key: "reposition-caravan",
        condition: "A supply caravan receives a destination",
        preferredAction: "Route supply caravans",
        goal: "Sustain distant forces"
      };
    case "attack-target":
      return {
        domain: "military",
        key: "attack-designated-target",
        condition: "An enemy target is designated",
        preferredAction: "Attack designated targets",
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
          command.payload.kind === "bless-harvest" ? "Bless harvests" : "Inspire battalions",
        goal: "Strengthen divine rule"
      };
    case "reward-heir":
    case "punish-heir":
      return undefined;
  }
}
