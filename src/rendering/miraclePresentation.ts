import type { TacticalSound } from "./AudioDirector";
import type { GameEvent } from "../simulation/events/GameEvent";

export type MiracleDelivery = "harvest" | "inspiration" | "restoration" | "judgment";

export interface MiracleFeedbackPresentation {
  readonly delivery: MiracleDelivery;
  readonly sound: TacticalSound;
  readonly color: number;
  readonly accentColor: number;
  readonly label: string;
  readonly radius: number;
  readonly ringScale: number;
  readonly duration: number;
  readonly particleCount: number;
}

const MIRACLE_PRESENTATIONS: Record<string, MiracleFeedbackPresentation> = {
  "bless-harvest": {
    delivery: "harvest",
    sound: "miracle-harvest",
    color: 0xb9d86d,
    accentColor: 0xf4e59a,
    label: "HARVEST BLESSED",
    radius: 30,
    ringScale: 2.7,
    duration: 900,
    particleCount: 7
  },
  "inspire-battalion": {
    delivery: "inspiration",
    sound: "miracle-inspire",
    color: 0xf2d77f,
    accentColor: 0xfff1b5,
    label: "ARMY INSPIRED",
    radius: 22,
    ringScale: 2.35,
    duration: 740,
    particleCount: 5
  },
  "mend-settlement": {
    delivery: "restoration",
    sound: "miracle-mend",
    color: 0x8ed4a5,
    accentColor: 0xd4ffe3,
    label: "SETTLEMENT MENDED",
    radius: 34,
    ringScale: 2.25,
    duration: 980,
    particleCount: 6
  },
  "divine-judgment": {
    delivery: "judgment",
    sound: "miracle-judgment",
    color: 0x90c8df,
    accentColor: 0xe0f5ff,
    label: "DIVINE WARD",
    radius: 38,
    ringScale: 2.65,
    duration: 1020,
    particleCount: 4
  }
};

/**
 * Resolves an immutable miracle event into an audiovisual treatment. This
 * layer never changes the simulation event or evaluates gameplay state.
 */
export function getMiracleFeedbackPresentation(event: GameEvent): MiracleFeedbackPresentation | undefined {
  if (event.type !== "miracle-cast") {
    return undefined;
  }
  const miracle = event.payload.miracle;
  return typeof miracle === "string" ? MIRACLE_PRESENTATIONS[miracle] : undefined;
}
