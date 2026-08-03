import type { BuildingKind } from "../simulation/state/WorldState";
import type { MandateStepId } from "./ImperialMandate";

/**
 * Presentation-only bridge between a state-derived Mandate and the existing
 * controls that can satisfy it. It never queues a command or changes state.
 */
export type MandateCommandControl =
  | "supply"
  | "move"
  | "attack"
  | "militia"
  | "assimilate"
  | "release"
  | "garrison"
  | "mend";

export type MandateGuidanceSurface = "build" | "command" | "heir";

export interface MandateGuidance {
  readonly surface: MandateGuidanceSurface;
  readonly label: string;
  readonly buildingTargets: readonly BuildingKind[];
  readonly commandTargets: readonly MandateCommandControl[];
}

const GUIDANCE: Record<MandateStepId, MandateGuidance> = {
  "mend-plague": {
    surface: "command",
    label: "COMMAND // MEND",
    buildingTargets: [],
    commandTargets: ["mend"]
  },
  "resolve-captives": {
    surface: "command",
    label: "COMMAND // CAPTIVE POLICY",
    buildingTargets: [],
    commandTargets: ["assimilate", "release"]
  },
  "commission-wagon": {
    surface: "command",
    label: "COMMAND // SUPPLY",
    buildingTargets: [],
    commandTargets: ["supply"]
  },
  "garrison-gate": {
    surface: "command",
    label: "COMMAND // GARRISON",
    buildingTargets: [],
    commandTargets: ["garrison"]
  },
  "establish-farm": {
    surface: "build",
    label: "BUILD [B] // FARM",
    buildingTargets: ["farm"],
    commandTargets: []
  },
  "raise-battalion": {
    surface: "command",
    label: "COMMAND // MILITIA",
    buildingTargets: [],
    commandTargets: ["militia"]
  },
  "scout-frontier": {
    surface: "command",
    label: "COMMAND // MOVE",
    buildingTargets: [],
    commandTargets: ["move"]
  },
  "teach-heir": {
    surface: "heir",
    label: "HEIR [H] // FEEDBACK",
    buildingTargets: [],
    commandTargets: []
  },
  "claim-thrones": {
    surface: "command",
    label: "COMMAND // ATTACK",
    buildingTargets: [],
    commandTargets: ["attack"]
  }
};

export function getMandateGuidance(stepId: MandateStepId): MandateGuidance {
  return GUIDANCE[stepId];
}
