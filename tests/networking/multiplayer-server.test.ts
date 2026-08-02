import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { MultiplayerServer } from "../../server/MultiplayerServer";
import type { ServerMessage } from "../../src/networking/protocol";

describe("multiplayer WebSocket transport", () => {
  const servers: MultiplayerServer[] = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()));
  });

  it("owns join, command timing, and snapshot delivery through one authority", async () => {
    const server = new MultiplayerServer({ tickIntervalMs: 60_000 });
    servers.push(server);
    const port = await server.listen(0);
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    await expect(health.json()).resolves.toEqual({ status: "ok", rooms: 0 });
    const client = new WebSocket(`ws://127.0.0.1:${port}`);
    await waitForOpen(client);

    const joined = waitForMessage(client);
    client.send(
      JSON.stringify({
        type: "join-match",
        roomId: "crown-coop",
        clientId: "player-one",
        empireId: "empire-player",
        setup: { seed: 5050, scenarioId: "stonewall", rivalDifficulty: "rival" }
      })
    );

    await expect(joined).resolves.toMatchObject({
      type: "joined-match",
      roomId: "crown-coop",
      clientId: "player-one",
      snapshot: { tick: 0, state: { scenarioId: "stonewall" } }
    });

    const accepted = waitForMessage(client);
    client.send(
      JSON.stringify({
        type: "submit-intent",
        intent: {
          type: "assign-labor",
          payload: {
            settlementId: "settlement-capital",
            farmers: 6,
            builders: 2,
            lumberjacks: 0,
            miners: 0,
            luxuryWorkers: 0
          }
        }
      })
    );

    await expect(accepted).resolves.toMatchObject({
      type: "command-accepted",
      command: { id: "authority-1", issuedBy: "player-one", tick: 1, type: "assign-labor" }
    });

    const snapshot = waitForMessage(client);
    server.advanceRoom("crown-coop");
    await expect(snapshot).resolves.toMatchObject({
      type: "snapshot",
      snapshot: {
        tick: 1,
        state: { settlements: { "settlement-capital": { population: { farmers: 6, builders: 2 } } } }
      }
    });

    client.close();
  });

  it("rejects malformed traffic without advancing the room", async () => {
    const server = new MultiplayerServer({ tickIntervalMs: 60_000 });
    servers.push(server);
    const port = await server.listen(0);
    const client = new WebSocket(`ws://127.0.0.1:${port}`);
    await waitForOpen(client);

    const rejected = waitForMessage(client);
    client.send("not valid json");
    await expect(rejected).resolves.toEqual({ type: "protocol-error", message: "Malformed multiplayer message." });

    client.close();
  });

  it("retains an empty room long enough for a client to rejoin its current reign", async () => {
    const server = new MultiplayerServer({ tickIntervalMs: 60_000, idleRoomTtlMs: 60_000 });
    servers.push(server);
    const port = await server.listen(0);
    const firstClient = new WebSocket(`ws://127.0.0.1:${port}`);
    await waitForOpen(firstClient);
    const firstJoined = waitForMessage(firstClient);
    firstClient.send(
      JSON.stringify({
        type: "join-match",
        roomId: "resume-crown",
        clientId: "player-one",
        empireId: "empire-player"
      })
    );
    await expect(firstJoined).resolves.toMatchObject({ type: "joined-match", snapshot: { tick: 0 } });
    server.advanceRoom("resume-crown");
    firstClient.close();
    await waitForClose(firstClient);

    const returningClient = new WebSocket(`ws://127.0.0.1:${port}`);
    await waitForOpen(returningClient);
    const rejoined = waitForMessage(returningClient);
    returningClient.send(
      JSON.stringify({
        type: "join-match",
        roomId: "resume-crown",
        clientId: "player-returning",
        empireId: "empire-player"
      })
    );
    await expect(rejoined).resolves.toMatchObject({ type: "joined-match", snapshot: { tick: 1 } });

    returningClient.close();
  });
});

function waitForOpen(client: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    client.once("open", resolve);
    client.once("error", reject);
  });
}

function waitForClose(client: WebSocket): Promise<void> {
  return new Promise((resolve) => client.once("close", () => resolve()));
}

function waitForMessage(client: WebSocket): Promise<ServerMessage> {
  return new Promise((resolve, reject) => {
    client.once("message", (data) => {
      try {
        resolve(JSON.parse(data.toString()) as ServerMessage);
      } catch (error) {
        reject(error);
      }
    });
    client.once("error", reject);
  });
}
