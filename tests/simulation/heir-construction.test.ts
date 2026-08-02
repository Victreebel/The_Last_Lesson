import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("heir construction", () => {
  it("assigns builders to an unfinished governed foundation before it can complete", () => {
    const initial = createInitialWorld(121212);
    const simulation = new Simulation({
      ...initial,
      buildings: {
        ...initial.buildings,
        "rival-foundation": { id: "rival-foundation", ownerEmpireId: "empire-rival", settlementId: "settlement-rival", kind: "farm", position: { x: 160, y: 170 }, defense: 40, complete: false, remainingBuildTicks: 1 }
      },
      settlements: {
        ...initial.settlements,
        "settlement-rival": { ...initial.settlements["settlement-rival"], buildingIds: [...initial.settlements["settlement-rival"].buildingIds, "rival-foundation"], population: { ...initial.settlements["settlement-rival"].population, builders: 0 } }
      }
    });
    simulation.tick();
    expect(simulation.getState().heirs["heir-rival"].lastDecision?.action).toBe("Prioritize construction");
    expect(simulation.getState().buildings["rival-foundation"].complete).toBe(true);
  });
});
