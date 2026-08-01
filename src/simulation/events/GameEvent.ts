import type { EntityId, EventId } from "../state/Ids";

export type EventType =
  | "command-applied"
  | "command-rejected"
  | "food-produced"
  | "wood-produced"
  | "iron-produced"
  | "faith-produced"
  | "miracle-cast"
  | "religious-pressure-changed"
  | "building-placed"
  | "construction-progressed"
  | "battalion-created"
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
