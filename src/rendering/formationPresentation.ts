import type { Position } from "../simulation/state/WorldState";

export interface FormationMember {
  readonly id: string;
  readonly position: Position;
}

export interface FormationDestination {
  readonly battalionId: string;
  readonly destination: Position;
}

export const FORMATION_GRID_SIZE = 32;
export const FORMATION_SPACING = 64;

const snap = (value: number): number => Math.round(value / FORMATION_GRID_SIZE) * FORMATION_GRID_SIZE;

/**
 * Builds a stable line perpendicular to the selected force's direction of
 * travel. It is presentation/input policy only: the resulting positions are
 * submitted as ordinary deterministic movement commands.
 */
export function getLineFormationDestinations(
  members: readonly FormationMember[],
  anchor: Position,
  spacing = FORMATION_SPACING
): readonly FormationDestination[] {
  const ordered = [...members].sort((left, right) => left.id.localeCompare(right.id));
  if (ordered.length === 0) {
    return [];
  }

  const center = ordered.reduce(
    (total, member) => ({ x: total.x + member.position.x, y: total.y + member.position.y }),
    { x: 0, y: 0 }
  );
  center.x /= ordered.length;
  center.y /= ordered.length;

  const deltaX = anchor.x - center.x;
  const deltaY = anchor.y - center.y;
  const length = Math.hypot(deltaX, deltaY);
  const lateral = length > 0 ? { x: -deltaY / length, y: deltaX / length } : { x: 0, y: 1 };

  return ordered.map((member, index) => {
    const offset = (index - (ordered.length - 1) / 2) * spacing;
    return {
      battalionId: member.id,
      destination: {
        x: snap(anchor.x + lateral.x * offset),
        y: snap(anchor.y + lateral.y * offset)
      }
    };
  });
}
