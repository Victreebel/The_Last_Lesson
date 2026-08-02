import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("construction labor", () => {
  it("requires assigned builders before a placed foundation can progress", () => {
    const initial = createInitialWorld(111111);
    const simulation = new Simulation(initial);
    simulation.enqueueCommand({ id: "farm", issuedBy: "player-1", tick: 1, type: "place-building", payload: { settlementId: "settlement-capital", kind: "farm", position: { x: 160, y: 170 } } });
    const firstTick = simulation.tick();
    const farm = Object.values(simulation.getState().buildings).find((building) => building.kind === "farm");
    expect(farm?.complete).toBe(false);
    expect(firstTick.events.some((event) => event.type === "construction-stalled")).toBe(true);

    simulation.enqueueCommand({ id: "builders", issuedBy: "player-1", tick: 2, type: "assign-labor", payload: { settlementId: "settlement-capital", farmers: 0, builders: 1, lumberjacks: 0, miners: 0 } });
    simulation.runTicks(2);
    expect(simulation.getState().buildings[farm!.id].complete).toBe(true);
  });
});
