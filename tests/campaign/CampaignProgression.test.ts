import { describe, expect, it } from "vitest";
import { getCampaignChapter, getCampaignProgression } from "../../src/campaign/CampaignProgression";

describe("campaign progression", () => {
  it("recommends the first unconquered theatre without locking any earlier selection", () => {
    expect(getCampaignProgression({})).toEqual({ completedTheatres: 0, nextTheatre: "crownfall" });
    expect(getCampaignProgression({ crownfall: 2 })).toEqual({ completedTheatres: 1, nextTheatre: "rivergate" });
    expect(getCampaignProgression({ crownfall: 1, rivergate: 1, "ashen-oath": 3 })).toEqual({
      completedTheatres: 3,
      nextTheatre: "stonewall"
    });
  });

  it("marks the campaign complete after each authored theatre has been conquered", () => {
    expect(getCampaignProgression({ crownfall: 1, rivergate: 1, "ashen-oath": 1, stonewall: 1 })).toEqual({
      completedTheatres: 4
    });
    expect(getCampaignChapter("crownfall")).toBe(1);
    expect(getCampaignChapter("stonewall")).toBe(4);
  });
});
