import { describe, expect, it } from "vitest";
import { createInitialWorld, isPositionVisibleToEmpire } from "../../src/simulation/state/WorldState";

describe("visibility", () => {
  it("requires a Crown observer before the rival throne is known", () => {
    const state = createInitialWorld(777);
    const rivalCastle = state.buildings["building-rival-castle"];

    expect(isPositionVisibleToEmpire(state, "empire-player", rivalCastle.position)).toBe(false);

    const scout = {
      ...state.battalions["battalion-rival-1"],
      id: "battalion-crown-scout",
      ownerEmpireId: "empire-player" as const,
      position: { x: 900, y: 390 }
    };
    expect(
      isPositionVisibleToEmpire(
        { ...state, battalions: { ...state.battalions, [scout.id]: scout } },
        "empire-player",
        rivalCastle.position
      )
    ).toBe(true);
  });

  it("lets scout hounds reveal farther than a human battalion", () => {
    const state = createInitialWorld(778);
    const rivalCastle = state.buildings["building-rival-castle"];
    const hounds = {
      ...state.battalions["battalion-rival-1"],
      id: "battalion-crown-hounds",
      ownerEmpireId: "empire-player" as const,
      specialization: "hounds" as const,
      position: { x: 680, y: 390 }
    };

    expect(
      isPositionVisibleToEmpire(
        { ...state, battalions: { ...state.battalions, [hounds.id]: hounds } },
        "empire-player",
        rivalCastle.position
      )
    ).toBe(true);
  });
});
