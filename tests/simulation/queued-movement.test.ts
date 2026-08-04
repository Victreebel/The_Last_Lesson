import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, type BattalionState } from "../../src/simulation/state/WorldState";

describe("queued battalion movement", () => {
  it("keeps a Shift-appended route deterministic and advances through every waypoint", () => {
    const initial = createInitialWorld(744);
    const battalion: BattalionState = {
      id: "battalion-waypoint-test",
      ownerEmpireId: "empire-player",
      settlementId: "settlement-capital",
      position: { x: 520, y: 320 },
      specialization: "spears",
      size: 6,
      attack: 12,
      defense: 72,
      maxDefense: 72,
      range: 64,
      speed: 40,
      attackCooldownTicks: 1,
      attackCooldownRemaining: 0,
      morale: 100,
      devotion: 55,
      supply: 100
    };
    const simulation = new Simulation({ ...initial, battalions: { [battalion.id]: battalion } });

    simulation.enqueueCommand({
      id: "move-first",
      issuedBy: "player-1",
      tick: 1,
      type: "move-battalion",
      payload: { battalionId: battalion.id, destination: { x: 640, y: 320 } }
    });
    simulation.enqueueCommand({
      id: "move-append",
      issuedBy: "player-1",
      tick: 2,
      type: "move-battalion",
      payload: { battalionId: battalion.id, destination: { x: 680, y: 320 }, append: true }
    });

    simulation.runTicks(2);
    expect(simulation.getState().battalions[battalion.id]).toMatchObject({
      destination: { x: 640, y: 320 },
      waypoints: [{ x: 680, y: 320 }]
    });

    simulation.runTicks(2);
    expect(simulation.getState().battalions[battalion.id]).toMatchObject({
      position: { x: 680, y: 320 },
      destination: undefined,
      waypoints: undefined
    });
  });

  it("replaces the route when a normal direct move follows queued orders", () => {
    const initial = createInitialWorld(745);
    const battalion: BattalionState = {
      ...initial.battalions["battalion-rival-1"],
      id: "battalion-route-replacement-test",
      ownerEmpireId: "empire-player",
      settlementId: "settlement-capital",
      position: { x: 520, y: 320 }
    };
    const simulation = new Simulation({ ...initial, battalions: { [battalion.id]: battalion } });

    simulation.enqueueCommand({
      id: "queued-move",
      issuedBy: "player-1",
      tick: 1,
      type: "move-battalion",
      payload: { battalionId: battalion.id, destination: { x: 640, y: 320 }, append: true }
    });
    simulation.enqueueCommand({
      id: "replacement-move",
      issuedBy: "player-1",
      tick: 2,
      type: "move-battalion",
      payload: { battalionId: battalion.id, destination: { x: 540, y: 480 } }
    });

    simulation.runTicks(2);
    expect(simulation.getState().battalions[battalion.id]).toMatchObject({
      destination: { x: 540, y: 480 },
      waypoints: undefined,
      attackMoveDestination: undefined,
      targetId: undefined
    });
  });

  it("clears queued movement when an explicit attack replaces the route", () => {
    const initial = createInitialWorld(746);
    const crownBattalion: BattalionState = {
      ...initial.battalions["battalion-rival-1"],
      id: "battalion-route-attack-test",
      ownerEmpireId: "empire-player",
      settlementId: "settlement-capital",
      position: { x: 800, y: 420 },
      destination: { x: 840, y: 420 },
      waypoints: [{ x: 880, y: 420 }]
    };
    const simulation = new Simulation({ ...initial, battalions: { ...initial.battalions, [crownBattalion.id]: crownBattalion } });

    simulation.enqueueCommand({
      id: "attack-replaces-route",
      issuedBy: "player-1",
      tick: 1,
      type: "attack-target",
      payload: { battalionId: crownBattalion.id, targetId: "battalion-rival-1" }
    });

    simulation.tick();
    expect(simulation.getState().battalions[crownBattalion.id]).toMatchObject({
      targetId: "battalion-rival-1",
      waypoints: undefined,
      attackMoveDestination: undefined
    });
  });
});
