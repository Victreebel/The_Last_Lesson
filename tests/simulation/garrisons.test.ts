import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, type BattalionState } from "../../src/simulation/state/WorldState";

function playerBattalion(): BattalionState {
  return {
    id: "battalion-garrison-test",
    ownerEmpireId: "empire-player",
    settlementId: "settlement-capital",
    position: { x: 460, y: 300 },
    specialization: "militia",
    size: 8,
    attack: 16,
    defense: 80,
    maxDefense: 80,
    range: 60,
    speed: 44,
    attackCooldownTicks: 1,
    attackCooldownRemaining: 0,
    morale: 80,
    devotion: 55,
    supply: 100
  };
}

describe("garrisons", () => {
  it("garrisons a nearby battalion and releases it when it receives a movement order", () => {
    const initial = createInitialWorld(8181);
    const battalion = playerBattalion();
    const simulation = new Simulation({
      ...initial,
      buildings: {
        ...initial.buildings,
        "building-outpost-test": {
          id: "building-outpost-test",
          ownerEmpireId: "empire-player",
          settlementId: "settlement-capital",
          kind: "outpost",
          position: { x: 430, y: 300 },
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
          buildingIds: [...initial.settlements["settlement-capital"].buildingIds, "building-outpost-test"],
          battalionIds: [battalion.id],
          population: {
            ...initial.settlements["settlement-capital"].population,
            militarizedCitizens: battalion.size
          }
        }
      }
    });

    simulation.enqueueCommand({
      id: "garrison-outpost",
      issuedBy: "player-1",
      tick: 1,
      type: "garrison-battalion",
      payload: { battalionId: battalion.id, buildingId: "building-outpost-test" }
    });
    const garrisonResult = simulation.tick();

    expect(simulation.getState().buildings["building-outpost-test"].garrisonBattalionIds).toEqual([battalion.id]);
    expect(simulation.getState().battalions[battalion.id].garrisonedInBuildingId).toBe("building-outpost-test");
    expect(garrisonResult.events.some((event) => event.type === "battalion-garrisoned")).toBe(true);

    simulation.enqueueCommand({
      id: "release-outpost",
      issuedBy: "player-1",
      tick: 2,
      type: "move-battalion",
      payload: { battalionId: battalion.id, destination: { x: 650, y: 300 } }
    });
    const releaseResult = simulation.tick();

    expect(simulation.getState().buildings["building-outpost-test"].garrisonBattalionIds).toEqual([]);
    expect(simulation.getState().battalions[battalion.id].garrisonedInBuildingId).toBeUndefined();
    expect(releaseResult.events.some((event) => event.type === "battalion-ungarrisoned")).toBe(true);
  });

  it("kills a structure's garrison when a defensive work is breached", () => {
    const initial = createInitialWorld(8282);
    const garrison = { ...playerBattalion(), garrisonedInBuildingId: "building-outpost-breached", position: { x: 430, y: 300 } };
    const attacker: BattalionState = {
      ...initial.battalions["battalion-rival-1"],
      id: "battalion-breach-test",
      position: { x: 470, y: 300 },
      targetId: "building-outpost-breached",
      attack: 200,
      range: 80,
      attackCooldownRemaining: 0
    };
    const simulation = new Simulation({
      ...initial,
      buildings: {
        ...initial.buildings,
        "building-outpost-breached": {
          id: "building-outpost-breached",
          ownerEmpireId: "empire-player",
          settlementId: "settlement-capital",
          kind: "outpost",
          position: { x: 430, y: 300 },
          defense: 1,
          complete: true,
          remainingBuildTicks: 0,
          garrisonBattalionIds: [garrison.id]
        }
      },
      battalions: { ...initial.battalions, [garrison.id]: garrison, [attacker.id]: attacker },
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          buildingIds: [...initial.settlements["settlement-capital"].buildingIds, "building-outpost-breached"],
          battalionIds: [garrison.id],
          population: {
            ...initial.settlements["settlement-capital"].population,
            militarizedCitizens: garrison.size
          }
        },
        "settlement-rival": {
          ...initial.settlements["settlement-rival"],
          battalionIds: [attacker.id]
        }
      }
    });

    const result = simulation.tick();

    expect(simulation.getState().buildings["building-outpost-breached"]).toBeUndefined();
    expect(simulation.getState().battalions[garrison.id]).toBeUndefined();
    expect(result.events.filter((event) => event.type === "entity-destroyed").map((event) => event.payload.entityId)).toContain(garrison.id);
  });
});
