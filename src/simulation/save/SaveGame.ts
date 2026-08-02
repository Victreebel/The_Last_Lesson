import { Simulation } from "../Simulation";
import type { SimulationConfig } from "../SimulationConfig";
import type { GameCommand } from "../commands/GameCommand";
import type { GameEvent } from "../events/GameEvent";
import type { RivalDifficulty, WorldState } from "../state/WorldState";

export const SAVE_FORMAT_VERSION = "1.1.0";

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
    parsed.version !== SAVE_FORMAT_VERSION ||
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
  return {
    ...(parsed as SaveGame),
    world: {
      ...(parsed.world as WorldState),
      rivalDifficulty: normalizedDifficulty
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
