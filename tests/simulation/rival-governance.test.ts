import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("rival governance", () => {
  it("raises a second battalion during the protected opening", () => {
    const simulation = new Simulation(createInitialWorld(777));

    simulation.runTicks(9);

    const state = simulation.getState();
    const rivalBattalions = Object.values(state.battalions).filter(
      (battalion) => battalion.ownerEmpireId === "empire-rival" && battalion.settlementId === "settlement-rival"
    );

    expect(rivalBattalions).toHaveLength(2);
  });

  it("turns first contact into an attack on the observed throne", () => {
    const simulation = new Simulation(createInitialWorld(777));

    simulation.runTicks(60);

    const state = simulation.getState();
    const assault = Object.values(state.battalions).find(
      (battalion) =>
        battalion.ownerEmpireId === "empire-rival" &&
        battalion.settlementId === "settlement-rival" &&
        battalion.targetId === "building-castle"
    );

    expect(assault?.position).toEqual(state.buildings["building-castle"]?.position);
    expect(
      simulation
        .getEventLog()
        .some((event) => event.type === "heir-decision" && event.payload.action === "Lead an expedition")
    ).toBe(true);
  });
});
