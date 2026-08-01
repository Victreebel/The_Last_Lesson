import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("rival governance", () => {
  it("raises a second battalion and scouts before it has observed a rival throne", () => {
    const simulation = new Simulation(createInitialWorld(777));

    simulation.runTicks(9);

    const state = simulation.getState();
    const rivalBattalions = Object.values(state.battalions).filter(
      (battalion) => battalion.ownerEmpireId === "empire-rival"
    );
    const expedition = rivalBattalions.find(
      (battalion) => battalion.destination?.x === 700 && battalion.destination?.y === 300
    );
    const heir = state.heirs["heir-rival"];

    expect(rivalBattalions).toHaveLength(2);
    expect(expedition?.targetId).toBeUndefined();
    expect(heir.lastDecision?.action).toBe("Scout the frontier");
    expect(state.doctrines[heir.lastDoctrineId ?? ""]?.preferredAction).toBe("Scout the frontier");
  });
});
