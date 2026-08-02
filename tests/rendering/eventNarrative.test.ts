import { describe, expect, it } from "vitest";
import { describeGameEvent, selectTacticalReportEvents } from "../../src/rendering/eventNarrative";
import type { GameEvent } from "../../src/simulation/events/GameEvent";

const context = {
  settlementName: (id: string | undefined) => (id === "settlement-capital" ? "Crownkeep" : "Unknown Seat"),
  heirName: (id: string | undefined) => (id === "heir-capital" ? "Lady Ilyra" : "Unknown Heir"),
  entityName: (id: string | undefined) => (id === "battalion-1" ? "Crown Spears" : "Unknown Force")
};

const event = (type: GameEvent["type"], payload: Record<string, unknown>): GameEvent => ({
  id: "event-1",
  tick: 3,
  type,
  payload
});

describe("event narrative", () => {
  it("turns doctrine events into a teachable record", () => {
    expect(
      describeGameEvent(
        event("doctrine-observed", { heirId: "heir-capital", action: "protect-caravans", confidence: 42 }),
        context
      )
    ).toBe("Lady Ilyra observed Protect Caravans as a 42% conviction.");
  });

  it("describes an heir decision with its deterministic rationale", () => {
    expect(
      describeGameEvent(
        event("heir-decision", {
          heirId: "heir-capital",
          action: "Raise a battalion",
          rationale: "The frontier is exposed.",
          utility: 74
        }),
        context
      )
    ).toBe("Lady Ilyra chose to raise a battalion: The frontier is exposed. (utility 74).");
  });

  it("records civic recovery in readable terms", () => {
    expect(
      describeGameEvent(
        event("miracle-cast", {
          miracle: "mend-settlement",
          settlementId: "settlement-capital",
          restoredHealth: 30,
          plagueCleansed: true
        }),
        context
      )
    ).toBe("Mend Settlement answered at Crownkeep, restoring 30 health and ending the plague.");
  });

  it("keeps decisive reports ahead of routine production in the Tactical Uplink", () => {
    const reports = selectTacticalReportEvents([
      event("faith-produced", { settlementId: "settlement-capital", amount: 4 }),
      event("miracle-cast", {
        miracle: "mend-settlement",
        settlementId: "settlement-capital",
        restoredHealth: 30,
        plagueCleansed: true
      }),
      event("doctrine-observed", { heirId: "heir-capital", action: "mend-settlement", confidence: 22 })
    ]);

    expect(reports.at(-1)?.type).toBe("miracle-cast");
  });
});
