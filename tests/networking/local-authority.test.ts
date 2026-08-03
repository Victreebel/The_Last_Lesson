import { describe, expect, it } from "vitest";
import { LocalAuthority } from "../../src/networking/LocalAuthority";
import { runReplay } from "../../src/simulation/replay/replay";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("local authoritative networking", () => {
  it("accepts two connected clients, orders their commands, and broadcasts a deterministic snapshot", () => {
    const initialWorld = createInitialWorld(611);
    const authority = new LocalAuthority(initialWorld);
    authority.connect({ clientId: "player-1", empireId: "empire-player" });
    authority.connect({ clientId: "player-2", empireId: "empire-player" });

    const labor = authority.submit("player-1", {
      type: "assign-labor",
      payload: { settlementId: "settlement-capital", farmers: 8, builders: 4, lumberjacks: 6, miners: 0 }
    });
    const miracle = authority.submit("player-2", {
      type: "cast-miracle",
      payload: { empireId: "empire-player", kind: "bless-harvest" }
    });
    const snapshot = authority.advance();
    const replay = runReplay({ initialWorld, commands: [labor, miracle], ticks: 1 });

    expect(snapshot.tick).toBe(1);
    expect(snapshot.connectedClients.map((client) => client.clientId)).toEqual(["player-1", "player-2"]);
    expect(snapshot.stateHash).toBe(replay.finalStateHash);
    expect(snapshot.eventLogHash).toBe(replay.eventLogHash);
    expect(snapshot.recentEvents.map((event) => event.type)).toContain("command-applied");

    (snapshot.state as { tick: number }).tick = 999;
    expect(authority.getSnapshot().tick).toBe(1);
  });

  it("rejects commands from disconnected clients", () => {
    const authority = new LocalAuthority(createInitialWorld(612));

    expect(() =>
      authority.submit("player-2", {
        type: "generate-faith",
        payload: { empireId: "empire-player", amount: 1 }
      })
    ).toThrow("Client player-2 is not connected to this authority.");
  });

  it("rejects attempts to command a different empire or mint Faith", () => {
    const authority = new LocalAuthority(createInitialWorld(614));
    authority.connect({ clientId: "player-1", empireId: "empire-player" });

    expect(() =>
      authority.submit("player-1", {
        type: "assign-labor",
        payload: { settlementId: "settlement-rival", farmers: 8, builders: 0, lumberjacks: 0, miners: 0 }
      })
    ).toThrow("not authorized");
    expect(() =>
      authority.submit("player-1", {
        type: "generate-faith",
        payload: { empireId: "empire-player", amount: 999 }
      })
    ).toThrow("not authorized");
    expect(
      authority.submit("player-1", {
        type: "exchange-captives",
        payload: { settlementId: "settlement-capital", rivalSettlementId: "settlement-rival", count: 1 }
      }).type
    ).toBe("exchange-captives");
    expect(() =>
      authority.submit("player-1", {
        type: "exchange-captives",
        payload: { settlementId: "settlement-rival", rivalSettlementId: "settlement-capital", count: 1 }
      })
    ).toThrow("not authorized");
  });

  it("prepares the host-owned opening labor order without overriding a player's first command", () => {
    const authority = new LocalAuthority(createInitialWorld(613));
    authority.prepareOpeningLabor();
    authority.connect({ clientId: "player-1", empireId: "empire-player" });
    authority.submit("player-1", {
      type: "assign-labor",
      payload: { settlementId: "settlement-capital", farmers: 5, builders: 3, lumberjacks: 4, miners: 0 }
    });

    const snapshot = authority.advance();
    const population = snapshot.state.settlements["settlement-capital"].population;

    expect(population).toMatchObject({ farmers: 5, builders: 3, lumberjacks: 4, miners: 0 });
    expect(snapshot.recentEvents.filter((event) => event.type === "command-applied")).toHaveLength(2);
  });
});
