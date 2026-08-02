import { describe, expect, it } from "vitest";
import { stableHash } from "../../src/simulation/hash/stableHash";
import {
  createReplayRecord,
  deserializeReplayRecord,
  runReplayRecord,
  serializeReplayRecord
} from "../../src/simulation/replay/ReplayRecord";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("replay records", () => {
  it("serializes, restores, and reproduces a deterministic replay", () => {
    const initialWorld = createInitialWorld(443);
    const record = createReplayRecord(
      initialWorld,
      [
        {
          id: "replay-labor",
          issuedBy: "player-1",
          tick: 1,
          type: "assign-labor",
          payload: { settlementId: "settlement-capital", farmers: 8, builders: 4, lumberjacks: 6, miners: 0 }
        },
        {
          id: "replay-farm",
          issuedBy: "player-1",
          tick: 2,
          type: "place-building",
          payload: { settlementId: "settlement-capital", kind: "farm", position: { x: 180, y: 180 } }
        }
      ],
      8
    );

    const restored = deserializeReplayRecord(serializeReplayRecord(record));
    const originalResult = runReplayRecord(record);
    const restoredResult = runReplayRecord(restored);

    expect(stableHash(restored)).toBe(stableHash(record));
    expect(restoredResult.finalStateHash).toBe(originalResult.finalStateHash);
    expect(restoredResult.eventLogHash).toBe(originalResult.eventLogHash);
  });

  it("rejects malformed replay data", () => {
    expect(() => deserializeReplayRecord('{"format":"the-last-lesson-replay","version":"1.0.0"}')).toThrow(
      "Unsupported or malformed The Last Lesson replay."
    );
  });
});
