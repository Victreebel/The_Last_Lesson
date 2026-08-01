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
      (battalion) => battalion.destination?.x === 650 && battalion.destination?.y === 300
    );
    const heir = state.heirs["heir-rival"];

    expect(rivalBattalions).toHaveLength(2);
    expect(expedition?.targetId).toBeUndefined();
    expect(heir.lastDecision?.action).toBe("Scout the frontier");
    expect(state.doctrines[heir.lastDoctrineId ?? ""]?.preferredAction).toBe("Scout the frontier");
  });

  it("turns first contact into an attack on the observed throne", () => {
    const simulation = new Simulation(createInitialWorld(777));

    simulation.runTicks(60);

    const state = simulation.getState();
    const assault = Object.values(state.battalions).find(
      (battalion) => battalion.ownerEmpireId === "empire-rival" && battalion.targetId === "building-castle"
    );

    expect(assault?.position).toEqual(state.buildings["building-castle"]?.position);
    expect(
      simulation
        .getEventLog()
        .some((event) => event.type === "heir-decision" && event.payload.action === "Lead an expedition")
    ).toBe(true);
  });
});
