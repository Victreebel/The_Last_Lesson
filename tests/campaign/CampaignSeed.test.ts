import { describe, expect, it } from "vitest";
import { DEFAULT_CAMPAIGN_SEED, formatCampaignSeed, getNextCampaignSeed } from "../../src/campaign/CampaignSeed";

describe("Campaign Theatre seed selection", () => {
  it("advances through a deterministic unsigned seed sequence", () => {
    const next = getNextCampaignSeed(DEFAULT_CAMPAIGN_SEED);

    expect(next).toBe(2307240148);
    expect(getNextCampaignSeed(DEFAULT_CAMPAIGN_SEED)).toBe(next);
    expect(getNextCampaignSeed(next)).not.toBe(next);
  });

  it("presents full seeds consistently for player-facing replay references", () => {
    expect(formatCampaignSeed(DEFAULT_CAMPAIGN_SEED)).toBe("0000000777");
    expect(formatCampaignSeed(2307240148)).toBe("2307240148");
  });
});
