import { isPositionVisibleToEmpire, type SettlementState, type WorldState } from "../simulation/state/WorldState";

export type MandateStepId =
  | "mend-plague"
  | "resolve-captives"
  | "commission-wagon"
  | "garrison-gate"
  | "establish-farm"
  | "raise-battalion"
  | "scout-frontier"
  | "teach-heir"
  | "claim-thrones";

export interface MandateStep {
  readonly id: MandateStepId;
  readonly label: string;
  readonly instruction: string;
  readonly complete: boolean;
}

export interface ImperialMandateProgress {
  readonly steps: readonly MandateStep[];
  readonly completedSteps: number;
  readonly activeStep: MandateStep;
  readonly complete: boolean;
}

const playerSettlements = (state: WorldState): SettlementState[] =>
  state.empires["empire-player"].settlementIds
    .map((id) => state.settlements[id])
    .filter((settlement): settlement is SettlementState => Boolean(settlement));

const hasCompletedFarm = (state: WorldState, settlements: readonly SettlementState[]): boolean =>
  settlements.some((settlement) =>
    settlement.buildingIds.some((id) => state.buildings[id]?.kind === "farm" && state.buildings[id]?.complete)
  );

const hasFieldBattalion = (state: WorldState): boolean =>
  Object.values(state.battalions).some(
    (battalion) => battalion.ownerEmpireId === "empire-player" && battalion.specialization !== "hounds"
  );

const hasObservedRival = (state: WorldState): boolean =>
  Object.values(state.buildings).some(
    (building) =>
      building.ownerEmpireId === "empire-rival" && isPositionVisibleToEmpire(state, "empire-player", building.position)
  );

const hasGuidedHeir = (state: WorldState): boolean =>
  Object.values(state.heirs).some(
    (heir) =>
      heir.ownerEmpireId === "empire-player" && heir.lastDoctrineId !== undefined && heir.trust !== 50
  );

/**
 * Derives a scenario-aware, presentation-only first-session path from the
 * authoritative state. It never adds a tutorial flag or changes world rules.
 */
export function getImperialMandateProgress(state: WorldState): ImperialMandateProgress {
  const settlements = playerSettlements(state);
  const hasPlague = settlements.some((settlement) => (settlement.plagueTicks ?? 0) > 0);
  const hasCaptives = settlements.some((settlement) => settlement.population.captives > 0);
  const hasWagon = Object.values(state.caravans).some(
    (caravan) => caravan.ownerEmpireId === "empire-player" && caravan.kind === "caravan"
  );
  const hasGarrisonedGate = Object.values(state.buildings).some(
    (building) =>
      building.ownerEmpireId === "empire-player" &&
      building.kind === "gate" &&
      (building.garrisonBattalionIds?.length ?? 0) > 0
  );

  const steps: MandateStep[] = [];
  if (state.scenarioId === "ashen-oath") {
    steps.push({
      id: "mend-plague",
      label: "MEND CROWNKEEP: END THE PLAGUE.",
      instruction: "COMMAND DOCK > MEND // spend Faith to save Crownkeep.",
      complete: !hasPlague
    });
    steps.push({
      id: "resolve-captives",
      label: "SECURE THE CAPTIVES: ASSIMILATE OR RELEASE THEM.",
      instruction: "COMMAND DOCK > ASSIMILATE or RELEASE // or open ACCORD [D] to return equal prisoners.",
      complete: !hasCaptives
    });
  }
  if (state.scenarioId === "rivergate") {
    steps.push({
      id: "commission-wagon",
      label: "COMMISSION A SUPPLY WAGON FROM THE TOWN SQUARE.",
      instruction: "COMMAND DOCK > SUPPLY WAGON // route food along roads.",
      complete: hasWagon
    });
  }
  if (state.scenarioId === "stonewall") {
    steps.push({
      id: "raise-battalion",
      label: "RAISE A BATTALION TO HOLD THE GATE.",
      instruction: "COMMAND DOCK > MILITIA // recruit a field battalion.",
      complete: hasFieldBattalion(state)
    });
    steps.push({
      id: "garrison-gate",
      label: "GARRISON A BATTALION IN THE GATE.",
      instruction: "Select the battalion, then COMMAND DOCK > GARRISON.",
      complete: hasGarrisonedGate
    });
  }

  if (state.scenarioId !== "stonewall") {
    steps.push({
      id: "establish-farm",
      label: "ESTABLISH A FARM ON FERTILE GROUND.",
      instruction: "Open BUILD [B], choose FARM, then place it on [F] fertile ground.",
      complete: hasCompletedFarm(state, settlements)
    });
    steps.push({
      id: "raise-battalion",
      label: "RAISE A BATTALION TO SECURE THE CROWN.",
      instruction: "COMMAND DOCK > MILITIA // recruit a field battalion.",
      complete: hasFieldBattalion(state)
    });
  } else {
    steps.push({
      id: "establish-farm",
      label: "ESTABLISH A FARM ON FERTILE GROUND.",
      instruction: "Open BUILD [B], choose FARM, then place it on [F] fertile ground.",
      complete: hasCompletedFarm(state, settlements)
    });
  }

  steps.push({
    id: "scout-frontier",
    label: "SCOUT THE FRONTIER AND FIND THE RIVAL THRONE.",
    instruction: "Select a field battalion, then use MOVE [M] into the frontier.",
    complete: hasObservedRival(state)
  });
  steps.push({
    id: "teach-heir",
    label: "TEACH THE HEIR: REWARD OR PUNISH THE LAST LESSON.",
    instruction: "Open HEIR [H], then REWARD or PUNISH the last lesson.",
    complete: hasGuidedHeir(state)
  });
  steps.push({
    id: "claim-thrones",
    label: "BREAK THE RIVAL CASTLES AND TAKE THE THRONES.",
    instruction: "Break the rival castle defenses, then take the throne.",
    complete: state.victory.winnerEmpireId === "empire-player"
  });

  const completedSteps = steps.filter((step) => step.complete).length;
  const activeStep = steps.find((step) => !step.complete) ?? steps.at(-1)!;
  return { steps, completedSteps, activeStep, complete: completedSteps === steps.length };
}
