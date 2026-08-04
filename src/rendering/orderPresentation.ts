import {
  isPositionVisibleToEmpire,
  type Position,
  type WorldState
} from "../simulation/state/WorldState";

export type OrderIndicatorKind = "move" | "advance" | "attack" | "naval" | "hold";

export interface OrderIndicator {
  readonly actorId: string;
  readonly kind: OrderIndicatorKind;
  readonly origin: Position;
  readonly destination: Position;
}

function getEntityPosition(state: WorldState, entityId: string): Position | undefined {
  return state.battalions[entityId]?.position ?? state.buildings[entityId]?.position ?? state.caravans[entityId]?.position;
}

function isTargetVisibleToCrown(state: WorldState, entityId: string): boolean {
  const battalion = state.battalions[entityId];
  const building = state.buildings[entityId];
  const caravan = state.caravans[entityId];
  const target = battalion ?? building ?? caravan;
  return Boolean(
    target &&
      (target.ownerEmpireId === "empire-player" || isPositionVisibleToEmpire(state, "empire-player", target.position))
  );
}

/**
 * Projects only player-selected, already-authoritative orders into tactical
 * affordances. It intentionally omits fogged hostile targets.
 */
export function getOrderIndicators(
  state: WorldState,
  selectedBattalionIds: Iterable<string>,
  selectedCaravanId?: string | null
): readonly OrderIndicator[] {
  const indicators: OrderIndicator[] = [];
  const battalionIds = [...selectedBattalionIds].sort((left, right) => left.localeCompare(right));

  for (const battalionId of battalionIds) {
    const battalion = state.battalions[battalionId];
    if (!battalion || battalion.ownerEmpireId !== "empire-player") {
      continue;
    }
    if (battalion.stance === "hold") {
      indicators.push({ actorId: battalion.id, kind: "hold", origin: battalion.position, destination: battalion.position });
    }
    const target = battalion.targetId ? getEntityPosition(state, battalion.targetId) : undefined;
    if (battalion.targetId && target && isTargetVisibleToCrown(state, battalion.targetId)) {
      indicators.push({ actorId: battalion.id, kind: "attack", origin: battalion.position, destination: target });
      continue;
    }
    const destination = battalion.attackMoveDestination ?? battalion.destination;
    if (destination) {
      indicators.push({
        actorId: battalion.id,
        kind: battalion.attackMoveDestination ? "advance" : "move",
        origin: battalion.position,
        destination
      });
    }
    if (!battalion.attackMoveDestination && battalion.destination && battalion.waypoints?.length) {
      let origin = battalion.destination;
      for (const destination of battalion.waypoints) {
        indicators.push({ actorId: battalion.id, kind: "move", origin, destination });
        origin = destination;
      }
    }
  }

  const caravan = selectedCaravanId ? state.caravans[selectedCaravanId] : undefined;
  if (!caravan || caravan.ownerEmpireId !== "empire-player") {
    return indicators;
  }
  const target = caravan.targetId ? getEntityPosition(state, caravan.targetId) : undefined;
  if (caravan.targetId && target && isTargetVisibleToCrown(state, caravan.targetId)) {
    indicators.push({ actorId: caravan.id, kind: "attack", origin: caravan.position, destination: target });
  } else if (caravan.destination) {
    indicators.push({
      actorId: caravan.id,
      kind: caravan.kind === "ship" ? "naval" : "move",
      origin: caravan.position,
      destination: caravan.destination
    });
  }

  return indicators;
}
