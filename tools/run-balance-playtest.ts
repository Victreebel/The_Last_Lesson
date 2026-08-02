import { runCampaignBalanceSuite } from "../src/campaign/CampaignBalance";

const reports = runCampaignBalanceSuite();

console.table(
  reports.map((report) => ({
    theatre: report.scenarioId,
    healthy: report.healthy ? "YES" : "NO",
    crown: report.playerCastleDefense,
    citizens: report.playerCitizens,
    food: report.playerFood,
    faith: report.playerFaith,
    force: report.playerBattalionCount,
    rivalAttack: report.firstRivalAttackTick ?? "none",
    rejected: report.rejectedCommands,
    mandate: report.activeMandate
  }))
);

if (reports.some((report) => !report.healthy)) {
  process.exitCode = 1;
}
