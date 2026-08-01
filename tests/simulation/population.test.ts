import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("population", () => {
  it("turns sustained surplus food and villa capacity into citizen growth", () => {
    const initial = createInitialWorld(7272);
    const simulation = new Simulation({
      ...initial,
      buildings: {
        ...initial.buildings,
        "building-villa-growth": {
          id: "building-villa-growth",
          ownerEmpireId: "empire-player",
          settlementId: "settlement-capital",
          kind: "villa",
          position: { x: 420, y: 320 },
          defense: 90,
          complete: true,
          remainingBuildTicks: 0
        }
      },
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          buildingIds: [...initial.settlements["settlement-capital"].buildingIds, "building-villa-growth"],
          localFood: 110
        }
      }
    });

    const result = simulation.tick();
    const capital = simulation.getState().settlements["settlement-capital"];

    expect(capital.population.citizens).toBe(25);
    expect(capital.population.growthProgress).toBe(7);
    expect(result.events.some((event) => event.type === "population-grown")).toBe(true);
  });

  it("applies starvation when food cannot meet the settlement's population needs", () => {
    const initial = createInitialWorld(7373);
    const simulation = new Simulation({
      ...initial,
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          localFood: 0
        }
      }
    });

    const result = simulation.tick();
    const capital = simulation.getState().settlements["settlement-capital"];

    expect(capital.population.citizens).toBe(23);
    expect(capital.localFood).toBe(0);
    expect(capital.population.growthProgress).toBe(0);
    expect(result.events.some((event) => event.type === "starvation")).toBe(true);
  });
});
