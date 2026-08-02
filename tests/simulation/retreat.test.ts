import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("retreat orders", () => {
  it("cancels combat and sends a field force back to its governing castle", () => {
    const initial = createInitialWorld(707070);
    const simulation = new Simulation({
      ...initial,
      battalions: {
        ...initial.battalions,
        "battalion-rival-1": { ...initial.battalions["battalion-rival-1"], targetId: "building-castle", morale: 70 }
      }
    });
    simulation.enqueueCommand({ id: "retreat", issuedBy: "player-1", tick: 1, type: "retreat-battalion", payload: { battalionId: "battalion-rival-1" } });
    const result = simulation.tick();
    const battalion = simulation.getState().battalions["battalion-rival-1"];

    expect(battalion.targetId).toBeUndefined();
    expect(battalion.morale).toBe(68);
    expect(result.events.some((event) => event.type === "battalion-retreated")).toBe(true);
  });
});
