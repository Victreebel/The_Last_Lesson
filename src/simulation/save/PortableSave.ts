import type { WorldState } from "../state/WorldState";
import { Simulation } from "../Simulation";
import {
  createSaveGame,
  deserializeSaveGame,
  serializeSaveGame,
  type SaveGame
} from "./SaveGame";

export const PORTABLE_SAVE_FORMAT_VERSION = "1.0.0";

export interface PortableSaveArchive {
  readonly format: "the-last-lesson-portable-save";
  readonly version: typeof PORTABLE_SAVE_FORMAT_VERSION;
  readonly save: SaveGame;
  readonly campaignInitialWorld: WorldState;
}

export function createPortableSaveArchive(
  simulation: Simulation,
  campaignInitialWorld: WorldState
): PortableSaveArchive {
  return structuredClone({
    format: "the-last-lesson-portable-save" as const,
    version: PORTABLE_SAVE_FORMAT_VERSION,
    save: createSaveGame(simulation),
    campaignInitialWorld
  });
}

export function serializePortableSaveArchive(archive: PortableSaveArchive): string {
  return JSON.stringify(archive);
}

export function deserializePortableSaveArchive(serialized: string): PortableSaveArchive {
  const parsed = JSON.parse(serialized) as Partial<PortableSaveArchive>;
  if (
    parsed.format !== "the-last-lesson-portable-save" ||
    parsed.version !== PORTABLE_SAVE_FORMAT_VERSION ||
    !parsed.save ||
    !isWorldState(parsed.campaignInitialWorld)
  ) {
    throw new Error("Unsupported or malformed The Last Lesson portable save.");
  }

  return {
    format: "the-last-lesson-portable-save",
    version: PORTABLE_SAVE_FORMAT_VERSION,
    save: deserializeSaveGame(serializeSaveGame(parsed.save as SaveGame)),
    campaignInitialWorld: structuredClone(parsed.campaignInitialWorld)
  };
}

export function createPortableSaveFilename(world: WorldState): string {
  return `the-last-lesson-${world.scenarioId}-tick-${world.tick}.tll`;
}

function isWorldState(value: unknown): value is WorldState {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<WorldState>;
  return (
    typeof candidate.seed === "number" &&
    typeof candidate.tick === "number" &&
    Boolean(candidate.empires) &&
    Boolean(candidate.settlements) &&
    Boolean(candidate.buildings)
  );
}
