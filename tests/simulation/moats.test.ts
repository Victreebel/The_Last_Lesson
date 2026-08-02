import { describe, expect, it } from "vitest";
import {
  createInitialWorld,
  type BattalionState,
  type BuildingState
} from "../../src/simulation/state/WorldState";
import { Simulation } from "../../src/simulation/Simulation";

describe("moats", () => {
  it("slows enemy battalions while leaving the defending empire's movement unchanged", () => {
    const initial = createInitialWorld(171717);
    const moat: BuildingState = {
      id: "capital-moat",
      ownerEmpireId: "empire-player",
      settlementId: "settlement-capital",
      kind: "moat",
      position: { x: 500, y: 300 },
      defense: 160,
      complete: true,
      remainingBuildTicks: 0
    };
    const rival: BattalionState = {
      id: "rival-moat-test",
      ownerEmpireId: "empire-rival",
      settlementId: "settlement-rival",
      position: { x: 500, y: 300 },
      destination: { x: 600, y: 300 },
      specialization: "militia",
      size: 8,
      attack: 8,
      defense: 80,
      maxDefense: 80,
      range: 42,
      speed: 40,
      attackCooldownTicks: 1,
      attackCooldownRemaining: 0,
      morale: 70,
      devotion: 50,
      supply: 100
    };
    const defender: BattalionState = {
      ...rival,
      id: "crown-moat-test",
      ownerEmpireId: "empire-player",
      settlementId: "settlement-capital"
    };
    const simulation = new Simulation({
      ...initial,
      buildings: { ...initial.buildings, [moat.id]: moat },
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          buildingIds: [...initial.settlements["settlement-capital"].buildingIds, moat.id],
          battalionIds: [defender.id]
        },
        "settlement-rival": {
          ...initial.settlements["settlement-rival"],
          battalionIds: [rival.id]
        }
      },
      battalions: { [rival.id]: rival, [defender.id]: defender }
    });

    const result = simulation.tick();
    const state = simulation.getState();
    const rivalMove = result.events.find(
      (event) => event.type === "battalion-moved" && event.payload.battalionId === rival.id
    );

    expect(state.battalions[rival.id].position.x).toBe(520);
    expect(state.battalions[defender.id].position.x).toBe(540);
    expect(rivalMove?.payload.moatMultiplier).toBe(0.5);
  });
});
