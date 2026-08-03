import { describe, expect, it } from "vitest";
import { getBattalionReadinessPresentation } from "../../src/rendering/battalionReadinessPresentation";
import type { BattalionState } from "../../src/simulation/state/WorldState";

const battalion = (overrides: Partial<BattalionState> = {}): BattalionState => ({
  id: "battalion-crown-1",
  ownerEmpireId: "empire-player",
  settlementId: "settlement-capital",
  position: { x: 0, y: 0 },
  specialization: "militia",
  size: 12,
  attack: 12,
  defense: 80,
  maxDefense: 80,
  range: 24,
  speed: 40,
  attackCooldownTicks: 1,
  attackCooldownRemaining: 0,
  morale: 70,
  devotion: 60,
  supply: 100,
  ...overrides
});

describe("battalion readiness presentation", () => {
  it("derives bounded defense, morale, and supply percentages from authoritative state", () => {
    expect(
      getBattalionReadinessPresentation(
        battalion({ defense: 31, maxDefense: 80, morale: 73.6, supply: 120 })
      )
    ).toEqual({ defense: 39, morale: 74, supply: 100 });
  });

  it("handles depleted and malformed display values without leaking invalid percentages", () => {
    expect(
      getBattalionReadinessPresentation(battalion({ defense: -2, maxDefense: 0, morale: -4, supply: Number.NaN }))
    ).toEqual({ defense: 0, morale: 0, supply: 0 });
  });
});
