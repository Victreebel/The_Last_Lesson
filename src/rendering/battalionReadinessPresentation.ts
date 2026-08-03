import type { BattalionState } from "../simulation/state/WorldState";

export interface BattalionReadinessPresentation {
  readonly defense: number;
  readonly morale: number;
  readonly supply: number;
}

const clampPercent = (value: number): number => (Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0);

/**
 * Converts authoritative battalion condition into presentation-safe percentages.
 * The renderer and Tactical Uplink share this so a field bar never disagrees
 * with the selected-force readout.
 */
export function getBattalionReadinessPresentation(battalion: BattalionState): BattalionReadinessPresentation {
  return {
    defense: clampPercent((battalion.defense / Math.max(1, battalion.maxDefense)) * 100),
    morale: clampPercent(battalion.morale),
    supply: clampPercent(battalion.supply)
  };
}
