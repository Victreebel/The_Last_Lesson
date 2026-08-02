import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, RIVAL_DIFFICULTY_PROFILES } from "../../src/simulation/state/WorldState";

describe("rival doctrine difficulty", () => {
  it("changes opening pace without granting the rival hidden resources or combat statistics", () => {
    const initialDisciple = createInitialWorld(777, "disciple");
    const initialArchitect = createInitialWorld(777, "architect");
    const disciple = new Simulation(createInitialWorld(777, "disciple"));
    const rival = new Simulation(createInitialWorld(777, "rival"));
    const architect = new Simulation(createInitialWorld(777, "architect"));

    disciple.runTicks(10);
    rival.runTicks(9);
    architect.runTicks(6);

    const countRivermarchBattalions = (simulation: Simulation) =>
      Object.values(simulation.getState().battalions).filter(
        (battalion) => battalion.ownerEmpireId === "empire-rival" && battalion.settlementId === "settlement-rival").length;

    expect(countRivermarchBattalions(disciple)).toBe(1);
    expect(countRivermarchBattalions(rival)).toBe(2);
    expect(countRivermarchBattalions(architect)).toBe(2);
    expect(initialDisciple.empires["empire-rival"].resources).toEqual(
      initialArchitect.empires["empire-rival"].resources
    );
    expect(initialDisciple.battalions["battalion-rival-1"]).toEqual(
      initialArchitect.battalions["battalion-rival-1"]
    );
  });

  it("defines a transparent doctrine-learning gradient for rival governors", () => {
    expect(RIVAL_DIFFICULTY_PROFILES.disciple.doctrineConfidenceGain).toBeLessThan(
      RIVAL_DIFFICULTY_PROFILES.rival.doctrineConfidenceGain
    );
    expect(RIVAL_DIFFICULTY_PROFILES.rival.doctrineConfidenceGain).toBeLessThan(
      RIVAL_DIFFICULTY_PROFILES.architect.doctrineConfidenceGain
    );
    expect(RIVAL_DIFFICULTY_PROFILES.architect.openingGraceTicks).toBeLessThan(
      RIVAL_DIFFICULTY_PROFILES.disciple.openingGraceTicks
    );
  });
});
