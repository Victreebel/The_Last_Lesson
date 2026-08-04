import { describe, expect, it } from "vitest";
import {
  formatRivalCounterDoctrine,
  getRivalCounterDoctrineSummaries
} from "../../src/rendering/rivalIntelligencePresentation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("rival intelligence presentation", () => {
  it("projects only rival counter-doctrines in deterministic recency order", () => {
    const initial = createInitialWorld(8321);
    const state = {
      ...initial,
      doctrines: {
        "doctrine-heir-prime-player": {
          id: "doctrine-heir-prime-player",
          ownerId: "heir-prime",
          domain: "military" as const,
          condition: "A force advances",
          preferredAction: "Advance and engage",
          goal: "Secure ground",
          confidence: 70,
          createdAtTick: 3,
          updatedAtTick: 9
        },
        "doctrine-heir-rival-counter-old": {
          id: "doctrine-heir-rival-counter-old",
          ownerId: "heir-rival",
          domain: "military" as const,
          condition: "The Crown fixes a line",
          preferredAction: "Lead an expedition",
          goal: "Test Crown defenses",
          confidence: 22,
          createdAtTick: 3,
          updatedAtTick: 5
        },
        "doctrine-heir-rival-counter-new": {
          id: "doctrine-heir-rival-counter-new",
          ownerId: "heir-rival",
          domain: "military" as const,
          condition: "A Crown supply route is visible",
          preferredAction: "Interdict Crown logistics",
          goal: "Break distant Crown support",
          confidence: 28,
          createdAtTick: 4,
          updatedAtTick: 8
        }
      }
    };

    const intelligence = getRivalCounterDoctrineSummaries(state);

    expect(intelligence).toEqual([
      {
        heirName: "Rival Heir",
        action: "Interdict Crown logistics",
        confidence: 28,
        updatedAtTick: 8
      },
      {
        heirName: "Rival Heir",
        action: "Lead an expedition",
        confidence: 22,
        updatedAtTick: 5
      }
    ]);
    expect(formatRivalCounterDoctrine(intelligence[0])).toBe("RIVAL HEIR // INTERDICT CROWN LOGISTICS (28%)");
  });

  it("keeps the intelligence feed empty until the rival has witnessed the Crown", () => {
    expect(getRivalCounterDoctrineSummaries(createInitialWorld(8322))).toEqual([]);
  });
});
