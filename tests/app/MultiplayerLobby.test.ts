import { describe, expect, it } from "vitest";
import { getPersistentMultiplayerClientId } from "../../src/app/MultiplayerLobby";

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
});
