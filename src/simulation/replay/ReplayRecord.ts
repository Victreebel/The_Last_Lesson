import type { SimulationConfig } from "../SimulationConfig";
import type { GameCommand } from "../commands/GameCommand";
import type { WorldState } from "../state/WorldState";
import { runReplay, type ReplayResult } from "./replay";

export const REPLAY_FORMAT_VERSION = "1.0.0";

export interface ReplayRecord {
  readonly format: "the-last-lesson-replay";
  readonly version: typeof REPLAY_FORMAT_VERSION;
  readonly initialWorld: WorldState;
  readonly commands: GameCommand[];
  readonly ticks: number;
}

export function createReplayRecord(
  initialWorld: WorldState,
  commands: readonly GameCommand[],
  ticks: number
): ReplayRecord {
  if (!Number.isInteger(ticks) || ticks < 0) {
    throw new Error("A replay must contain a non-negative whole tick count.");
  }

  return structuredClone({
    format: "the-last-lesson-replay" as const,
    version: REPLAY_FORMAT_VERSION,
    initialWorld,
    commands: Array.from(commands),
    ticks
  });
}

export function serializeReplayRecord(record: ReplayRecord): string {
  return JSON.stringify(record);
}

export function deserializeReplayRecord(serialized: string): ReplayRecord {
  const parsed = JSON.parse(serialized) as Partial<ReplayRecord>;
  if (
    parsed.format !== "the-last-lesson-replay" ||
    parsed.version !== REPLAY_FORMAT_VERSION ||
    !parsed.initialWorld ||
    !Array.isArray(parsed.commands) ||
    typeof parsed.ticks !== "number" ||
    !Number.isInteger(parsed.ticks) ||
    parsed.ticks < 0
  ) {
    throw new Error("Unsupported or malformed The Last Lesson replay.");
  }

  return structuredClone(parsed as ReplayRecord);
}

export function runReplayRecord(record: ReplayRecord, config?: SimulationConfig): ReplayResult {
  return runReplay({
    initialWorld: record.initialWorld,
    commands: record.commands,
    ticks: record.ticks,
    config
  });
}
