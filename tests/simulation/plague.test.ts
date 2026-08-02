import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("plague", () => {
  it("turns sustained health and food failure into an explainable localized outbreak", () => {
    const initial = createInitialWorld(202020);
    const simulation = new Simulation({
      ...initial,
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          localFood: 0,
          population: { ...initial.settlements["settlement-capital"].population, health: 35 }
        }
      }
    });

    const result = simulation.tick();
    const capital = simulation.getState().settlements["settlement-capital"];

    expect(capital.plagueTicks).toBe(2);
    expect(capital.population.citizens).toBeLessThan(initial.settlements["settlement-capital"].population.citizens - 1);
    expect(result.events.some((event) => event.type === "plague-started")).toBe(true);
    expect(result.events.some((event) => event.type === "plague-spread")).toBe(true);
  });

  it("resolves after three deterministic outbreak ticks instead of persisting indefinitely", () => {
    const initial = createInitialWorld(202021);
    const simulation = new Simulation({
      ...initial,
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          localFood: 0,
          population: { ...initial.settlements["settlement-capital"].population, health: 35 }
        }
      }
    });

    simulation.tick();
    simulation.tick();
    const result = simulation.tick();
    const capital = simulation.getState().settlements["settlement-capital"];

    expect(capital.plagueTicks).toBe(0);
    expect(result.events.some((event) => event.type === "plague-ended")).toBe(true);
  });
});
