import { describe, expect, it } from "vitest";
import { getImperialMandateProgress } from "../../src/campaign/ImperialMandate";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("imperial mandate", () => {
  it("leads the default campaign through economy, force, scouting, teaching, and victory", () => {
    const initial = createInitialWorld(5101, "rival", "crownfall");
    expect(getImperialMandateProgress(initial)).toMatchObject({
      completedSteps: 0,
      activeStep: { id: "establish-farm" }
    });

    const primeHeir = initial.heirs["heir-prime"];
    const taught = {
      ...initial,
      heirs: {
        ...initial.heirs,
        "heir-prime": { ...primeHeir, lastDoctrineId: "doctrine-lesson", trust: 55 }
      }
    };
    expect(getImperialMandateProgress(taught).steps.find((step) => step.id === "teach-heir")).toMatchObject({
      complete: true
    });
  });

  it("puts each authored theatre's distinctive civic or defensive lesson before conquest", () => {
    const rivergate = getImperialMandateProgress(createInitialWorld(5102, "rival", "rivergate"));
    const ashenOath = getImperialMandateProgress(createInitialWorld(5103, "rival", "ashen-oath"));
    const stonewall = getImperialMandateProgress(createInitialWorld(5104, "rival", "stonewall"));

    expect(rivergate.activeStep.id).toBe("commission-wagon");
    expect(ashenOath.activeStep.id).toBe("mend-plague");
    expect(stonewall.steps.slice(0, 2).map((step) => step.id)).toEqual(["raise-battalion", "garrison-gate"]);
  });

  it("does not need hidden tutorial state to recognize a completed realm", () => {
    const initial = createInitialWorld(5105);
    const completed = {
      ...initial,
      victory: { winnerEmpireId: "empire-player" as const, completedAtTick: 12 },
      empires: { ...initial.empires, "empire-rival": { ...initial.empires["empire-rival"], settlementIds: [] } }
    };

    expect(getImperialMandateProgress(completed).steps.at(-1)).toMatchObject({ id: "claim-thrones", complete: true });
  });
});
