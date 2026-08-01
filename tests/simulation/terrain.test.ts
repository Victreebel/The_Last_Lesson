import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("terrain rules", () => {
  it("allows terrain-specific structures only on their matching land type", () => {
    const simulation = new Simulation(createInitialWorld(24680));

    simulation.enqueueCommand({
      id: "farm-on-fertile",
      issuedBy: "player-1",
      tick: 1,
      type: "place-building",
      payload: {
        settlementId: "settlement-capital",
        kind: "farm",
        position: { x: 160, y: 170 }
      }
    });
    simulation.enqueueCommand({
      id: "mill-in-forest",
      issuedBy: "player-1",
      tick: 1,
      type: "place-building",
      payload: {
        settlementId: "settlement-capital",
        kind: "lumber-mill",
        position: { x: 170, y: 650 }
      }
    });
    simulation.enqueueCommand({
      id: "mine-on-grass",
      issuedBy: "player-1",
      tick: 1,
      type: "place-building",
      payload: {
        settlementId: "settlement-capital",
        kind: "mine",
        position: { x: 450, y: 500 }
      }
    });
    simulation.enqueueCommand({
      id: "mine-on-iron",
      issuedBy: "player-1",
      tick: 1,
      type: "place-building",
      payload: {
        settlementId: "settlement-capital",
        kind: "mine",
        position: { x: 1110, y: 180 }
      }
    });

    const result = simulation.tick();
    const builtKinds = Object.values(simulation.getState().buildings).map((building) => building.kind);

    expect(builtKinds).toContain("farm");
    expect(builtKinds).toContain("lumber-mill");
    expect(builtKinds.filter((kind) => kind === "mine")).toHaveLength(1);
    expect(result.events.filter((event) => event.type === "command-rejected")).toHaveLength(1);
  });
});
