import { getBattalionRank, isPositionVisibleToEmpire, terrainAtPosition, type WorldState } from "../simulation/state/WorldState";
import { getBattalionReadinessPresentation } from "./battalionReadinessPresentation";
import { getTerrainPresentation } from "./terrainPresentation";

export interface ReconnaissanceContact {
  readonly entityId: string;
  readonly heading: string;
  readonly detail: string;
  readonly ground: string;
}

/**
 * Projects only a rival entity already revealed by the normal Crown fog rules.
 * This is deliberately presentation-only: it gives a clicked contact tactical
 * meaning without discovering hidden units, changing state, or creating a new
 * reconnaissance subsystem.
 */
export function getReconnaissanceContact(
  state: WorldState,
  entityId: string,
  observerEmpireId = "empire-player"
): ReconnaissanceContact | undefined {
  const battalion = state.battalions[entityId];
  if (battalion) {
    if (battalion.ownerEmpireId === observerEmpireId || !isPositionVisibleToEmpire(state, observerEmpireId, battalion.position)) {
      return undefined;
    }
    const readiness = getBattalionReadinessPresentation(battalion);
    const terrain = terrainAtPosition(state, battalion.position);
    return {
      entityId,
      heading: `RIVAL ${getBattalionRank(battalion.experience).toUpperCase()} ${battalion.specialization.toUpperCase()}`,
      detail: `${battalion.size} TROOPS // H${readiness.defense} M${readiness.morale} S${readiness.supply}`,
      ground: `GROUND: ${getTerrainPresentation(terrain).detail}`
    };
  }

  const building = state.buildings[entityId];
  if (building) {
    if (building.ownerEmpireId === observerEmpireId || !isPositionVisibleToEmpire(state, observerEmpireId, building.position)) {
      return undefined;
    }
    const terrain = terrainAtPosition(state, building.position);
    const garrison = building.garrisonBattalionIds?.length ?? 0;
    return {
      entityId,
      heading: `RIVAL ${building.kind.replaceAll("-", " ").toUpperCase()}`,
      detail: `DEFENSE ${Math.max(0, Math.round(building.defense))}${garrison ? ` // GARRISON ${garrison}` : ""}`,
      ground: `GROUND: ${getTerrainPresentation(terrain).detail}`
    };
  }

  const caravan = state.caravans[entityId];
  if (caravan) {
    if (caravan.ownerEmpireId === observerEmpireId || !isPositionVisibleToEmpire(state, observerEmpireId, caravan.position)) {
      return undefined;
    }
    const terrain = terrainAtPosition(state, caravan.position);
    const troopCount = caravan.passengerBattalionIds.reduce(
      (total, passengerId) => total + (state.battalions[passengerId]?.size ?? 0),
      0
    );
    return {
      entityId,
      heading: `RIVAL ${caravan.kind === "ship" ? "WARSHIP" : "SUPPLY WAGON"}`,
      detail: `DEFENSE ${Math.max(0, Math.round(caravan.defense))} // FOOD ${caravan.cargoFood}${troopCount ? ` // ${troopCount} EMBARKED` : ""}`,
      ground: `GROUND: ${getTerrainPresentation(terrain).detail}`
    };
  }

  return undefined;
}
