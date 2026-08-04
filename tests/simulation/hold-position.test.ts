import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createReplayRecord, runReplayRecord } from "../../src/simulation/replay/ReplayRecord";
import { createSaveGame, restoreSaveGame } from "../../src/simulation/save/SaveGame";
import { createInitialWorld, type BattalionState } from "../../src/simulation/state/WorldState";

describe("hold position orders", () => {
  it("stops an active field order, creates an explainable lesson, and releases on a new move", () => {
    const initial = createInitialWorld(424242);
    const battalion: BattalionState = {
      id: "battalion-hold-test",
      ownerEmpireId: "empire-player",
      settlementId: "settlement-capital",
      position: { x: 540, y: 330 },
      destination: { x: 760, y: 330 },
      specialization: "spears",
      size: 6,
      attack: 20,
      defense: 72,
      maxDefense: 72,
      range: 70,
      speed: 40,
      attackCooldownTicks: 1,
      attackCooldownRemaining: 0,
      morale: 90,
      devotion: 55,
      supply: 100
    };
    const simulation = new Simulation({ ...initial, battalions: { ...initial.battalions, [battalion.id]: battalion } });

    simulation.enqueueCommand({
      id: "hold-order",
      issuedBy: "player-1",
      tick: 1,
      type: "hold-battalion",
      payload: { battalionId: battalion.id }
    });
    const holdResult = simulation.tick();
    const held = simulation.getState().battalions[battalion.id];

    expect(held.stance).toBe("hold");
    expect(held.destination).toBeUndefined();
    expect(held.targetId).toBeUndefined();
    expect(holdResult.events.some((event) => event.type === "battalion-held")).toBe(true);
    expect(
      Object.values(simulation.getState().doctrines).some((doctrine) => doctrine.preferredAction === "Hold strategic ground")
    ).toBe(true);
    expect(restoreSaveGame(createSaveGame(simulation)).getState().battalions[battalion.id].stance).toBe("hold");

    const replay = createReplayRecord(
      { ...initial, battalions: { ...initial.battalions, [battalion.id]: battalion } },
      [
        {
          id: "hold-order",
          issuedBy: "player-1",
          tick: 1,
          type: "hold-battalion",
          payload: { battalionId: battalion.id }
        }
      ],
      1
    );
    expect(runReplayRecord(replay).finalState.battalions[battalion.id].stance).toBe("hold");

    simulation.enqueueCommand({
      id: "move-order",
      issuedBy: "player-1",
      tick: 2,
      type: "move-battalion",
      payload: { battalionId: battalion.id, destination: { x: 700, y: 330 } }
    });
    simulation.tick();

    expect(simulation.getState().battalions[battalion.id].stance).toBeUndefined();
  });

  it("allows a held force to fire in range without chasing and keeps it out of governor orders", () => {
    const initial = createInitialWorld(424243);
    const heldDefender: BattalionState = {
      ...initial.battalions["battalion-rival-1"],
      stance: "hold",
      position: { x: 900, y: 350 },
      destination: undefined,
      targetId: undefined,
      range: 70,
      attack: 10,
      defense: 80,
      maxDefense: 80
    };
    const nearbyEnemy: BattalionState = {
      id: "battalion-crown-hold-target",
      ownerEmpireId: "empire-player",
      settlementId: "settlement-capital",
      position: { x: 960, y: 350 },
      specialization: "militia",
      size: 4,
      attack: 1,
      defense: 120,
      maxDefense: 120,
      range: 40,
      speed: 20,
      attackCooldownTicks: 1,
      attackCooldownRemaining: 0,
      morale: 70,
      devotion: 55,
      supply: 100
    };
    const simulation = new Simulation({
      ...initial,
      tick: 100,
      settlements: {
        ...initial.settlements,
        "settlement-rival": {
          ...initial.settlements["settlement-rival"],
          localFood: 120,
          population: { ...initial.settlements["settlement-rival"].population, farmers: 8 }
        }
      },
      battalions: {
        ...initial.battalions,
        [heldDefender.id]: heldDefender,
        [nearbyEnemy.id]: nearbyEnemy
      }
    });

    simulation.tick();
    const defender = simulation.getState().battalions[heldDefender.id];

    expect(defender.stance).toBe("hold");
    expect(defender.position).toEqual(heldDefender.position);
    expect(defender.destination).toBeUndefined();
    expect(simulation.getState().battalions[nearbyEnemy.id].defense).toBeLessThan(nearbyEnemy.defense);
    expect(simulation.getState().heirs["heir-rival"].lastDecision?.action).not.toBe("Attack designated targets");
  });
});
