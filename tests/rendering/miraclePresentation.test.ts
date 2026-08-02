import { describe, expect, it } from "vitest";
import { getMiracleFeedbackPresentation } from "../../src/rendering/miraclePresentation";
import type { GameEvent } from "../../src/simulation/events/GameEvent";

const event = (type: GameEvent["type"], payload: Record<string, unknown>): GameEvent => ({
  id: "miracle-event",
  tick: 4,
  type,
  payload
});

describe("miracle presentation", () => {
  it("gives every shipped miracle its own delivery and audio cue", () => {
    expect(getMiracleFeedbackPresentation(event("miracle-cast", { miracle: "bless-harvest" }))).toMatchObject({
      delivery: "harvest",
      sound: "miracle-harvest",
      label: "HARVEST BLESSED"
    });
    expect(getMiracleFeedbackPresentation(event("miracle-cast", { miracle: "inspire-battalion" }))).toMatchObject({
      delivery: "inspiration",
      sound: "miracle-inspire",
      label: "ARMY INSPIRED"
    });
    expect(getMiracleFeedbackPresentation(event("miracle-cast", { miracle: "mend-settlement" }))).toMatchObject({
      delivery: "restoration",
      sound: "miracle-mend",
      label: "SETTLEMENT MENDED"
    });
    expect(getMiracleFeedbackPresentation(event("miracle-cast", { miracle: "divine-judgment" }))).toMatchObject({
      delivery: "judgment",
      sound: "miracle-judgment",
      label: "DIVINE WARD"
    });
  });

  it("ignores non-miracle and unknown miracle events", () => {
    expect(getMiracleFeedbackPresentation(event("faith-produced", { amount: 4 }))).toBeUndefined();
    expect(getMiracleFeedbackPresentation(event("miracle-cast", { miracle: "unknown" }))).toBeUndefined();
  });
});
