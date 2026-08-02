import type { TacticalSound } from "./AudioDirector";
import type { GameEvent } from "../simulation/events/GameEvent";
import type { BattalionSpecialization } from "../simulation/state/WorldState";

export type CombatDelivery = "projectile" | "thrust" | "strike";
export type CombatProjectile = "arrow" | "cannonball";

export interface CombatFeedbackPresentation {
  readonly sound: TacticalSound;
  readonly delivery: CombatDelivery;
  readonly projectile?: CombatProjectile;
  readonly color: number;
  readonly impactColor: number;
  readonly projectileDuration: number;
  readonly impactRadius: number;
  readonly impactScale: number;
  readonly impactDuration: number;
  readonly damageFontSize: string;
}

const MELEE_STYLES: Record<Exclude<BattalionSpecialization, "archers">, CombatFeedbackPresentation> = {
  militia: {
    sound: "melee",
    delivery: "strike",
    color: 0xf4cf88,
    impactColor: 0xffe1a4,
    projectileDuration: 0,
    impactRadius: 9,
    impactScale: 2.4,
    impactDuration: 280,
    damageFontSize: "12px"
  },
  spears: {
    sound: "melee",
    delivery: "thrust",
    color: 0xc8d8c4,
    impactColor: 0xe4f2dd,
    projectileDuration: 0,
    impactRadius: 10,
    impactScale: 2.6,
    impactDuration: 300,
    damageFontSize: "12px"
  },
  raiders: {
    sound: "melee",
    delivery: "strike",
    color: 0xf0a66b,
    impactColor: 0xffcf9c,
    projectileDuration: 0,
    impactRadius: 11,
    impactScale: 2.7,
    impactDuration: 300,
    damageFontSize: "12px"
  },
  hounds: {
    sound: "melee",
    delivery: "strike",
    color: 0xd8c5a0,
    impactColor: 0xf1dfbb,
    projectileDuration: 0,
    impactRadius: 8,
    impactScale: 2.1,
    impactDuration: 250,
    damageFontSize: "11px"
  }
};

const ARCHER_STYLE: CombatFeedbackPresentation = {
  sound: "ranged",
  delivery: "projectile",
  projectile: "arrow",
  color: 0xf2d77f,
  impactColor: 0xffe8a8,
  projectileDuration: 240,
  impactRadius: 10,
  impactScale: 2.5,
  impactDuration: 300,
  damageFontSize: "12px"
};

const NAVAL_STYLE: CombatFeedbackPresentation = {
  sound: "naval",
  delivery: "projectile",
  projectile: "cannonball",
  color: 0x9cc8d5,
  impactColor: 0xc9edf5,
  projectileDuration: 320,
  impactRadius: 14,
  impactScale: 3,
  impactDuration: 420,
  damageFontSize: "15px"
};

/**
 * Selects purely visual feedback from immutable combat events. It deliberately
 * does not read or modify authoritative world state.
 */
export function getCombatFeedbackPresentation(event: GameEvent): CombatFeedbackPresentation | undefined {
  if (event.type === "ship-fired") {
    return NAVAL_STYLE;
  }
  if (event.type !== "damage-dealt") {
    return undefined;
  }

  const specialization = event.payload.specialization;
  if (specialization === "archers") {
    return ARCHER_STYLE;
  }
  if (
    specialization === "militia" ||
    specialization === "spears" ||
    specialization === "raiders" ||
    specialization === "hounds"
  ) {
    return MELEE_STYLES[specialization];
  }
  return MELEE_STYLES.militia;
}
