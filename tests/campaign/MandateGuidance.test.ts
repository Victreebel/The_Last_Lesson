import { describe, expect, it } from "vitest";
import { getMandateGuidance } from "../../src/campaign/MandateGuidance";
import type { MandateStepId } from "../../src/campaign/ImperialMandate";

describe("mandate guidance", () => {
  it("maps every state-derived mandate to an existing presentation control", () => {
    const stepIds: readonly MandateStepId[] = [
      "mend-plague",
      "resolve-captives",
      "commission-wagon",
      "garrison-gate",
      "establish-farm",
      "raise-battalion",
      "scout-frontier",
      "teach-heir",
      "claim-thrones"
    ];

    for (const stepId of stepIds) {
      const guidance = getMandateGuidance(stepId);
      expect(guidance.label).toContain("//");
      expect(
        guidance.surface === "heir" || guidance.buildingTargets.length > 0 || guidance.commandTargets.length > 0
      ).toBe(true);
    }
  });

  it("keeps legitimate captive policy alternatives equally visible", () => {
    expect(getMandateGuidance("resolve-captives").commandTargets).toEqual(["assimilate", "release"]);
  });
});
