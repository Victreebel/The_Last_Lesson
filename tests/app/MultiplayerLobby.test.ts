import { describe, expect, it } from "vitest";
import {
  getPersistentMultiplayerClientId,
  getStoredMultiplayerReconnectToken,
  storeMultiplayerReconnectToken
} from "../../src/app/MultiplayerLobby";

class MemoryStore {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("persistent multiplayer identity", () => {
  it("creates and reuses one local Crown identity", () => {
    const store = new MemoryStore();
    const first = getPersistentMultiplayerClientId(store);
    const second = getPersistentMultiplayerClientId(store);

    expect(first).toMatch(/^crown-[a-z0-9-]{6,64}$/i);
    expect(second).toBe(first);
  });

  it("replaces malformed stored identities", () => {
    const store = new MemoryStore();
    store.setItem("the-last-lesson.multiplayer-client-id.v1", "not-a-crown");

    expect(getPersistentMultiplayerClientId(store)).toMatch(/^crown-[a-z0-9-]{6,64}$/i);
  });

  it("keeps reconnect credentials scoped to one local Crown room", () => {
    const store = new MemoryStore();
    const request = { url: "wss://crown.example", roomId: "iron-gate", clientId: "crown-steadfast" };
    const token = "a".repeat(43);

    storeMultiplayerReconnectToken(request, token, store);

    expect(getStoredMultiplayerReconnectToken(request, store)).toBe(token);
    expect(getStoredMultiplayerReconnectToken({ ...request, roomId: "other-room" }, store)).toBeUndefined();
  });
});
