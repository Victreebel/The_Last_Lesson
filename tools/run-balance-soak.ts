import { runCampaignBalanceSoak } from "../src/campaign/CampaignBalance";

const reports = runCampaignBalanceSoak();

console.table(
  reports.map((report) => ({
    doctrine: report.rivalDifficulty,
    seed: report.seed,
    theatre: report.scenarioId,
    healthy: report.healthy ? "YES" : "NO",
    crownDefense: report.playerCastleDefense,
    food: report.playerFood,
    citizens: report.playerCitizens,
    forces: report.playerBattalionCount,
    rivalAttack: report.firstRivalAttackTick ?? "NONE",
    rejected: report.rejectedCommands
  }))
);

const unhealthy = reports.filter((report) => !report.healthy);
if (unhealthy.length > 0) {
  throw new Error(`Campaign balance soak found ${unhealthy.length} unhealthy opening(s).`);
}
