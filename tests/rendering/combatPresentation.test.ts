import { describe, expect, it } from "vitest";
import { getCombatFeedbackPresentation } from "../../src/rendering/combatPresentation";
import type { GameEvent } from "../../src/simulation/events/GameEvent";

const event = (type: GameEvent["type"], payload: Record<string, unknown>): GameEvent => ({
  id: "combat-event",
  tick: 4,
  type,
  payload
});

describe("combat presentation", () => {
  it("makes archer combat visibly ranged without changing the simulation event", () => {
    expect(getCombatFeedbackPresentation(event("damage-dealt", { specialization: "archers" }))).toMatchObject({
      sound: "ranged",
      delivery: "projectile",
      projectile: "arrow"
    });
  });

  it("gives spear, close-combat, and naval fire distinct visual deliveries", () => {
    expect(getCombatFeedbackPresentation(event("damage-dealt", { specialization: "spears" }))).toMatchObject({
      sound: "melee",
      delivery: "thrust"
    });
    expect(getCombatFeedbackPresentation(event("damage-dealt", { specialization: "raiders" }))).toMatchObject({
      sound: "melee",
      delivery: "strike"
    });
    expect(getCombatFeedbackPresentation(event("ship-fired", {}))).toMatchObject({
      sound: "naval",
      delivery: "projectile",
      projectile: "cannonball"
    });
  });

  it("ignores non-combat history", () => {
    expect(getCombatFeedbackPresentation(event("faith-produced", { amount: 4 }))).toBeUndefined();
  });
});
