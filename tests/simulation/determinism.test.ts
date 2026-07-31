import { describe, expect, it } from "vitest";
import type { GameCommand } from "../../src/simulation/commands/GameCommand";
import { runReplay } from "../../src/simulation/replay/replay";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("simulation determinism", () => {
  it("produces identical final state and event log for identical inputs", () => {
    const initialWorld = createInitialWorld(12345);
    const commands: GameCommand[] = [
      {
        id: "command-1",
        issuedBy: "player-1",
        tick: 1,
        type: "assign-labor",
        payload: {
          settlementId: "settlement-capital",
          farmers: 8,
          builders: 4,
          lumberjacks: 6
        }
      },
      {
        id: "command-2",
        issuedBy: "player-1",
        tick: 2,
        type: "place-building",
        payload: {
          settlementId: "settlement-capital",
          kind: "farm"
        }
      },
      {
        id: "command-3",
        issuedBy: "system",
        tick: 3,
        type: "generate-faith",
        payload: {
          empireId: "empire-player",
          amount: 5
        }
      }
    ];

    const first = runReplay({ initialWorld, commands, ticks: 8 });
    const second = runReplay({ initialWorld, commands, ticks: 8 });

    expect(first.finalStateHash).toEqual(second.finalStateHash);
    expect(first.eventLogHash).toEqual(second.eventLogHash);
    expect(first.finalState.tick).toBe(8);
  });
});

