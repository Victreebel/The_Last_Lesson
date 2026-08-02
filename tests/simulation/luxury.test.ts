import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("luxury production", () => {
  it("develops a luxury grove with a plantation and converts assigned labor into prosperity", () => {
    const initial = createInitialWorld(443322);
    const simulation = new Simulation(initial);
    simulation.enqueueCommand({
      id: "plant-luxury-grove",
      issuedBy: "player-1",
      tick: 1,
      type: "place-building",
      payload: { settlementId: "settlement-capital", kind: "plantation", position: { x: 1100, y: 690 } }
    });
    simulation.enqueueCommand({
      id: "assign-luxury-labor",
      issuedBy: "player-1",
      tick: 1,
      type: "assign-labor",
      payload: {
        settlementId: "settlement-capital",
        farmers: 0,
        builders: 0,
        lumberjacks: 0,
        miners: 0,
        luxuryWorkers: 6
      }
    });

    simulation.runTicks(4);
    const state = simulation.getState();
    const settlement = state.settlements["settlement-capital"];

    expect(Object.values(state.buildings).some((building) => building.kind === "plantation" && building.complete)).toBe(
      true
    );
    expect(state.empires["empire-player"].resources.luxury).toBe(6);
    expect(settlement.population.happiness).toBe(72);
    expect(settlement.population.devotion).toBe(66);
    expect(simulation.getEventLog().some((event) => event.type === "luxury-produced")).toBe(true);
  });
});
