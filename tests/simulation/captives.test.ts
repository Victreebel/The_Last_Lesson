import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, type BattalionState } from "../../src/simulation/state/WorldState";

describe("captives", () => {
  it("houses captives taken from defeated battalions and assimilates them through a Town Square", () => {
    const initial = createInitialWorld(6161);
    const attacker: BattalionState = {
      id: "battalion-captor-test",
      ownerEmpireId: "empire-player",
      settlementId: "settlement-capital",
      position: { x: 1040, y: 420 },
      targetId: "battalion-rival-1",
      specialization: "militia",
      size: 10,
      attack: 100,
      defense: 100,
      maxDefense: 100,
      range: 60,
      speed: 44,
      attackCooldownTicks: 1,
      attackCooldownRemaining: 0,
      morale: 100,
      devotion: 60,
      supply: 100
    };
    const simulation = new Simulation({
      ...initial,
      buildings: {
        ...initial.buildings,
        "building-hovel-test": {
          id: "building-hovel-test",
          ownerEmpireId: "empire-player",
          settlementId: "settlement-capital",
          kind: "hovel",
          position: { x: 500, y: 300 },
          defense: 50,
          complete: true,
          remainingBuildTicks: 0
        },
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
      battalions: {
        ...initial.battalions,
        "battalion-rival-1": { ...initial.battalions["battalion-rival-1"], defense: 1 },
        [attacker.id]: attacker
      },
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          buildingIds: [
            ...initial.settlements["settlement-capital"].buildingIds,
            "building-hovel-test",
            "building-town-square-test"
          ]
        }
      }
    });

    const battle = simulation.tick();
    expect(simulation.getState().settlements["settlement-capital"].population.captives).toBe(4);
    expect(simulation.getState().settlements["settlement-rival"].population.militarizedCitizens).toBe(0);
    expect(battle.events.some((event) => event.type === "captives-taken")).toBe(true);

    simulation.enqueueCommand({
      id: "assimilate-captives",
      issuedBy: "player-1",
      tick: 2,
      type: "assimilate-captives",
      payload: { settlementId: "settlement-capital", count: 4 }
    });
    const assimilation = simulation.tick();

    expect(simulation.getState().settlements["settlement-capital"].population.captives).toBe(0);
    expect(simulation.getState().settlements["settlement-capital"].population.citizens).toBe(28);
    expect(assimilation.events.some((event) => event.type === "captives-assimilated")).toBe(true);
  });

  it("liberates captives when their hovel is destroyed", () => {
    const initial = createInitialWorld(7171);
    const simulation = new Simulation({
      ...initial,
      buildings: {
        ...initial.buildings,
        "building-hovel-test": {
          id: "building-hovel-test",
          ownerEmpireId: "empire-player",
          settlementId: "settlement-capital",
          kind: "hovel",
          position: { x: 520, y: 300 },
          defense: 1,
          complete: true,
          remainingBuildTicks: 0
        }
      },
      battalions: {
        ...initial.battalions,
        "battalion-rival-1": {
          ...initial.battalions["battalion-rival-1"],
          position: { x: 520, y: 300 },
          targetId: "building-hovel-test",
          attack: 100,
          morale: 100,
          supply: 100
        }
      },
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          buildingIds: [...initial.settlements["settlement-capital"].buildingIds, "building-hovel-test"],
          population: {
            ...initial.settlements["settlement-capital"].population,
            captives: 4
          }
        }
      }
    });

    const result = simulation.tick();

    expect(simulation.getState().buildings["building-hovel-test"]).toBeUndefined();
    expect(simulation.getState().settlements["settlement-capital"].population.captives).toBe(0);
    expect(result.events.some((event) => event.type === "captives-liberated")).toBe(true);
  });
});
