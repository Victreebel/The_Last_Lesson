import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("rival governance", () => {
  it("raises a second battalion and launches an explainable expedition", () => {
    const simulation = new Simulation(createInitialWorld(777));

    simulation.runTicks(9);

    const state = simulation.getState();
    const rivalBattalions = Object.values(state.battalions).filter(
      (battalion) => battalion.ownerEmpireId === "empire-rival"
    );
    const expedition = rivalBattalions.find((battalion) => battalion.targetId === "building-castle");
    const heir = state.heirs["heir-rival"];

    expect(rivalBattalions).toHaveLength(2);
    expect(expedition?.destination).toEqual(state.buildings["building-castle"]?.position);
    expect(heir.lastDecision?.action).toBe("Lead an expedition");
    expect(state.doctrines[heir.lastDoctrineId ?? ""]?.preferredAction).toBe("Lead an expedition");
  });
});
