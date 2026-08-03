import type { GameEvent } from "../simulation/events/GameEvent";

export interface EventNarrativeContext {
  readonly settlementName: (id: string | undefined) => string;
  readonly heirName: (id: string | undefined) => string;
  readonly entityName: (id: string | undefined) => string;
}

const TACTICAL_EVENT_PRIORITY: Partial<Record<GameEvent["type"], number>> = {
  "victory-achieved": 100,
  "settlement-captured": 100,
  "settlement-defected": 100,
  "miracle-cast": 95,
  starvation: 90,
  "plague-started": 90,
  "plague-spread": 90,
  "housing-destroyed": 90,
  "heir-concern": 85,
  "heir-decision": 80,
  "doctrine-observed": 75,
  "doctrine-reinforced": 75,
  "doctrine-disciplined": 75,
  "battle-morale-shifted": 70,
  "entity-destroyed": 70,
  "captives-liberated": 70,
  "captives-exchanged": 70,
  "captive-escape": 70,
  "religious-pressure-changed": 60,
  "supply-delivered": 55,
  "supply-changed": 55
};

/**
 * Background economy events remain in the Book, while the Uplink favors the
 * consequential reports a commander needs to react to right now.
 */
export const selectTacticalReportEvents = (events: readonly GameEvent[], limit = 5): GameEvent[] => {
  const strategic = events.filter((event) => (TACTICAL_EVENT_PRIORITY[event.type] ?? 0) > 0);
  const source = strategic.length > 0 ? strategic : events;
  return [...source]
    .sort((left, right) => (TACTICAL_EVENT_PRIORITY[left.type] ?? 0) - (TACTICAL_EVENT_PRIORITY[right.type] ?? 0))
    .slice(-limit);
};

const getString = (event: GameEvent, key: string): string | undefined => {
  const value = event.payload[key];
  return typeof value === "string" ? value : undefined;
};

const getNumber = (event: GameEvent, key: string): number | undefined => {
  const value = event.payload[key];
  return typeof value === "number" ? value : undefined;
};

const describeWords = (value: string | undefined, fallback = "the realm"): string =>
  (value ?? fallback).replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const describeMiracle = (miracle: string | undefined): string => {
  switch (miracle) {
    case "mend-settlement":
      return "Mend Settlement";
    case "bless-harvest":
      return "Bless Harvest";
    case "inspire-battalion":
      return "Inspire Army";
    case "divine-judgment":
      return "Divine Judgment";
    default:
      return describeWords(miracle, "A miracle");
  }
};

/**
 * Turns an immutable simulation event into concise player-facing history. The
 * caller supplies only presentation labels, keeping this layer out of state.
 */
export const describeGameEvent = (event: GameEvent, context: EventNarrativeContext): string => {
  const settlement = context.settlementName(getString(event, "settlementId"));
  const heir = context.heirName(getString(event, "heirId"));
  const battalion = context.entityName(getString(event, "battalionId") ?? getString(event, "attackerId"));
  const target = context.entityName(getString(event, "targetId"));
  const count = getNumber(event, "count");
  const amount = getNumber(event, "amount");

  switch (event.type) {
    case "doctrine-observed":
      return `${heir} observed ${describeWords(getString(event, "action"), "a new action")} as a ${getNumber(event, "confidence") ?? 0}% conviction.`;
    case "doctrine-reinforced":
      return `${heir}'s last lesson was rewarded. Conviction is now ${getNumber(event, "confidence") ?? 0}%.`;
    case "doctrine-disciplined":
      return `${heir}'s last lesson was punished. Conviction is now ${getNumber(event, "confidence") ?? 0}%.`;
    case "heir-decision":
      return `${heir} chose to ${getString(event, "action")?.toLowerCase() ?? "govern"}: ${getString(event, "rationale") ?? "the current pressure demanded it"} (utility ${getNumber(event, "utility") ?? 0}).`;
    case "heir-concern":
      return `${heir} warns of ${describeWords(getString(event, "category"), "unrest").toLowerCase()}: ${getString(event, "message") ?? "the settlement needs attention"}.`;
    case "miracle-cast": {
      const miracle = describeMiracle(getString(event, "miracle"));
      const health = getNumber(event, "restoredHealth");
      const plagueCleansed = event.payload.plagueCleansed === true;
      const suffix = health ? `, restoring ${health} health${plagueCleansed ? " and ending the plague" : ""}` : "";
      const target = getString(event, "settlementId") ? settlement : context.entityName(getString(event, "battalionId"));
      return `${miracle} answered at ${target}${suffix}.`;
    }
    case "building-placed":
      return `${context.entityName(getString(event, "buildingId"))} foundation authorized.`;
    case "construction-progressed":
      return event.payload.complete === true
        ? `${context.entityName(getString(event, "buildingId"))} is complete.`
        : `${context.entityName(getString(event, "buildingId"))} advances toward completion.`;
    case "construction-stalled":
      return `${context.entityName(getString(event, "buildingId"))} is stalled: no builders are assigned.`;
    case "battalion-created":
      return `${context.entityName(getString(event, "battalionId"))} has been raised.`;
    case "battalion-retreated":
      return `${battalion} withdrew to ${settlement}, preserving the field force.`;
    case "attack-ordered":
      return `${battalion} was ordered to engage ${target}.`;
    case "attack-move-engaged":
      return `${battalion} engaged ${target} while advancing.`;
    case "damage-dealt":
      return `${battalion} struck ${target} for ${getNumber(event, "damage") ?? 0} damage.`;
    case "battle-morale-shifted":
      return `${context.entityName(getString(event, "victorId"))} broke ${context.entityName(getString(event, "defeatedId"))}'s morale.`;
    case "battalion-trained":
      return `${context.entityName(getString(event, "battalionId"))} earned ${describeWords(getString(event, "trait"), "battlefield training")}.`;
    case "supply-delivered":
      return `${context.entityName(getString(event, "caravanId"))} supplied ${context.entityName(getString(event, "battalionId"))}.`;
    case "supply-changed":
      return `${context.entityName(getString(event, "battalionId"))} supply is now ${getNumber(event, "supply") ?? 0}.`;
    case "food-produced":
      return `${settlement} harvested ${amount ?? 0} food.`;
    case "wood-produced":
      return `${settlement} gathered ${amount ?? 0} wood.`;
    case "iron-produced":
      return `${settlement} extracted ${amount ?? 0} iron.`;
    case "luxury-produced":
      return `${settlement} produced ${amount ?? 0} luxury.`;
    case "faith-produced":
      return `${settlement} generated ${amount ?? 0} Faith from its people and institutions.`;
    case "population-grown":
      return `${settlement} gained ${getNumber(event, "births") ?? 0} citizen${getNumber(event, "births") === 1 ? "" : "s"}.`;
    case "starvation":
      return `${settlement} is starving. ${getNumber(event, "deaths") ?? 0} citizens were lost.`;
    case "plague-started":
      return `Plague has taken hold in ${settlement}.`;
    case "plague-spread":
      return `Plague spread through ${settlement}; ${getNumber(event, "deaths") ?? 0} citizens were lost.`;
    case "plague-ended":
      return `The plague in ${settlement} has ended.`;
    case "captives-taken":
      return `${battalion} took ${count ?? 0} captive${count === 1 ? "" : "s"} for ${settlement}.`;
    case "captives-assimilated":
      return `${settlement} integrated ${count ?? 0} captive${count === 1 ? "" : "s"} into the Crown.`;
    case "captives-released":
    case "captives-liberated":
      return `${settlement} released ${count ?? 0} captive${count === 1 ? "" : "s"}.`;
    case "captives-exchanged":
      return `${settlement} and ${context.settlementName(getString(event, "rivalSettlementId"))} exchanged ${count ?? 0} captive${count === 1 ? "" : "s"}.`;
    case "captive-escape":
      return `${count ?? 0} captive${count === 1 ? "" : "s"} escaped from ${settlement}.`;
    case "religious-pressure-changed":
      return `${settlement} now faces ${getNumber(event, "externalPressure") ?? 0} rival religious pressure.`;
    case "settlement-captured":
      return `${settlement} has fallen to the Crown. Its former heir is gone.`;
    case "settlement-defected":
      return `${settlement} has defected under rival pressure.`;
    case "victory-achieved":
      return `${getString(event, "winnerEmpireId") === "empire-player" ? "The Crown" : "The Rival Crown"} holds every throne.`;
    case "command-rejected":
      return "The order could not be carried out.";
    default:
      return describeWords(event.type);
  }
};
