import { describe, expect, it } from "vitest";
import { HEIR_FEEDBACK } from "../../src/learning/HeirFeedback";

describe("heir feedback contract", () => {
  it("keeps reward and punishment outcomes explicit and opposed", () => {
    expect(HEIR_FEEDBACK.reward).toEqual({ confidenceDelta: 16, trustDelta: 5 });
    expect(HEIR_FEEDBACK.punish).toEqual({ confidenceDelta: -18, trustDelta: -6 });
  });
});
