import { describe, expect, it } from "vitest";
import type { GameCommand } from "../../src/simulation/commands/GameCommand";
import { stableHash } from "../../src/simulation/hash/stableHash";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, type ScenarioId } from "../../src/simulation/state/WorldState";

const SCENARIOS: readonly ScenarioId[] = ["crownfall", "rivergate", "ashen-oath", "stonewall"];
const OPENING_FARM_POSITION = { x: 180, y: 180 };

function queueOpeningFarmPlan(simulation: Simulation): void {
  const capital = simulation.getState().settlements["settlement-capital"];
  const population = capital.population;
  const hasAuthoredLabor =
    population.farmers +
      population.builders +
      population.lumberjacks +
      population.miners +
      population.luxuryWorkers >
    0;
  const commands: readonly GameCommand[] = [
    {
      id: "opening-labor",
      issuedBy: "player-1",
      tick: 1,
      type: "assign-labor",
      payload: {
        settlementId: capital.id,
        farmers: hasAuthoredLabor ? population.farmers : 8,
        builders: hasAuthoredLabor ? population.builders : 4,
        lumberjacks: hasAuthoredLabor ? population.lumberjacks : 6,
        miners: hasAuthoredLabor ? population.miners : 0,
        luxuryWorkers: hasAuthoredLabor ? population.luxuryWorkers : 0
      }
    },
    {
      id: "opening-farm",
      issuedBy: "player-1",
      tick: 1,
      type: "place-building",
      payload: {
        settlementId: capital.id,
        kind: "farm",
        position: OPENING_FARM_POSITION
      }
    }
  ];

  commands.forEach((command) => simulation.enqueueCommand(command));
}

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

  it.each(SCENARIOS)("keeps rival settlements economically viable through the early pressure window", (scenarioId) => {
    const simulation = new Simulation(createInitialWorld(9300, "rival", scenarioId));

    simulation.runTicks(72);

    const state = simulation.getState();
    const rivalSettlements = [state.settlements["settlement-rival"], state.settlements["settlement-rival-grove"]];
    for (const settlement of rivalSettlements) {
      expect(settlement.population.citizens).toBeGreaterThan(0);
      expect(settlement.population.health).toBeGreaterThan(0);
      expect(settlement.localFood).toBeGreaterThan(0);
    }
  });

  it.each(SCENARIOS)("keeps the Crown viable after the authored opening farm plan", (scenarioId) => {
    const simulation = new Simulation(createInitialWorld(9400, "rival", scenarioId));
    queueOpeningFarmPlan(simulation);

    simulation.runTicks(72);

    const state = simulation.getState();
    const capital = state.settlements["settlement-capital"];
    const farms = capital.buildingIds
      .map((buildingId) => state.buildings[buildingId])
      .filter((building) => building?.kind === "farm" && building.complete);

    expect(state.victory.winnerEmpireId).toBeUndefined();
    expect(farms).toHaveLength(1);
    expect(capital.population.citizens).toBeGreaterThan(0);
    expect(capital.population.health).toBeGreaterThan(0);
    expect(capital.localFood).toBeGreaterThan(20);
    expect(
      simulation
        .getEventLog()
        .some((event) => event.type === "starvation" && event.payload.settlementId === capital.id)
    ).toBe(false);
  });
});
