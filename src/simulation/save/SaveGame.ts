import { Simulation } from "../Simulation";
import type { SimulationConfig } from "../SimulationConfig";
import type { GameCommand } from "../commands/GameCommand";
import type { GameEvent } from "../events/GameEvent";
import type { RivalDifficulty, ScenarioId, WorldState } from "../state/WorldState";

export const SAVE_FORMAT_VERSION = "1.2.0";
const LEGACY_SAVE_FORMAT_VERSION = "1.1.0";

export interface SaveGame {
  readonly format: "the-last-lesson-save";
  readonly version: typeof SAVE_FORMAT_VERSION;
  readonly world: WorldState;
  readonly eventSequence: number;
  readonly pendingCommands: GameCommand[];
  readonly commandLog: GameCommand[];
  readonly eventLog: GameEvent[];
}

export function createSaveGame(simulation: Simulation): SaveGame {
  return structuredClone({
    format: "the-last-lesson-save" as const,
    version: SAVE_FORMAT_VERSION,
    world: simulation.getState(),
    eventSequence: simulation.getEventSequence(),
    pendingCommands: simulation.getPendingCommands(),
    commandLog: simulation.getCommandLog(),
    eventLog: simulation.getEventLog()
  });
}

export function serializeSaveGame(save: SaveGame): string {
  return JSON.stringify(save);
}

export function deserializeSaveGame(serialized: string): SaveGame {
  const parsed = JSON.parse(serialized) as Partial<SaveGame>;
  if (
    parsed.format !== "the-last-lesson-save" ||
    (parsed.version !== SAVE_FORMAT_VERSION && parsed.version !== LEGACY_SAVE_FORMAT_VERSION) ||
    !parsed.world ||
    typeof parsed.eventSequence !== "number" ||
    !Array.isArray(parsed.pendingCommands) ||
    !Array.isArray(parsed.commandLog) ||
    !Array.isArray(parsed.eventLog)
  ) {
    throw new Error("Unsupported or malformed The Last Lesson save.");
  }
  const rivalDifficulty = (parsed.world as Partial<WorldState>).rivalDifficulty;
  const normalizedDifficulty: RivalDifficulty =
    rivalDifficulty === "disciple" || rivalDifficulty === "architect" || rivalDifficulty === "rival"
      ? rivalDifficulty
      : "rival";
  const scenarioId = (parsed.world as Partial<WorldState>).scenarioId;
  const normalizedScenario: ScenarioId =
    scenarioId === "rivergate" ||
    scenarioId === "ashen-oath" ||
    scenarioId === "stonewall" ||
    scenarioId === "crownfall"
      ? scenarioId
      : "crownfall";
  return {
    format: "the-last-lesson-save",
    version: SAVE_FORMAT_VERSION,
    eventSequence: parsed.eventSequence,
    pendingCommands: parsed.pendingCommands as GameCommand[],
    commandLog: parsed.commandLog as GameCommand[],
    eventLog: parsed.eventLog as GameEvent[],
    world: {
      ...(parsed.world as WorldState),
      scenarioId: normalizedScenario,
      rivalDifficulty: normalizedDifficulty,
      settlements: Object.fromEntries(
        Object.entries((parsed.world as WorldState).settlements).map(([settlementId, settlement]) => [
          settlementId,
          {
            ...settlement,
            population: {
              ...settlement.population,
              luxuryWorkers: Number.isInteger(settlement.population.luxuryWorkers)
                ? settlement.population.luxuryWorkers
                : 0
            },
            religiousWardTicks: Number.isInteger(settlement.religiousWardTicks)
              ? settlement.religiousWardTicks
              : 0,
            plagueTicks: Number.isInteger(settlement.plagueTicks) ? settlement.plagueTicks : 0
          }
        ])
      )
    }
  };
}

export function restoreSaveGame(save: SaveGame, config?: SimulationConfig): Simulation {
  const simulation = new Simulation(structuredClone(save.world), config, {
    eventSequence: save.eventSequence,
    commandLog: structuredClone(save.commandLog),
    eventLog: structuredClone(save.eventLog)
  });
  for (const command of save.pendingCommands) {
    simulation.enqueueCommand(structuredClone(command));
  }
  return simulation;
}
