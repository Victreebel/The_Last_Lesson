import type { ScenarioId } from "../simulation/state/WorldState";

export const CAMPAIGN_THEATRE_ORDER: readonly ScenarioId[] = [
  "crownfall",
  "rivergate",
  "ashen-oath",
  "stonewall"
];

export interface CampaignProgression {
  readonly completedTheatres: number;
  readonly nextTheatre?: ScenarioId;
}

/**
 * Campaign progression is presentation-only: every theatre remains selectable,
 * while victory history suggests a first journey through the four scenarios.
 */
export function getCampaignProgression(
  chronicle: Partial<Record<ScenarioId, number>>
): CampaignProgression {
  const nextTheatre = CAMPAIGN_THEATRE_ORDER.find((scenario) => (chronicle[scenario] ?? 0) === 0);
  return {
    completedTheatres: CAMPAIGN_THEATRE_ORDER.filter((scenario) => (chronicle[scenario] ?? 0) > 0).length,
    ...(nextTheatre ? { nextTheatre } : {})
  };
}

export function getCampaignChapter(scenario: ScenarioId): number {
  return CAMPAIGN_THEATRE_ORDER.indexOf(scenario) + 1;
}
