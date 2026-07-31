import { defaultSimulationConfig, type SimulationConfig } from "./SimulationConfig";
import type { GameCommand } from "./commands/GameCommand";
import { EventWriter } from "./events/EventWriter";
import type { GameEvent } from "./events/GameEvent";
import { stableHash } from "./hash/stableHash";
import { SeededRandom } from "./random/SeededRandom";
import type { BattalionState, BuildingState, Position, WorldState } from "./state/WorldState";

export interface SimulationTickResult {
  readonly tick: number;
  readonly events: GameEvent[];
  readonly stateHash: string;
}

export class Simulation {
  private state: WorldState;
  private readonly config: SimulationConfig;
  private readonly random: SeededRandom;
  private readonly eventWriter = new EventWriter();
  private readonly commandQueue: GameCommand[] = [];
  private readonly commandLog: GameCommand[] = [];
  private readonly eventLog: GameEvent[] = [];

  constructor(state: WorldState, config: SimulationConfig = defaultSimulationConfig) {
    this.state = state;
    this.config = config;
    this.random = new SeededRandom(state.seed);
  }

  getState(): WorldState {
    return this.state;
  }

  getCommandLog(): GameCommand[] {
    return this.commandLog;
  }

  getEventLog(): GameEvent[] {
    return this.eventLog;
  }

  enqueueCommand(command: GameCommand): void {
    this.commandQueue.push(command);
    this.commandQueue.sort((a, b) => a.tick - b.tick || a.id.localeCompare(b.id));
  }

  tick(): SimulationTickResult {
    const nextTick = this.state.tick + 1;
    this.state = { ...this.state, tick: nextTick };

    this.applyCommandsForTick(nextTick);
    this.updateEconomy(nextTick);
    this.updateConstruction(nextTick);
    this.updateBattalionMovement(nextTick);
    this.updateCombat(nextTick);
    this.updateFaith(nextTick);

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
        command.payload.farmers + command.payload.builders + command.payload.lumberjacks;
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
              lumberjacks: command.payload.lumberjacks
            }
          }
        }
      };
      this.eventWriter.emit(tick, "command-applied", { commandId: command.id });
      return;
    }

    if (command.type === "place-building") {
      const settlement = this.state.settlements[command.payload.settlementId];
      if (!settlement) {
        this.eventWriter.emit(tick, "command-rejected", { commandId: command.id });
        return;
      }

      const buildingCount = settlement.buildingIds.length + 1;
      const buildingId = `building-${command.payload.kind}-${tick}-${buildingCount}`;
      const building: BuildingState = {
        id: buildingId,
        ownerEmpireId: settlement.ownerEmpireId,
        settlementId: settlement.id,
        kind: command.payload.kind,
        position: command.payload.position ?? { x: 620, y: 330 },
        defense: command.payload.kind === "farm" ? 40 : 100,
        complete: false,
        remainingBuildTicks: command.payload.kind === "farm" ? 2 : 3
      };

      this.state = {
        ...this.state,
        buildings: {
          ...this.state.buildings,
          [buildingId]: building
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
        kind: command.payload.kind
      });
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
      if (size > available) {
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
        size,
        attack: Math.max(4, Math.floor(size * 1.4)),
        defense: size * 10,
        maxDefense: size * 10,
        range: 42,
        speed: 44,
        morale: 70,
        supply: 100
      };

      this.state = {
        ...this.state,
        battalions: {
          ...this.state.battalions,
          [battalionId]: battalion
        },
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
      this.eventWriter.emit(tick, "battalion-created", { commandId: command.id, battalionId, size });
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
      return;
    }

    if (command.type === "attack-target") {
      const battalion = this.state.battalions[command.payload.battalionId];
      const target = this.findTarget(command.payload.targetId);
      if (!battalion || !target) {
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
    }
  }

  private updateEconomy(tick: number): void {
    for (const settlement of Object.values(this.state.settlements).sort((a, b) =>
      a.id.localeCompare(b.id)
    )) {
      const foodProduced = settlement.population.farmers * 2;
      const woodProduced = settlement.population.lumberjacks;
      const empire = this.state.empires[settlement.ownerEmpireId];

      this.state = {
        ...this.state,
        empires: {
          ...this.state.empires,
          [empire.id]: {
            ...empire,
            resources: {
              ...empire.resources,
              wood: empire.resources.wood + woodProduced
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

  private updateFaith(tick: number): void {
    for (const settlement of Object.values(this.state.settlements).sort((a, b) =>
      a.id.localeCompare(b.id)
    )) {
      const empire = this.state.empires[settlement.ownerEmpireId];
      const generatedFaith = Math.floor(
        (settlement.population.happiness +
          settlement.population.loyalty +
          settlement.population.devotion +
          settlement.internalFaith -
          settlement.externalReligiousPressure) /
          100
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

      const nextPosition = moveToward(battalion.position, battalion.destination, battalion.speed);
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

  private updateCombat(tick: number): void {
    let buildings = this.state.buildings;
    let battalions = this.state.battalions;

    for (const battalion of Object.values(battalions).sort((a, b) => a.id.localeCompare(b.id))) {
      if (!battalion.targetId) {
        continue;
      }

      const targetBattalion = battalions[battalion.targetId];
      const targetBuilding = buildings[battalion.targetId];
      if (!targetBattalion && !targetBuilding) {
        battalions = {
          ...battalions,
          [battalion.id]: { ...battalion, targetId: undefined }
        };
        continue;
      }

      const target = targetBattalion ?? targetBuilding;
      if (distance(battalion.position, target.position) > battalion.range) {
        continue;
      }

      const damage = Math.max(1, Math.floor(battalion.attack * (battalion.morale / 100)));

      if (targetBattalion) {
        const nextDefense = Math.max(0, targetBattalion.defense - damage);
        if (nextDefense === 0) {
          const { [targetBattalion.id]: _destroyed, ...remainingBattalions } = battalions;
          battalions = remainingBattalions;
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
        }
      }

      this.eventWriter.emit(tick, "damage-dealt", {
        attackerId: battalion.id,
        targetId: target.id,
        damage
      });
    }

    this.state = {
      ...this.state,
      buildings,
      battalions
    };
  }

  private findTarget(targetId: string): BattalionState | BuildingState | undefined {
    return this.state.battalions[targetId] ?? this.state.buildings[targetId];
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
