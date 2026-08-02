import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("housing destruction", () => {
  it("turns a destroyed Villa into immediate, inspectable civilian and stability losses", () => {
    const initial = createInitialWorld(303030);
    const simulation = new Simulation({
      ...initial,
      buildings: {
        ...initial.buildings,
        "building-villa-test": {
          id: "building-villa-test",
          ownerEmpireId: "empire-player",
          settlementId: "settlement-capital",
          kind: "villa",
          position: { x: 520, y: 300 },
          defense: 1,
          complete: true,
          remainingBuildTicks: 0
        }
      },
      battalions: {
        ...initial.battalions,
        "battalion-rival-1": {
          ...initial.battalions["battalion-rival-1"],
          position: { x: 520, y: 300 },
          targetId: "building-villa-test",
          attack: 100,
          morale: 100,
          supply: 100
        }
      },
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          buildingIds: [...initial.settlements["settlement-capital"].buildingIds, "building-villa-test"]
        }
      }
    });

    const result = simulation.tick();
    const capital = simulation.getState().settlements["settlement-capital"];

    expect(simulation.getState().buildings["building-villa-test"]).toBeUndefined();
    expect(capital.population.citizens).toBe(initial.settlements["settlement-capital"].population.citizens - 2);
    expect(capital.population.happiness).toBeLessThan(initial.settlements["settlement-capital"].population.happiness);
    expect(result.events.find((event) => event.type === "housing-destroyed")?.payload.civilianDeaths).toBe(2);
  });
});
