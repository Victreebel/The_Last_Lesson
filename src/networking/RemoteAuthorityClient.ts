import type { CommandIntent, AuthoritySnapshot } from "./LocalAuthority";
import type {
  ClientMessage,
  JoinMatchMessage,
  ProtocolErrorMessage,
  ServerMessage
} from "./protocol";

export type RemoteAuthorityListener = (message: ServerMessage) => void;
export type RemoteConnectionState = "connected" | "disconnected";
export type RemoteConnectionListener = (state: RemoteConnectionState) => void;

/**
 * Presentation-facing WebSocket client. It never owns simulation state and only
 * emits serializable intents to an authoritative multiplayer host.
 */
export class RemoteAuthorityClient {
  private socket?: WebSocket;
  private readonly listeners = new Set<RemoteAuthorityListener>();
  private readonly connectionListeners = new Set<RemoteConnectionListener>();

  connect(url: string, join: JoinMatchMessage): void {
    this.disconnect();
    const socket = new WebSocket(url);
    this.socket = socket;
    socket.addEventListener("open", () => {
      if (this.socket !== socket) {
        return;
      }
      this.emitConnectionState("connected");
      this.send(join);
    });
    socket.addEventListener("message", (event) => this.handleMessage(event.data));
    socket.addEventListener("error", () => {
      this.emit({ type: "protocol-error", message: "The multiplayer connection encountered an error." });
    });
    socket.addEventListener("close", () => {
      if (this.socket === socket) {
        this.socket = undefined;
        this.emitConnectionState("disconnected");
      }
    });
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = undefined;
  }

  submit(intent: CommandIntent): void {
    this.send({ type: "submit-intent", intent });
  }

  requestSnapshot(): void {
    this.send({ type: "request-snapshot" });
  }

  onMessage(listener: RemoteAuthorityListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onConnectionState(listener: RemoteConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  private send(message: ClientMessage): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      this.emit({ type: "protocol-error", message: "The multiplayer connection is not ready." });
      return;
    }
    this.socket.send(JSON.stringify(message));
  }

  private handleMessage(data: unknown): void {
    if (typeof data !== "string") {
      this.emit({ type: "protocol-error", message: "The multiplayer host sent an unsupported message." });
      return;
    }
    try {
      const message = JSON.parse(data) as ServerMessage;
      if (!message || typeof message.type !== "string") {
        throw new Error("Malformed server message.");
      }
      this.emit(message);
    } catch {
      this.emit({ type: "protocol-error", message: "The multiplayer host sent malformed data." });
    }
  }

  private emit(message: ServerMessage | ProtocolErrorMessage): void {
    for (const listener of this.listeners) {
      listener(message);
    }
  }

  private emitConnectionState(state: RemoteConnectionState): void {
    for (const listener of this.connectionListeners) {
      listener(state);
    }
  }
}
