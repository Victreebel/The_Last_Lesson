import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("civic morale", () => {
  it("restores supplied battalion morale from a peaceful, housed, faithful home settlement", () => {
    const initial = createInitialWorld(505050);
    const simulation = new Simulation({
      ...initial,
      settlements: {
        ...initial.settlements,
        "settlement-rival": {
          ...initial.settlements["settlement-rival"],
          population: {
            ...initial.settlements["settlement-rival"].population,
            happiness: 80,
            loyalty: 80
          },
          internalFaith: 60,
          externalReligiousPressure: 0
        }
      },
      battalions: {
        ...initial.battalions,
        "battalion-rival-1": {
          ...initial.battalions["battalion-rival-1"],
          position: { x: 1120, y: 390 },
          morale: 70,
          supply: 100
        }
      }
    });

    simulation.runTicks(3);
    const battalion = simulation.getState().battalions["battalion-rival-1"];

    expect(battalion.morale).toBe(71);
    expect(simulation.getEventLog().some((event) => event.type === "morale-recovered")).toBe(true);
  });
});
