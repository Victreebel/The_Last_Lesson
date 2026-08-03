import { runCampaignBalanceSoak } from "../src/campaign/CampaignBalance";

const reports = runCampaignBalanceSoak();

const summarizeRange = (values: readonly number[]): string => {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return minimum === maximum ? `${minimum}` : `${minimum}-${maximum}`;
};

const groups = new Map<string, typeof reports>();
for (const report of reports) {
  const key = `${report.opening}|${report.rivalDifficulty}|${report.scenarioId}`;
  groups.set(key, [...(groups.get(key) ?? []), report]);
}

console.table(
  [...groups.values()].map((group) => {
    const sample = group[0];
    return {
      opening: sample.opening,
      doctrine: sample.rivalDifficulty,
      theatre: sample.scenarioId,
      healthy: `${group.filter((report) => report.healthy).length}/${group.length}`,
      crownDefense: summarizeRange(group.map((report) => report.playerCastleDefense)),
      food: summarizeRange(group.map((report) => report.playerFood)),
      forces: summarizeRange(group.map((report) => report.playerBattalionCount)),
      rivalAttack: summarizeRange(group.map((report) => report.firstRivalAttackTick ?? -1)),
      rejected: group.reduce((total, report) => total + report.rejectedCommands, 0)
    };
  })
);

const unhealthy = reports.filter((report) => !report.healthy);
if (unhealthy.length > 0) {
  console.table(unhealthy);
  throw new Error(`Campaign balance soak found ${unhealthy.length} unhealthy opening(s).`);
}
