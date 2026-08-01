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
});
