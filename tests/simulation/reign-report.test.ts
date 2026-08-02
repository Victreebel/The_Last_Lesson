import { describe, expect, it } from "vitest";
import { createReignReport, formatCivicRecord, formatReignDuration } from "../../src/simulation/reports/ReignReport";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("reign reports", () => {
  it("summarizes a resolved campaign from authoritative events", () => {
    const initial = createInitialWorld(991);
    const state = {
      ...initial,
      tick: 19,
      victory: { winnerEmpireId: "empire-player" as const, completedAtTick: 17 },
      empires: {
        ...initial.empires,
        "empire-player": {
          ...initial.empires["empire-player"],
          resources: { ...initial.empires["empire-player"].resources, faith: 84 },
          moralMemory: { captivesTaken: 9, captivesIntegrated: 4, captivesReleased: 3 }
        }
      }
    };
    const report = createReignReport(
      state,
      [
        { id: "event-1", tick: 4, type: "settlement-captured", payload: { newEmpireId: "empire-player" } },
        { id: "event-2", tick: 7, type: "doctrine-observed", payload: {} },
        { id: "event-3", tick: 10, type: "doctrine-reinforced", payload: {} },
        { id: "event-4", tick: 11, type: "doctrine-disciplined", payload: {} },
        { id: "event-5", tick: 14, type: "settlement-captured", payload: { newEmpireId: "empire-rival" } }
      ],
      "empire-player"
    );

    expect(report).toEqual({
      winnerEmpireId: "empire-player",
      durationSeconds: 85,
      thronesCaptured: 1,
      lessonsTaught: 3,
      heirsGuided: 2,
      faithHeld: 84,
      captivesTaken: 9,
      captivesIntegrated: 4,
      captivesReleased: 3
    });
    expect(formatReignDuration(report!.durationSeconds)).toBe("1:25");
    expect(formatCivicRecord(report)).toBe("CIVIC RECORD: TAKEN 9  //  INTEGRATED 4  //  RELEASED 3");
  });

  it("does not create a report before the campaign resolves", () => {
    expect(createReignReport(createInitialWorld(992), [], "empire-player")).toBeUndefined();
  });
});
