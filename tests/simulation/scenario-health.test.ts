import { describe, expect, it } from "vitest";
import { stableHash } from "../../src/simulation/hash/stableHash";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, type ScenarioId } from "../../src/simulation/state/WorldState";

const SCENARIOS: readonly ScenarioId[] = ["crownfall", "rivergate", "ashen-oath", "stonewall"];

describe("scenario opening health", () => {
  it.each(SCENARIOS)("keeps %s playable through the uncommanded opening window", (scenarioId) => {
    const simulation = new Simulation(createInitialWorld(9100, "rival", scenarioId));

    simulation.runTicks(12);

    const state = simulation.getState();
    const capital = state.settlements["settlement-capital"];
    const throne = state.buildings[capital.centralBuildingId];

    expect(state.victory.winnerEmpireId).toBeUndefined();
    expect(capital.ownerEmpireId).toBe("empire-player");
    expect(throne).toMatchObject({ ownerEmpireId: "empire-player", kind: "castle", complete: true });
    expect(capital.population.citizens + capital.population.captives).toBeGreaterThan(0);
    expect(capital.population.health).toBeGreaterThan(0);
    expect(capital.localFood).toBeGreaterThanOrEqual(0);
  });

  it.each(SCENARIOS)("keeps %s opening outcomes deterministic", (scenarioId) => {
    const left = new Simulation(createInitialWorld(9200, "rival", scenarioId));
    const right = new Simulation(createInitialWorld(9200, "rival", scenarioId));

    left.runTicks(12);
    right.runTicks(12);

    expect(stableHash(left.getState())).toBe(stableHash(right.getState()));
    expect(stableHash(left.getEventLog())).toBe(stableHash(right.getEventLog()));
  });
});
