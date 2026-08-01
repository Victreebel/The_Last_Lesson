import type { EntityId, EventId } from "../state/Ids";

export type EventType =
  | "command-applied"
  | "command-rejected"
  | "food-produced"
  | "population-grown"
  | "starvation"
  | "wood-produced"
  | "iron-produced"
  | "faith-produced"
  | "miracle-cast"
  | "religious-pressure-changed"
  | "building-placed"
  | "construction-progressed"
  | "battalion-created"
  | "caravan-created"
  | "ship-created"
  | "ship-fired"
  | "caravan-moved"
  | "battalion-embarked"
  | "battalion-disembarked"
  | "battalion-garrisoned"
  | "battalion-ungarrisoned"
  | "supply-delivered"
  | "caravan-destroyed"
  | "battalion-moved"
  | "supply-changed"
  | "attack-ordered"
  | "captives-taken"
  | "captives-assimilated"
  | "captives-liberated"
  | "captive-escape"
  | "doctrine-observed"
  | "doctrine-reinforced"
  | "doctrine-disciplined"
  | "heir-decision"
  | "heir-concern"
  | "damage-dealt"
  | "entity-destroyed"
  | "settlement-captured"
  | "victory-achieved";

export interface GameEvent {
  readonly id: EventId;
  readonly tick: number;
  readonly type: EventType;
  readonly actorId?: EntityId;
  readonly targetId?: EntityId;
  readonly payload: Record<string, unknown>;
}
