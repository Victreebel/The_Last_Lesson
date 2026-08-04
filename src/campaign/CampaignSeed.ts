/** Default opening retained for backwards-compatible local campaigns. */
export const DEFAULT_CAMPAIGN_SEED = 777;

/**
 * Produces the next visible Campaign Theatre seed without touching simulation
 * randomness. Once selected, the number becomes ordinary deterministic world
 * state and is therefore preserved by saves, replays, and multiplayer setup.
 */
export function getNextCampaignSeed(seed: number): number {
  return (1664525 * (seed >>> 0) + 1013904223) >>> 0;
}

export function formatCampaignSeed(seed: number): string {
  return (seed >>> 0).toString().padStart(10, "0");
}
