import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import {
  createSaveGame,
  deserializeSaveGame,
  restoreSaveGame,
  serializeSaveGame
} from "../../src/simulation/save/SaveGame";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("save games", () => {
  it("round-trips a world and resumes pending deterministic commands", () => {
    const original = new Simulation(createInitialWorld(9001));
    original.enqueueCommand({
      id: "future-faith",
      issuedBy: "system",
      tick: 3,
      type: "generate-faith",
      payload: { empireId: "empire-player", amount: 9 }
    });
    original.runTicks(2);

    const restored = restoreSaveGame(deserializeSaveGame(serializeSaveGame(createSaveGame(original))));
    const originalResult = original.tick();
    const restoredResult = restored.tick();

    expect(restored.getState()).toEqual(original.getState());
    expect(restoredResult.stateHash).toBe(originalResult.stateHash);
    expect(restoredResult.events).toEqual(originalResult.events);
  });

  it("defaults legacy saves to the standard rival doctrine", () => {
    const save = createSaveGame(new Simulation(createInitialWorld(9002)));
    const legacy = JSON.parse(serializeSaveGame(save)) as { world: Record<string, unknown> };
    delete legacy.world.rivalDifficulty;
    delete legacy.world.scenarioId;

    const restored = restoreSaveGame(deserializeSaveGame(JSON.stringify(legacy)));

    expect(restored.getState().rivalDifficulty).toBe("rival");
    expect(restored.getState().scenarioId).toBe("crownfall");
    expect(() => restored.tick()).not.toThrow();
  });

  it("defaults a legacy settlement's missing religious ward to zero", () => {
    const save = createSaveGame(new Simulation(createInitialWorld(9003)));
    const legacy = JSON.parse(serializeSaveGame(save)) as {
      world: { settlements: Record<string, Record<string, unknown>> };
    };
    delete legacy.world.settlements["settlement-capital"].religiousWardTicks;

    const restored = restoreSaveGame(deserializeSaveGame(JSON.stringify(legacy)));

    expect(restored.getState().settlements["settlement-capital"].religiousWardTicks).toBe(0);
    expect(() => restored.tick()).not.toThrow();
  });

  it("migrates version 1.1.0 saves without luxury labor", () => {
    const save = createSaveGame(new Simulation(createInitialWorld(9004)));
    const legacy = JSON.parse(serializeSaveGame(save)) as {
      version: string;
      world: { settlements: Record<string, { population: Record<string, unknown> }> };
    };
    legacy.version = "1.1.0";
    delete legacy.world.settlements["settlement-capital"].population.luxuryWorkers;

    const restored = restoreSaveGame(deserializeSaveGame(JSON.stringify(legacy)));

    expect(restored.getState().settlements["settlement-capital"].population.luxuryWorkers).toBe(0);
    expect(() => restored.tick()).not.toThrow();
  });
});
