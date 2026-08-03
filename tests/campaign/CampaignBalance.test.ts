import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_BALANCE_SCENARIOS,
  CAMPAIGN_BALANCE_SOAK_DIFFICULTIES,
  CAMPAIGN_BALANCE_SOAK_SEEDS,
  runCampaignBalancePlaytest,
  runCampaignBalanceSoak,
  runCampaignBalanceSuite
} from "../../src/campaign/CampaignBalance";

describe("campaign balance playtests", () => {
  it("keeps every authored theatre playable under the representative standard opening", () => {
    const reports = runCampaignBalanceSuite({ seed: 9601 });

    expect(reports.map((report) => report.scenarioId)).toEqual(CAMPAIGN_BALANCE_SCENARIOS);
    for (const report of reports) {
      expect(report).toMatchObject({
        healthy: true,
        completedFarm: true,
        winnerEmpireId: undefined,
        rejectedCommands: 0
      });
      expect(report.playerCastleDefense).toBeGreaterThan(0);
      expect(report.playerCitizens).toBeGreaterThan(0);
      expect(report.playerFood).toBeGreaterThan(0);
      expect(report.playerBattalionCount).toBeGreaterThan(0);
      expect(report.firstRivalAttackTick).toBeDefined();
    }
  });

  it("records every theatre's intended opening lesson without a separate test-only simulation path", () => {
    const reports = runCampaignBalanceSuite({ seed: 9602 });
    const byScenario = Object.fromEntries(reports.map((report) => [report.scenarioId, report]));

    expect(byScenario.rivergate.caravanEvents).toBeGreaterThan(0);
    expect(byScenario["ashen-oath"].plagueEvents).toBe(0);
    expect(byScenario.stonewall.garrisonEvents).toBeGreaterThan(0);
  });

  it("is repeatable for a given theatre, seed, and standard opening", () => {
    expect(runCampaignBalancePlaytest("crownfall", { seed: 9603 })).toEqual(
      runCampaignBalancePlaytest("crownfall", { seed: 9603 })
    );
  });

  it("keeps the representative opening healthy across the bounded release doctrine-and-seed matrix", () => {
    const reports = runCampaignBalanceSoak();

    expect(reports).toHaveLength(
      CAMPAIGN_BALANCE_SOAK_DIFFICULTIES.length *
        CAMPAIGN_BALANCE_SOAK_SEEDS.length *
        CAMPAIGN_BALANCE_SCENARIOS.length
    );
    expect(new Set(reports.map((report) => report.rivalDifficulty))).toEqual(
      new Set(CAMPAIGN_BALANCE_SOAK_DIFFICULTIES)
    );
    expect(new Set(reports.map((report) => report.seed))).toEqual(new Set(CAMPAIGN_BALANCE_SOAK_SEEDS));
    expect(reports.every((report) => report.healthy && report.rejectedCommands === 0)).toBe(true);
  });
});
