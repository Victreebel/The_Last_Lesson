import { createServer, type Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import { LocalAuthority, type AuthoritySnapshot } from "../src/networking/LocalAuthority";
import {
  parseClientMessage,
  serializeServerMessage,
  type JoinMatchMessage,
  type MatchSetup,
  type ServerMessage
} from "../src/networking/protocol";
import { createInitialWorld } from "../src/simulation/state/WorldState";

const DEFAULT_MATCH_SETUP: MatchSetup = {
  seed: 777,
  scenarioId: "crownfall",
  rivalDifficulty: "rival"
};

export interface MultiplayerServerOptions {
  readonly tickIntervalMs?: number;
  readonly idleRoomTtlMs?: number;
}

interface ConnectedClient {
  readonly socket: WebSocket;
  roomId?: string;
  clientId?: string;
}

class MultiplayerRoom {
  private readonly authority: LocalAuthority;
  private readonly clients = new Map<string, WebSocket>();
  private interval?: ReturnType<typeof setInterval>;

  constructor(
    readonly id: string,
    setup: MatchSetup,
    private readonly tickIntervalMs: number
  ) {
    this.authority = new LocalAuthority(createInitialWorld(setup.seed, setup.rivalDifficulty, setup.scenarioId));
    this.authority.prepareOpeningLabor();
  }

  join(join: JoinMatchMessage, socket: WebSocket): AuthoritySnapshot {
    if (this.clients.has(join.clientId)) {
      throw new Error("That multiplayer identity is already connected to this room.");
    }
    this.clients.set(join.clientId, socket);
    const snapshot = this.authority.connect({ clientId: join.clientId, empireId: join.empireId });
    this.ensureTicking();
    return snapshot;
  }

  leave(clientId: string): boolean {
    this.clients.delete(clientId);
    this.authority.disconnect(clientId);
    if (this.clients.size === 0) {
      this.stop();
      return true;
    }
    return false;
  }

  isEmpty(): boolean {
    return this.clients.size === 0;
  }

  submit(clientId: string, intent: Parameters<LocalAuthority["submit"]>[1]) {
    return this.authority.submit(clientId, intent);
  }

  snapshot(): AuthoritySnapshot {
    return this.authority.getSnapshot();
  }

  advance(): AuthoritySnapshot {
    const snapshot = this.authority.advance();
    this.broadcast({ type: "snapshot", snapshot });
    return snapshot;
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  close(): void {
    this.stop();
    for (const socket of this.clients.values()) {
      socket.close();
    }
    this.clients.clear();
  }

  private ensureTicking(): void {
    if (this.interval) {
      return;
    }
    this.interval = setInterval(() => this.advance(), this.tickIntervalMs);
  }

  private broadcast(message: ServerMessage): void {
    const serialized = serializeServerMessage(message);
    for (const socket of this.clients.values()) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(serialized);
      }
    }
  }
}

/**
 * WebSocket transport adapter for LocalAuthority. It contains no alternate game
 * simulation: commands are scheduled and snapshots are produced exclusively by
 * the existing deterministic authority.
 */
export class MultiplayerServer {
  private server?: WebSocketServer;
  private httpServer?: HttpServer;
  private readonly rooms = new Map<string, MultiplayerRoom>();
  private readonly idleRoomCleanup = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly tickIntervalMs: number;
  private readonly idleRoomTtlMs: number;

  constructor(options: MultiplayerServerOptions = {}) {
    this.tickIntervalMs = options.tickIntervalMs ?? 5000;
    this.idleRoomTtlMs = options.idleRoomTtlMs ?? 120_000;
  }

  async listen(port = 8787): Promise<number> {
    if (this.server) {
      throw new Error("The multiplayer server is already listening.");
    }
    const httpServer = createServer((request, response) => {
      if (request.method === "GET" && request.url === "/health") {
        response.writeHead(200, { "cache-control": "no-store", "content-type": "application/json" });
        response.end(JSON.stringify({ status: "ok", rooms: this.rooms.size }));
        return;
      }
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "not found" }));
    });
    const server = new WebSocketServer({ server: httpServer });
    this.server = server;
    this.httpServer = httpServer;
    server.on("connection", (socket) => this.configureConnection(socket));
    await new Promise<void>((resolve, reject) => {
      httpServer.once("listening", resolve);
      httpServer.once("error", reject);
      httpServer.listen(port);
    });
    const address = httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("The multiplayer server did not expose a TCP port.");
    }
    return address.port;
  }

  async close(): Promise<void> {
    for (const timeout of this.idleRoomCleanup.values()) {
      clearTimeout(timeout);
    }
    this.idleRoomCleanup.clear();
    for (const room of this.rooms.values()) {
      room.close();
    }
    this.rooms.clear();
    const server = this.server;
    const httpServer = this.httpServer;
    this.server = undefined;
    this.httpServer = undefined;
    if (!server || !httpServer) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      server.close((serverError) => {
        if (serverError) {
          reject(serverError);
          return;
        }
        httpServer.close((httpError) => (httpError ? reject(httpError) : resolve()));
      });
    });
  }

  advanceRoom(roomId: string): AuthoritySnapshot | undefined {
    return this.rooms.get(roomId)?.advance();
  }

  private configureConnection(socket: WebSocket): void {
    const client: ConnectedClient = { socket };
    socket.on("message", (data) => this.handleMessage(client, data));
    socket.on("close", () => this.disconnect(client));
    socket.on("error", () => this.disconnect(client));
  }

  private handleMessage(client: ConnectedClient, data: RawData): void {
    const message = parseClientMessage(rawDataToString(data));
    if (!message) {
      this.send(client.socket, { type: "protocol-error", message: "Malformed multiplayer message." });
      return;
    }
    if (message.type === "join-match") {
      this.join(client, message);
      return;
    }
    if (!client.roomId || !client.clientId) {
      this.send(client.socket, { type: "protocol-error", message: "Join a multiplayer room before sending commands." });
      return;
    }
    const room = this.rooms.get(client.roomId);
    if (!room) {
      this.send(client.socket, { type: "protocol-error", message: "That multiplayer room no longer exists." });
      return;
    }
    if (message.type === "request-snapshot") {
      this.send(client.socket, { type: "snapshot", snapshot: room.snapshot() });
      return;
    }
    try {
      const command = room.submit(client.clientId, message.intent);
      this.send(client.socket, { type: "command-accepted", command });
    } catch (error) {
      this.send(client.socket, {
        type: "protocol-error",
        message: error instanceof Error ? error.message : "The host rejected that command."
      });
    }
  }

  private join(client: ConnectedClient, message: JoinMatchMessage): void {
    if (client.roomId || client.clientId) {
      this.send(client.socket, { type: "protocol-error", message: "A connection may join only one room." });
      return;
    }
    const room = this.rooms.get(message.roomId) ?? this.createRoom(message.roomId, message.setup);
    this.clearIdleRoomCleanup(room.id);
    try {
      const snapshot = room.join(message, client.socket);
      client.roomId = room.id;
      client.clientId = message.clientId;
      this.send(client.socket, {
        type: "joined-match",
        roomId: room.id,
        clientId: message.clientId,
        snapshot
      });
    } catch (error) {
      this.send(client.socket, {
        type: "protocol-error",
        message: error instanceof Error ? error.message : "Unable to join multiplayer room."
      });
    }
  }

  private createRoom(roomId: string, setup?: MatchSetup): MultiplayerRoom {
    const room = new MultiplayerRoom(roomId, setup ?? DEFAULT_MATCH_SETUP, this.tickIntervalMs);
    this.rooms.set(roomId, room);
    return room;
  }

  private disconnect(client: ConnectedClient): void {
    if (!client.roomId || !client.clientId) {
      return;
    }
    const room = this.rooms.get(client.roomId);
    if (room?.leave(client.clientId)) {
      this.scheduleIdleRoomCleanup(client.roomId);
    }
    client.roomId = undefined;
    client.clientId = undefined;
  }

  private send(socket: WebSocket, message: ServerMessage): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(serializeServerMessage(message));
    }
  }

  private scheduleIdleRoomCleanup(roomId: string): void {
    this.clearIdleRoomCleanup(roomId);
    const timeout = setTimeout(() => {
      const room = this.rooms.get(roomId);
      if (room?.isEmpty()) {
        room.close();
        this.rooms.delete(roomId);
      }
      this.idleRoomCleanup.delete(roomId);
    }, this.idleRoomTtlMs);
    this.idleRoomCleanup.set(roomId, timeout);
  }

  private clearIdleRoomCleanup(roomId: string): void {
    const timeout = this.idleRoomCleanup.get(roomId);
    if (timeout) {
      clearTimeout(timeout);
      this.idleRoomCleanup.delete(roomId);
    }
  }
}

function rawDataToString(data: RawData): string {
  if (typeof data === "string") {
    return data;
  }
  if (Array.isArray(data)) {
    return Buffer.concat(data).toString();
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(data)).toString();
  }
  return Buffer.from(data).toString();
}
