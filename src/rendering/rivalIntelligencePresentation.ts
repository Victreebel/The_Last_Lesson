import type { DoctrineRule, WorldState } from "../simulation/state/WorldState";

export interface RivalCounterDoctrineSummary {
  readonly heirName: string;
  readonly action: string;
  readonly confidence: number;
  readonly updatedAtTick: number;
}

/**
 * Counter-doctrines are the rival's visible response to witnessed Crown
 * behavior. Keep this projection pure so the Book, Uplink, replay review, and
 * spectator tools can all explain the same authoritative history.
 */
export function getRivalCounterDoctrineSummaries(state: WorldState): readonly RivalCounterDoctrineSummary[] {
  return Object.values(state.doctrines)
    .map((doctrine) => ({ doctrine, heir: state.heirs[doctrine.ownerId] }))
    .filter(
      (entry): entry is { doctrine: DoctrineRule; heir: NonNullable<typeof entry.heir> } =>
        Boolean(entry.heir) && entry.heir.ownerEmpireId === "empire-rival" && entry.doctrine.id.includes("-counter-")
    )
    .sort(
      (left, right) =>
        right.doctrine.updatedAtTick - left.doctrine.updatedAtTick ||
        right.doctrine.confidence - left.doctrine.confidence ||
        left.doctrine.id.localeCompare(right.doctrine.id)
    )
    .map(({ doctrine, heir }) => ({
      heirName: heir.name,
      action: doctrine.preferredAction,
      confidence: doctrine.confidence,
      updatedAtTick: doctrine.updatedAtTick
    }));
}

export function formatRivalCounterDoctrine(summary: RivalCounterDoctrineSummary): string {
  return `${summary.heirName.toUpperCase()} // ${summary.action.toUpperCase()} (${summary.confidence}%)`;
}
