import type { EntityId, EventId } from "../state/Ids";

export type EventType =
  | "command-applied"
  | "command-rejected"
  | "food-produced"
  | "wood-produced"
  | "faith-produced"
  | "building-placed"
  | "construction-progressed"
  | "battalion-created"
  | "battalion-moved"
  | "attack-ordered"
  | "damage-dealt"
  | "entity-destroyed";

export interface GameEvent {
  readonly id: EventId;
  readonly tick: number;
  readonly type: EventType;
  readonly actorId?: EntityId;
  readonly targetId?: EntityId;
  readonly payload: Record<string, unknown>;
}
