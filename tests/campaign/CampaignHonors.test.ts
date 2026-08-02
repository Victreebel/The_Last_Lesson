import { describe, expect, it } from "vitest";
import { getEarnedScenarioHonor } from "../../src/campaign/CampaignHonors";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("campaign honors", () => {
  it("awards each theatre's optional honor from its intended tactical state", () => {
    const crownfall = createInitialWorld(4101, "rival", "crownfall");
    const veteranTemplate = crownfall.battalions["battalion-rival-1"];
    expect(
      getEarnedScenarioHonor({
        ...crownfall,
        battalions: {
          ...crownfall.battalions,
          "battalion-crown-veteran": {
            ...veteranTemplate,
            id: "battalion-crown-veteran",
            ownerEmpireId: "empire-player",
            settlementId: "settlement-capital",
            experience: 10
          }
        }
      })?.id
    ).toBe("veterans-lesson");

    const rivergate = createInitialWorld(4102, "rival", "rivergate");
    expect(
      getEarnedScenarioHonor({
        ...rivergate,
        caravans: {
          ...rivergate.caravans,
          "warship-crown": {
            id: "warship-crown",
            ownerEmpireId: "empire-player",
            settlementId: "settlement-capital",
            kind: "ship",
            position: { x: 700, y: 500 },
            cargoFood: 0,
            capacity: 0,
            passengerBattalionIds: [],
            defense: 80,
            maxDefense: 80,
            speed: 58
          }
        }
      })?.id
    ).toBe("tidecaller");

    const ashenOath = createInitialWorld(4103, "rival", "ashen-oath");
    expect(
      getEarnedScenarioHonor({
        ...ashenOath,
        empires: {
          ...ashenOath.empires,
          "empire-player": {
            ...ashenOath.empires["empire-player"],
            moralMemory: { captivesTaken: 8, captivesIntegrated: 4, captivesReleased: 4 }
          }
        }
      })?.id
    ).toBe("civic-reckoning");

    const stonewall = createInitialWorld(4104, "rival", "stonewall");
    expect(getEarnedScenarioHonor(stonewall)?.id).toBe("unbroken-gate");
  });

  it("does not award an honor before its theatre condition is met", () => {
    expect(getEarnedScenarioHonor(createInitialWorld(4105, "rival", "crownfall"))).toBeUndefined();
    expect(getEarnedScenarioHonor(createInitialWorld(4106, "rival", "rivergate"))).toBeUndefined();
    expect(getEarnedScenarioHonor(createInitialWorld(4107, "rival", "ashen-oath"))).toBeUndefined();
  });
});
