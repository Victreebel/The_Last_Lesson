import type { EntityId, EventId } from "../state/Ids";

export type EventType =
  | "command-applied"
  | "command-rejected"
  | "food-produced"
  | "population-grown"
  | "starvation"
  | "plague-started"
  | "plague-spread"
  | "plague-ended"
  | "wood-produced"
  | "iron-produced"
  | "luxury-produced"
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
  | "battalion-experienced"
  | "battalion-trained"
  | "battalion-garrisoned"
  | "battalion-ungarrisoned"
  | "supply-delivered"
  | "caravan-destroyed"
  | "battalion-moved"
  | "supply-changed"
  | "morale-recovered"
  | "attack-ordered"
  | "captives-taken"
  | "captives-assimilated"
  | "captives-released"
  | "moral-memory-changed"
  | "captives-liberated"
  | "housing-destroyed"
  | "captive-escape"
  | "doctrine-observed"
  | "doctrine-reinforced"
  | "doctrine-disciplined"
  | "heir-decision"
  | "heir-concern"
  | "damage-dealt"
  | "battle-morale-shifted"
  | "entity-destroyed"
  | "settlement-captured"
  | "settlement-defected"
  | "victory-achieved";

export interface GameEvent {
  readonly id: EventId;
  readonly tick: number;
  readonly type: EventType;
  readonly actorId?: EntityId;
  readonly targetId?: EntityId;
  readonly payload: Record<string, unknown>;
}
