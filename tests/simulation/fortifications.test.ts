import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("fortifications", () => {
  it("makes hostile walls a stronger movement obstacle than hostile gates", () => {
    const initial = createInitialWorld(101010);
    const makeSimulation = (kind: "wall" | "gate") => new Simulation({
      ...initial,
      buildings: { ...initial.buildings, [`test-${kind}`]: { id: `test-${kind}`, ownerEmpireId: "empire-player", settlementId: "settlement-capital", kind, position: { x: 1040, y: 420 }, defense: 100, complete: true, remainingBuildTicks: 0 } },
      battalions: { ...initial.battalions, "battalion-rival-1": { ...initial.battalions["battalion-rival-1"], destination: { x: 1200, y: 420 } } }
    });
    const wall = makeSimulation("wall");
    const gate = makeSimulation("gate");
    wall.tick();
    gate.tick();
    expect(wall.getState().battalions["battalion-rival-1"].position.x).toBeLessThan(
      gate.getState().battalions["battalion-rival-1"].position.x
    );
  });

  it("does not apply land fortification penalties to warships", () => {
    const initial = createInitialWorld(101011);
    const simulation = new Simulation({
      ...initial,
      buildings: {
        ...initial.buildings,
        "test-wall": { id: "test-wall", ownerEmpireId: "empire-player", settlementId: "settlement-capital", kind: "wall", position: { x: 650, y: 520 }, defense: 100, complete: true, remainingBuildTicks: 0 }
      },
      caravans: {
        "test-ship": { id: "test-ship", ownerEmpireId: "empire-rival", settlementId: "settlement-rival", kind: "ship", position: { x: 650, y: 520 }, destination: { x: 810, y: 520 }, cargoFood: 0, capacity: 52, passengerBattalionIds: [], defense: 110, maxDefense: 110, speed: 56 }
      }
    });
    simulation.tick();
    expect(simulation.getState().caravans["test-ship"].position.x).toBe(706);
  });
});
