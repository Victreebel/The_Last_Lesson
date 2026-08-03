import { describe, expect, it } from "vitest";
import { createPlaytestRecord, createPlaytestRecordFilename, serializePlaytestRecord } from "../../src/campaign/PlaytestRecord";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("playtest records", () => {
  it("captures local campaign evidence without changing the world", () => {
    const state = createInitialWorld(731, "architect", "ashen-oath");
    const record = createPlaytestRecord(state, [{ id: "e", tick: 1, type: "doctrine-observed", payload: {} }]);
    expect(record).toMatchObject({ format: "the-last-lesson-playtest-record", scenarioId: "ashen-oath", rivalDifficulty: "architect", eventCounts: { "doctrine-observed": 1 } });
    expect(createPlaytestRecordFilename(state)).toBe("the-last-lesson-ashen-oath-tick-0.playtest.json");
    expect(JSON.parse(serializePlaytestRecord(record))).toEqual(record);
  });
});
