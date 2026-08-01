import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, type BattalionState } from "../../src/simulation/state/WorldState";

describe("caravans", () => {
  it("loads local food, travels, and restores a distant battalion's supply", () => {
    const initial = createInitialWorld(2727);
    const battalion: BattalionState = {
      id: "battalion-supply-test",
      ownerEmpireId: "empire-player",
      settlementId: "settlement-capital",
      position: { x: 660, y: 300 },
      specialization: "militia",
      size: 8,
      attack: 8,
      defense: 80,
      maxDefense: 80,
      range: 42,
      speed: 44,
      attackCooldownTicks: 1,
      attackCooldownRemaining: 0,
      morale: 70,
      devotion: 55,
      supply: 40
    };
    const simulation = new Simulation({
      ...initial,
      buildings: {
        ...initial.buildings,
        "building-town-square-test": {
          id: "building-town-square-test",
          ownerEmpireId: "empire-player",
          settlementId: "settlement-capital",
          kind: "town-square",
          position: { x: 520, y: 360 },
          defense: 150,
          complete: true,
          remainingBuildTicks: 0
        }
      },
      battalions: { ...initial.battalions, [battalion.id]: battalion },
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          buildingIds: [...initial.settlements["settlement-capital"].buildingIds, "building-town-square-test"],
          localFood: 60
        }
      }
    });
    simulation.enqueueCommand({
      id: "create-caravan",
      issuedBy: "player-1",
      tick: 1,
      type: "create-caravan",
      payload: { settlementId: "settlement-capital" }
    });
    simulation.enqueueCommand({
      id: "route-caravan",
      issuedBy: "player-1",
      tick: 2,
      type: "move-caravan",
      payload: { caravanId: "caravan-1-1", destination: { x: 660, y: 300 } }
    });

    const results = simulation.runTicks(4);
    const caravan = simulation.getState().caravans["caravan-1-1"];
    const suppliedBattalion = simulation.getState().battalions[battalion.id];

    expect(caravan.cargoFood).toBe(0);
    expect(simulation.getState().settlements["settlement-capital"].localFood).toBe(36);
    expect(simulation.getState().empires["empire-player"].resources.wood).toBe(32);
    expect(suppliedBattalion.supply).toBe(80);
    expect(results.flatMap((result) => result.events).some((event) => event.type === "supply-delivered")).toBe(true);
  });

  it("removes a destroyed caravan from the world and its settlement logistics", () => {
    const initial = createInitialWorld(2828);
    const attacker: BattalionState = {
      id: "battalion-raider-test",
      ownerEmpireId: "empire-player",
      settlementId: "settlement-capital",
      position: { x: 700, y: 300 },
      targetId: "caravan-rival-test",
      specialization: "raiders",
      size: 8,
      attack: 100,
      defense: 80,
      maxDefense: 80,
      range: 60,
      speed: 56,
      attackCooldownTicks: 1,
      attackCooldownRemaining: 0,
      morale: 100,
      devotion: 60,
      supply: 100
    };
    const simulation = new Simulation({
      ...initial,
      caravans: {
        "caravan-rival-test": {
          id: "caravan-rival-test",
          ownerEmpireId: "empire-rival",
          settlementId: "settlement-rival",
          kind: "caravan",
          position: { x: 700, y: 300 },
          cargoFood: 24,
          capacity: 24,
          defense: 1,
          maxDefense: 60,
          speed: 48
        }
      },
      battalions: { ...initial.battalions, [attacker.id]: attacker },
      settlements: {
        ...initial.settlements,
        "settlement-rival": {
          ...initial.settlements["settlement-rival"],
          caravanIds: ["caravan-rival-test"]
        }
      }
    });

    const result = simulation.tick();

    expect(simulation.getState().caravans["caravan-rival-test"]).toBeUndefined();
    expect(simulation.getState().settlements["settlement-rival"].caravanIds).toEqual([]);
    expect(result.events.some((event) => event.type === "caravan-destroyed")).toBe(true);
  });
});
