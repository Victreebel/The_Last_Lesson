import type { ScenarioId, WorldState } from "../simulation/state/WorldState";

export interface CampaignHonor {
  readonly id: string;
  readonly label: string;
  readonly condition: string;
}

export const SCENARIO_HONORS: Record<ScenarioId, CampaignHonor> = {
  crownfall: {
    id: "veterans-lesson",
    label: "VETERANS' LESSON",
    condition: "Win with a Regular or better Crown battalion."
  },
  rivergate: {
    id: "tidecaller",
    label: "TIDECALLER",
    condition: "Win with a Crown Warship afloat."
  },
  "ashen-oath": {
    id: "civic-reckoning",
    label: "CIVIC RECKONING",
    condition: "Resolve at least eight captives through integration or release."
  },
  stonewall: {
    id: "unbroken-gate",
    label: "UNBROKEN GATE",
    condition: "Win while the opening gate still stands."
  }
};

/** Cosmetic campaign honors derived only after a victorious reign. */
export function getEarnedScenarioHonor(state: WorldState): CampaignHonor | undefined {
  switch (state.scenarioId) {
    case "crownfall":
      return Object.values(state.battalions).some(
        (battalion) => battalion.ownerEmpireId === "empire-player" && (battalion.experience ?? 0) >= 10
      )
        ? SCENARIO_HONORS.crownfall
        : undefined;
    case "rivergate":
      return Object.values(state.caravans).some(
        (caravan) => caravan.ownerEmpireId === "empire-player" && caravan.kind === "ship" && caravan.defense > 0
      )
        ? SCENARIO_HONORS.rivergate
        : undefined;
    case "ashen-oath": {
      const memory = state.empires["empire-player"]?.moralMemory;
      return (memory?.captivesIntegrated ?? 0) + (memory?.captivesReleased ?? 0) >= 8
        ? SCENARIO_HONORS["ashen-oath"]
        : undefined;
    }
    case "stonewall": {
      const gate = state.buildings["building-stonewall-gate"];
      return gate?.ownerEmpireId === "empire-player" && gate.defense > 0 ? SCENARIO_HONORS.stonewall : undefined;
    }
  }
}
