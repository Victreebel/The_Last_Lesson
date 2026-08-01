import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("campaign scale", () => {
  it("starts the rival empire with two independently governed thrones", () => {
    const state = createInitialWorld(777);
    const rival = state.empires["empire-rival"];

    expect(rival.settlementIds).toEqual(["settlement-rival", "settlement-rival-grove"]);
    expect(state.settlements["settlement-rival-grove"].centralBuildingId).toBe("building-rival-grove-castle");
    expect(state.heirs["heir-rival-grove"].mode).toBe("governance");
  });

  it("withholds victory until every rival throne falls", () => {
    const initial = createInitialWorld(777);
    const attacker = {
      ...initial.battalions["battalion-rival-1"],
      id: "battalion-scale-capture",
      ownerEmpireId: "empire-player" as const,
      settlementId: "settlement-capital",
      position: initial.buildings["building-rival-castle"].position,
      targetId: "building-rival-castle",
      attack: 100,
      range: 60
    };
    const simulation = new Simulation({
      ...initial,
      buildings: {
        ...initial.buildings,
        "building-rival-castle": { ...initial.buildings["building-rival-castle"], defense: 1 }
      },
      battalions: { ...initial.battalions, [attacker.id]: attacker }
    });

    simulation.tick();

    expect(simulation.getState().empires["empire-rival"].settlementIds).toEqual(["settlement-rival-grove"]);
    expect(simulation.getState().victory.winnerEmpireId).toBeUndefined();
  });
});
