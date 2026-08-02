import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("population", () => {
  it("releases civilian labor when citizens are mobilized into a battalion", () => {
    const initial = createInitialWorld(7171);
    const simulation = new Simulation({
      ...initial,
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          population: {
            ...initial.settlements["settlement-capital"].population,
            farmers: 8,
            builders: 4,
            lumberjacks: 6,
            miners: 4,
            luxuryWorkers: 2
          }
        }
      }
    });
    simulation.enqueueCommand({
      id: "mobilize-eight",
      issuedBy: "player-1",
      tick: 1,
      type: "create-battalion",
      payload: { settlementId: "settlement-capital", size: 8, specialization: "militia" }
    });

    simulation.tick();
    const population = simulation.getState().settlements["settlement-capital"].population;
    const assignedWorkers =
      population.farmers + population.builders + population.lumberjacks + population.miners + population.luxuryWorkers;

    expect(population.militarizedCitizens).toBe(8);
    expect(assignedWorkers).toBeLessThanOrEqual(population.citizens - population.militarizedCitizens);
    expect(population.farmers).toBe(8);
    expect(population.builders).toBe(0);
    expect(population.luxuryWorkers).toBe(0);
    expect(population.miners).toBe(2);
  });

  it("releases labor when starvation reduces the available population", () => {
    const initial = createInitialWorld(7271);
    const simulation = new Simulation({
      ...initial,
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          localFood: 0,
          population: {
            ...initial.settlements["settlement-capital"].population,
            farmers: 8,
            builders: 4,
            lumberjacks: 6,
            miners: 4,
            luxuryWorkers: 2
          }
        }
      }
    });

    simulation.tick();
    const population = simulation.getState().settlements["settlement-capital"].population;
    const assignedWorkers =
      population.farmers + population.builders + population.lumberjacks + population.miners + population.luxuryWorkers;

    expect(population.citizens).toBe(23);
    expect(assignedWorkers).toBeLessThanOrEqual(population.citizens - population.militarizedCitizens);
    expect(population.farmers).toBe(8);
    expect(population.builders).toBe(3);
  });

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
