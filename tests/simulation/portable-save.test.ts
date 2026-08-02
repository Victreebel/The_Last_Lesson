import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import {
  createPortableSaveArchive,
  createPortableSaveFilename,
  deserializePortableSaveArchive,
  serializePortableSaveArchive
} from "../../src/simulation/save/PortableSave";
import { restoreSaveGame } from "../../src/simulation/save/SaveGame";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("portable save archives", () => {
  it("round-trips the active reign and its original campaign state", () => {
    const opening = createInitialWorld(7001, "architect", "rivergate");
    const simulation = new Simulation(structuredClone(opening));
    simulation.runTicks(3);

    const archive = deserializePortableSaveArchive(
      serializePortableSaveArchive(createPortableSaveArchive(simulation, opening))
    );
    const restored = restoreSaveGame(archive.save);

    expect(restored.getState()).toEqual(simulation.getState());
    expect(archive.campaignInitialWorld).toEqual(opening);
    expect(createPortableSaveFilename(restored.getState())).toBe("the-last-lesson-rivergate-tick-3.tll");
  });

  it("rejects archives without a valid opening world", () => {
    const simulation = new Simulation(createInitialWorld(7002));
    const archive = JSON.parse(serializePortableSaveArchive(createPortableSaveArchive(simulation, simulation.getState()))) as {
      campaignInitialWorld?: unknown;
    };
    archive.campaignInitialWorld = { tick: 0, seed: 7002 };

    expect(() => deserializePortableSaveArchive(JSON.stringify(archive))).toThrow(
      "Unsupported or malformed The Last Lesson portable save."
    );
  });
});
