import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("faith and religion", () => {
  it("applies rival religious pressure and spends faith on a blessing", () => {
    const initial = createInitialWorld(424242);
    const simulation = new Simulation({
      ...initial,
      empires: {
        ...initial.empires,
        "empire-player": {
          ...initial.empires["empire-player"],
          resources: { ...initial.empires["empire-player"].resources, faith: 20 }
        }
      },
      buildings: {
        ...initial.buildings,
        "building-rival-castle": {
          ...initial.buildings["building-rival-castle"],
          position: { x: 700, y: 300 }
        }
      }
    });

    simulation.enqueueCommand({
      id: "bless-capital",
      issuedBy: "player-1",
      tick: 1,
      type: "cast-miracle",
      payload: {
        empireId: "empire-player",
        kind: "bless-harvest",
        settlementId: "settlement-capital"
      }
    });

    const result = simulation.tick();
    const capital = simulation.getState().settlements["settlement-capital"];

    expect(capital.localFood).toBe(54);
    expect(capital.internalFaith).toBe(58);
    expect(capital.externalReligiousPressure).toBeGreaterThan(0);
    expect(capital.pressures.rebellion).toBe(0);
    expect(simulation.getState().empires["empire-player"].resources.faith).toBeLessThan(20);
    expect(result.events.some((event) => event.type === "miracle-cast")).toBe(true);
    expect(result.events.some((event) => event.type === "religious-pressure-changed")).toBe(true);
  });
});
