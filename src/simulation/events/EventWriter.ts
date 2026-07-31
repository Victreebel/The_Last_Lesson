import type { GameEvent, EventType } from "./GameEvent";

export class EventWriter {
  private events: GameEvent[] = [];
  private sequence = 0;

  emit(tick: number, type: EventType, payload: Record<string, unknown>): void {
    this.events.push({
      id: `event-${tick}-${this.sequence++}`,
      tick,
      type,
      payload
    });
  }

  flush(): GameEvent[] {
    const flushed = this.events;
    this.events = [];
    return flushed;
  }
}

