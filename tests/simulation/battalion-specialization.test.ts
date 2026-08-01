import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, type BattalionState } from "../../src/simulation/state/WorldState";

describe("battalion specializations", () => {
  it("requires Military Quarters and resources before training specialized units", () => {
    const initial = createInitialWorld(8080);
    const simulation = new Simulation({
      ...initial,
      empires: {
        ...initial.empires,
        "empire-player": {
          ...initial.empires["empire-player"],
          resources: { ...initial.empires["empire-player"].resources, iron: 8 }
        }
      },
      buildings: {
        ...initial.buildings,
        "building-military-quarters-test": {
          id: "building-military-quarters-test",
          ownerEmpireId: "empire-player",
          settlementId: "settlement-capital",
          kind: "military-quarters",
          position: { x: 500, y: 300 },
          defense: 150,
          complete: true,
          remainingBuildTicks: 0
        }
      },
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          buildingIds: [...initial.settlements["settlement-capital"].buildingIds, "building-military-quarters-test"]
        }
      }
    });
    simulation.enqueueCommand({
      id: "train-spears",
      issuedBy: "player-1",
      tick: 1,
      type: "create-battalion",
      payload: { settlementId: "settlement-capital", size: 8, specialization: "spears" }
    });

    simulation.tick();
    const spears = Object.values(simulation.getState().battalions).find(
      (battalion) => battalion.ownerEmpireId === "empire-player"
    );

    expect(spears?.specialization).toBe("spears");
    expect(spears?.attack).toBe(16);
    expect(spears?.defense).toBe(96);
    expect(simulation.getState().empires["empire-player"].resources.iron).toBe(0);
    expect(simulation.getState().settlements["settlement-capital"].localFood).toBe(49);
  });

  it("applies counter advantages and attack cooldowns deterministically", () => {
    const initial = createInitialWorld(9090);
    const spears: BattalionState = {
      id: "battalion-spears-test",
      ownerEmpireId: "empire-player",
      settlementId: "settlement-capital",
      position: { x: 600, y: 300 },
      targetId: "battalion-raiders-test",
      specialization: "spears",
      size: 5,
      attack: 10,
      defense: 60,
      maxDefense: 60,
      range: 60,
      speed: 40,
      attackCooldownTicks: 1,
      attackCooldownRemaining: 0,
      morale: 100,
      devotion: 55,
      supply: 100
    };
    const raiders: BattalionState = {
      id: "battalion-raiders-test",
      ownerEmpireId: "empire-rival",
      settlementId: "settlement-rival",
      position: { x: 620, y: 300 },
      specialization: "raiders",
      size: 5,
      attack: 10,
      defense: 100,
      maxDefense: 100,
      range: 60,
      speed: 40,
      attackCooldownTicks: 1,
      attackCooldownRemaining: 0,
      morale: 100,
      devotion: 55,
      supply: 100
    };
    const simulation = new Simulation({
      ...initial,
      battalions: { ...initial.battalions, [spears.id]: spears, [raiders.id]: raiders }
    });

    simulation.tick();
    expect(simulation.getState().battalions[raiders.id].defense).toBe(88);
    simulation.tick();
    expect(simulation.getState().battalions[raiders.id].defense).toBe(88);
    simulation.tick();
    expect(simulation.getState().battalions[raiders.id].defense).toBe(76);
  });
});
