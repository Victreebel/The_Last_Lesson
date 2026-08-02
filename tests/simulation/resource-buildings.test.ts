import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("terrain resource buildings", () => {
  it("turns labor into resources only after matching terrain buildings finish construction", () => {
    const simulation = new Simulation(createInitialWorld(31337));
    const place = (id: string, kind: "farm" | "lumber-mill" | "mine", position: { x: number; y: number }) =>
      simulation.enqueueCommand({
        id,
        issuedBy: "player-1",
        tick: 1,
        type: "place-building",
        payload: { settlementId: "settlement-capital", kind, position }
      });

    place("place-farm", "farm", { x: 160, y: 170 });
    place("place-mill", "lumber-mill", { x: 170, y: 650 });
    place("place-mine", "mine", { x: 1110, y: 180 });
    simulation.enqueueCommand({
      id: "staff-resources",
      issuedBy: "player-1",
      tick: 2,
      type: "assign-labor",
      payload: {
        settlementId: "settlement-capital",
        farmers: 7,
        builders: 3,
        lumberjacks: 7,
        miners: 7
      }
    });

    simulation.runTicks(5);
    const state = simulation.getState();

    expect(state.settlements["settlement-capital"].localFood).toBeGreaterThan(45);
    expect(state.empires["empire-player"].resources.wood).toBeGreaterThan(12);
    expect(state.empires["empire-player"].resources.iron).toBeGreaterThanOrEqual(7);
  });
});
