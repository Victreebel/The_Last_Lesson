import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("heir governance", () => {
  it("turns settlement pressure into an explainable autonomous decision", () => {
    const simulation = new Simulation(createInitialWorld(112358));

    const result = simulation.tick();
    const heir = simulation.getState().heirs["heir-rival"];
    const settlement = simulation.getState().settlements["settlement-rival"];

    expect(heir.lastDecision?.action).toBe("Prioritize farm labor");
    expect(heir.lastDecision?.utility).toBeGreaterThanOrEqual(30);
    expect(heir.lastDoctrineId).toBeDefined();
    expect(simulation.getState().doctrines[heir.lastDoctrineId!].confidence).toBe(20);
    expect(settlement.population.farmers).toBe(8);
    expect(result.events.some((event) => event.type === "heir-decision")).toBe(true);
  });
});
