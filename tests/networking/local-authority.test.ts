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
    const faith = authority.submit("player-2", {
      type: "generate-faith",
      payload: { empireId: "empire-player", amount: 6 }
    });
    const snapshot = authority.advance();
    const replay = runReplay({ initialWorld, commands: [labor, faith], ticks: 1 });

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
});
