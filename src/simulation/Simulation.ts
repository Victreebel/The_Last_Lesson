import { defaultSimulationConfig, type SimulationConfig } from "./SimulationConfig";
import type { GameCommand } from "./commands/GameCommand";
import { EventWriter } from "./events/EventWriter";
import type { GameEvent } from "./events/GameEvent";
import { stableHash } from "./hash/stableHash";
import { SeededRandom } from "./random/SeededRandom";
import type { BuildingState, WorldState } from "./state/WorldState";

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

      const buildingId = `building-${command.payload.kind}-${tick}-${this.random.nextInt(1000, 9999)}`;
      const building: BuildingState = {
        id: buildingId,
        ownerEmpireId: settlement.ownerEmpireId,
        settlementId: settlement.id,
        kind: command.payload.kind,
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
}

