import type { GameEvent } from "../simulation/events/GameEvent";
import type { WorldState } from "../simulation/state/WorldState";

export const PLAYTEST_RECORD_VERSION = "1.0.0";

export interface PlaytestRecord {
  readonly format: "the-last-lesson-playtest-record";
  readonly version: typeof PLAYTEST_RECORD_VERSION;
  readonly scenarioId: WorldState["scenarioId"];
  readonly rivalDifficulty: WorldState["rivalDifficulty"];
  readonly tick: number;
  readonly victory: WorldState["victory"];
  readonly eventCounts: Readonly<Record<string, number>>;
  readonly playerCivicRecord: WorldState["empires"]["empire-player"]["moralMemory"];
}

/** A local, shareable tuning artifact. It never enters authoritative state. */
export function createPlaytestRecord(state: WorldState, events: readonly GameEvent[]): PlaytestRecord {
  const eventCounts: Record<string, number> = {};
  for (const event of events) {
    eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1;
  }
  return {
    format: "the-last-lesson-playtest-record",
    version: PLAYTEST_RECORD_VERSION,
    scenarioId: state.scenarioId,
    rivalDifficulty: state.rivalDifficulty,
    tick: state.tick,
    victory: state.victory,
    eventCounts,
    playerCivicRecord: state.empires["empire-player"]?.moralMemory
  };
}

export function serializePlaytestRecord(record: PlaytestRecord): string {
  return JSON.stringify(record, null, 2);
}

export function createPlaytestRecordFilename(state: WorldState): string {
  return `the-last-lesson-${state.scenarioId}-tick-${state.tick}.playtest.json`;
}
