import type { GameEvent } from "../events/GameEvent";
import type { EmpireId } from "../state/Ids";
import type { WorldState } from "../state/WorldState";

export interface ReignReport {
  readonly winnerEmpireId: EmpireId;
  readonly durationSeconds: number;
  readonly thronesCaptured: number;
  readonly lessonsTaught: number;
  readonly heirsGuided: number;
  readonly faithHeld: number;
}

const WORLD_TICK_SECONDS = 5;

/** Creates a display summary without mutating simulation state or history. */
export function createReignReport(
  state: WorldState,
  eventLog: readonly GameEvent[],
  empireId: EmpireId
): ReignReport | undefined {
  const winnerEmpireId = state.victory.winnerEmpireId;
  const empire = state.empires[empireId];
  if (!winnerEmpireId || !empire) {
    return undefined;
  }

  const thronesCaptured = eventLog.filter(
    (event) => event.type === "settlement-captured" && event.payload.newEmpireId === empireId
  ).length;
  const lessonsTaught = eventLog.filter(
    (event) =>
      event.type === "doctrine-observed" ||
      event.type === "doctrine-reinforced" ||
      event.type === "doctrine-disciplined"
  ).length;
  const heirsGuided = eventLog.filter(
    (event) => event.type === "doctrine-reinforced" || event.type === "doctrine-disciplined"
  ).length;

  return {
    winnerEmpireId,
    durationSeconds: (state.victory.completedAtTick ?? state.tick) * WORLD_TICK_SECONDS,
    thronesCaptured,
    lessonsTaught,
    heirsGuided,
    faithHeld: empire.resources.faith
  };
}

export function formatReignDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
