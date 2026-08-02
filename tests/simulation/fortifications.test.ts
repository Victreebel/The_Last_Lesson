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
});
