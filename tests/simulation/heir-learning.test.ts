import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("heir learning", () => {
  it("creates a doctrine from player behavior and adjusts it through feedback", () => {
    const simulation = new Simulation(createInitialWorld(13579));

    simulation.enqueueCommand({
      id: "focus-farms",
      issuedBy: "player-1",
      tick: 1,
      type: "assign-labor",
      payload: {
        settlementId: "settlement-capital",
        farmers: 10,
        builders: 2,
        lumberjacks: 4,
        miners: 0
      }
    });

    const observation = simulation.tick();
    const heirAfterObservation = simulation.getState().heirs["heir-prime"];
    const doctrineId = heirAfterObservation.lastDoctrineId;

    expect(doctrineId).toBeDefined();
    expect(simulation.getState().doctrines[doctrineId!].preferredAction).toBe("Prioritize farm labor");
    expect(observation.events.some((event) => event.type === "doctrine-observed")).toBe(true);

    simulation.enqueueCommand({
      id: "reward-lesson",
      issuedBy: "player-1",
      tick: 2,
      type: "reward-heir",
      payload: { heirId: "heir-prime" }
    });

    const feedback = simulation.tick();
    expect(simulation.getState().doctrines[doctrineId!].confidence).toBe(38);
    expect(simulation.getState().heirs["heir-prime"].trust).toBe(55);
    expect(feedback.events.some((event) => event.type === "doctrine-reinforced")).toBe(true);
  });
});
