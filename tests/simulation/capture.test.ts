import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, type BattalionState } from "../../src/simulation/state/WorldState";

describe("castle capture", () => {
  it("transfers the settlement, kills its heir, and ends the match when the final throne falls", () => {
    const initial = createInitialWorld(24680);
    const attacker: BattalionState = {
      id: "battalion-capture-test",
      ownerEmpireId: "empire-player",
      settlementId: "settlement-capital",
      position: { x: 1120, y: 390 },
      targetId: "building-rival-castle",
      size: 12,
      attack: 100,
      defense: 120,
      maxDefense: 120,
      range: 60,
      speed: 44,
      morale: 100,
      devotion: 70,
      supply: 100
    };
    const simulation = new Simulation({
      ...initial,
      buildings: {
        ...initial.buildings,
        "building-rival-castle": { ...initial.buildings["building-rival-castle"], defense: 1 }
      },
      battalions: { ...initial.battalions, [attacker.id]: attacker }
    });

    const result = simulation.tick();
    const state = simulation.getState();
    const capturedSettlement = state.settlements["settlement-rival"];

    expect(capturedSettlement.ownerEmpireId).toBe("empire-player");
    expect(state.heirs["heir-rival"].alive).toBe(false);
    expect(state.heirs[capturedSettlement.heirId].ownerEmpireId).toBe("empire-player");
    expect(state.empires["empire-rival"].settlementIds).toEqual([]);
    expect(state.victory.winnerEmpireId).toBe("empire-player");
    expect(result.events.some((event) => event.type === "settlement-captured")).toBe(true);
    expect(result.events.some((event) => event.type === "victory-achieved")).toBe(true);
  });
});
