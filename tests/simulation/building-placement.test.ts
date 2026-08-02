import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("building placement", () => {
  it("rejects overlapping foundations without spending resources", () => {
    const initial = createInitialWorld(808080);
    const simulation = new Simulation(initial);
    const command = (id: string) => ({
      id,
      issuedBy: "player-1" as const,
      tick: 1,
      type: "place-building" as const,
      payload: { settlementId: "settlement-capital", kind: "farm" as const, position: { x: 160, y: 170 } }
    });
    simulation.enqueueCommand(command("farm-first"));
    simulation.enqueueCommand(command("farm-overlap"));

    const result = simulation.tick();
    const farms = Object.values(simulation.getState().buildings).filter((building) => building.kind === "farm");

    expect(farms).toHaveLength(1);
    expect(simulation.getState().empires["empire-player"].resources.wood).toBe(initial.empires["empire-player"].resources.wood - 8);
    expect(result.events.some((event) => event.type === "command-rejected" && event.payload.reason === "occupied")).toBe(true);
  });
});
