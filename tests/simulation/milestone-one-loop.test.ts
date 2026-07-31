import { describe, expect, it } from "vitest";
import type { GameCommand } from "../../src/simulation/commands/GameCommand";
import { runReplay } from "../../src/simulation/replay/replay";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("milestone one rts loop", () => {
  it("creates a battalion, moves it, and damages a target deterministically", () => {
    const initialWorld = createInitialWorld(98765);
    const commands: GameCommand[] = [
      {
        id: "assign-labor",
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
        id: "create-battalion",
        issuedBy: "player-1",
        tick: 2,
        type: "create-battalion",
        payload: {
          settlementId: "settlement-capital",
          size: 10
        }
      },
      {
        id: "move-battalion",
        issuedBy: "player-1",
        tick: 3,
        type: "move-battalion",
        payload: {
          battalionId: "battalion-2-1",
          destination: { x: 520, y: 360 }
        }
      },
      {
        id: "attack-building",
        issuedBy: "player-1",
        tick: 6,
        type: "attack-target",
        payload: {
          battalionId: "battalion-2-1",
          targetId: "building-town-square"
        }
      }
    ];

    const first = runReplay({ initialWorld, commands, ticks: 8 });
    const second = runReplay({ initialWorld, commands, ticks: 8 });

    expect(first.finalStateHash).toEqual(second.finalStateHash);
    expect(first.eventLogHash).toEqual(second.eventLogHash);
    expect(Object.values(first.finalState.battalions)).toHaveLength(1);
    expect(first.finalState.settlements["settlement-capital"].population.militarizedCitizens).toBe(
      10
    );
    expect(first.finalState.buildings["building-town-square"].defense).toBeLessThan(150);
  });
});
