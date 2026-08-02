import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, type BattalionState } from "../../src/simulation/state/WorldState";

describe("attack-move orders", () => {
  it("acquires a visible enemy, then resumes its saved advance route after the enemy falls", () => {
    const initial = createInitialWorld(31337);
    const advancingBattalion: BattalionState = {
      id: "battalion-advance-test",
      ownerEmpireId: "empire-player",
      settlementId: "settlement-capital",
      position: { x: 520, y: 320 },
      specialization: "spears",
      size: 6,
      attack: 20,
      defense: 72,
      maxDefense: 72,
      range: 70,
      speed: 40,
      attackCooldownTicks: 1,
      attackCooldownRemaining: 0,
      morale: 100,
      devotion: 55,
      supply: 100
    };
    const ambusher: BattalionState = {
      id: "battalion-ambusher-test",
      ownerEmpireId: "empire-rival",
      settlementId: "settlement-rival",
      position: { x: 560, y: 320 },
      specialization: "militia",
      size: 1,
      attack: 1,
      defense: 1,
      maxDefense: 1,
      range: 40,
      speed: 20,
      attackCooldownTicks: 1,
      attackCooldownRemaining: 0,
      morale: 50,
      devotion: 30,
      supply: 100
    };
    const simulation = new Simulation({
      ...initial,
      battalions: {
        [advancingBattalion.id]: advancingBattalion,
        [ambusher.id]: ambusher
      }
    });

    simulation.enqueueCommand({
      id: "advance-order",
      issuedBy: "player-1",
      tick: 1,
      type: "attack-move-battalion",
      payload: { battalionId: advancingBattalion.id, destination: { x: 820, y: 320 } }
    });

    const firstTick = simulation.tick();
    expect(firstTick.events.some((event) => event.type === "attack-move-engaged")).toBe(true);
    expect(simulation.getState().battalions[ambusher.id]).toBeUndefined();

    simulation.tick();
    const advancing = simulation.getState().battalions[advancingBattalion.id];
    expect(advancing.targetId).toBeUndefined();
    expect(advancing.attackMoveDestination).toEqual({ x: 820, y: 320 });
    expect(advancing.destination).toEqual({ x: 820, y: 320 });
  });

  it("cancels an active advance when a direct move order replaces it", () => {
    const initial = createInitialWorld(31338);
    const battalion: BattalionState = {
      id: "battalion-cancel-advance-test",
      ownerEmpireId: "empire-player",
      settlementId: "settlement-capital",
      position: { x: 520, y: 320 },
      specialization: "militia",
      size: 4,
      attack: 8,
      defense: 48,
      maxDefense: 48,
      range: 40,
      speed: 40,
      attackCooldownTicks: 1,
      attackCooldownRemaining: 0,
      morale: 70,
      devotion: 55,
      supply: 100
    };
    const simulation = new Simulation({ ...initial, battalions: { [battalion.id]: battalion } });
    simulation.enqueueCommand({
      id: "advance-order",
      issuedBy: "player-1",
      tick: 1,
      type: "attack-move-battalion",
      payload: { battalionId: battalion.id, destination: { x: 820, y: 320 } }
    });
    simulation.enqueueCommand({
      id: "move-order",
      issuedBy: "player-1",
      tick: 2,
      type: "move-battalion",
      payload: { battalionId: battalion.id, destination: { x: 520, y: 520 } }
    });

    simulation.runTicks(2);
    const updated = simulation.getState().battalions[battalion.id];
    expect(updated.attackMoveDestination).toBeUndefined();
    expect(updated.targetId).toBeUndefined();
  });
});
