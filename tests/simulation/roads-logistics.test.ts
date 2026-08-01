import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, type BattalionState } from "../../src/simulation/state/WorldState";

describe("roads and logistics", () => {
  it("accelerates forces on a road and restores their supply", () => {
    const initial = createInitialWorld(7070);
    const battalion: BattalionState = {
      id: "battalion-road-test",
      ownerEmpireId: "empire-player",
      settlementId: "settlement-capital",
      position: { x: 500, y: 300 },
      destination: { x: 700, y: 300 },
      specialization: "militia",
      size: 8,
      attack: 10,
      defense: 80,
      maxDefense: 80,
      range: 42,
      speed: 40,
      attackCooldownTicks: 1,
      attackCooldownRemaining: 0,
      morale: 70,
      devotion: 55,
      supply: 80
    };
    const simulation = new Simulation({
      ...initial,
      buildings: {
        ...initial.buildings,
        "building-road-test": {
          id: "building-road-test",
          ownerEmpireId: "empire-player",
          settlementId: "settlement-capital",
          kind: "road",
          position: { x: 500, y: 300 },
          defense: 40,
          complete: true,
          remainingBuildTicks: 0
        }
      },
      battalions: { ...initial.battalions, [battalion.id]: battalion }
    });

    simulation.tick();
    const updated = simulation.getState().battalions[battalion.id];

    expect(updated.position.x).toBe(552);
    expect(updated.supply).toBe(85);
  });
});
