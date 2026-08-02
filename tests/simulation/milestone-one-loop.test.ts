import { describe, expect, it } from "vitest";
import type { GameCommand } from "../../src/simulation/commands/GameCommand";
import { runReplay } from "../../src/simulation/replay/replay";
import { createInitialWorld, type WorldState } from "../../src/simulation/state/WorldState";

describe("milestone one rts loop", () => {
  it("starts every empire with a settlement governed from a castle", () => {
    const initialWorld = createInitialWorld(12345);

    for (const empire of Object.values(initialWorld.empires)) {
      expect(empire.settlementIds.length).toBeGreaterThan(0);
      for (const settlementId of empire.settlementIds) {
        const settlement = initialWorld.settlements[settlementId];
        expect(initialWorld.buildings[settlement.centralBuildingId].kind).toBe("castle");
      }
    }
  });

  it("creates a battalion, moves it, and damages a target deterministically", () => {
    const baseWorld = createInitialWorld(98765);
    const initialWorld: WorldState = {
      ...baseWorld,
      buildings: {
        ...baseWorld.buildings,
        "building-rival-castle": {
          ...baseWorld.buildings["building-rival-castle"],
          position: { x: 520, y: 360 }
        }
      }
    };
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
          lumberjacks: 6,
          miners: 0
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
        id: "place-town-square",
        issuedBy: "player-1",
        tick: 1,
        type: "place-building",
        payload: {
          settlementId: "settlement-capital",
          kind: "town-square",
          position: { x: 520, y: 360 }
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
          targetId: "building-rival-castle"
        }
      }
    ];

    const first = runReplay({ initialWorld, commands, ticks: 8 });
    const second = runReplay({ initialWorld, commands, ticks: 8 });

    expect(first.finalStateHash).toEqual(second.finalStateHash);
    expect(first.eventLogHash).toEqual(second.eventLogHash);
    expect(
      Object.values(first.finalState.battalions).filter(
        (battalion) => battalion.ownerEmpireId === "empire-player"
      )
    ).toHaveLength(1);
    expect(first.finalState.settlements["settlement-capital"].population.militarizedCitizens).toBe(
      10
    );
    expect(first.finalState.buildings["building-rival-castle"].defense).toBeLessThan(500);
  });

  it("keeps same-tick multi-settlement production identities distinct", () => {
    const baseWorld = createInitialWorld(24680);
    const grove = baseWorld.settlements["settlement-rival-grove"];
    const initialWorld = {
      ...baseWorld,
      empires: {
        ...baseWorld.empires,
        "empire-player": {
          ...baseWorld.empires["empire-player"],
          settlementIds: [...baseWorld.empires["empire-player"].settlementIds, grove.id]
        }
      },
      settlements: {
        ...baseWorld.settlements,
        [grove.id]: { ...grove, ownerEmpireId: "empire-player" }
      },
      buildings: {
        ...baseWorld.buildings,
        "building-rival-grove-castle": {
          ...baseWorld.buildings["building-rival-grove-castle"],
          ownerEmpireId: "empire-player"
        },
        "building-rival-grove-farm": {
          ...baseWorld.buildings["building-rival-grove-farm"],
          ownerEmpireId: "empire-player"
        }
      },
      heirs: {
        ...baseWorld.heirs,
        "heir-rival-grove": {
          ...baseWorld.heirs["heir-rival-grove"],
          ownerEmpireId: "empire-player",
          mode: "learning" as const
        }
      }
    };
    const commands: GameCommand[] = [
      {
        id: "capital-militia",
        issuedBy: "player-1",
        tick: 1,
        type: "create-battalion",
        payload: { settlementId: "settlement-capital", size: 8, specialization: "militia" }
      },
      {
        id: "grove-militia",
        issuedBy: "player-1",
        tick: 1,
        type: "create-battalion",
        payload: { settlementId: grove.id, size: 8, specialization: "militia" }
      }
    ];

    const replay = runReplay({ initialWorld, commands, ticks: 1 });
    const state = replay.finalState;
    const ownedBattalions = Object.values(state.battalions).filter((battalion) => battalion.ownerEmpireId === "empire-player");

    expect(ownedBattalions).toHaveLength(2);
    for (const settlementId of ["settlement-capital", grove.id]) {
      const battalionId = state.settlements[settlementId].battalionIds[0];
      expect(state.battalions[battalionId]?.settlementId).toBe(settlementId);
    }
  });
});
