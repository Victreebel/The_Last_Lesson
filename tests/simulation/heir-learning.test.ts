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

  it("can reinforce a reviewed earlier doctrine without retargeting the heir's newest lesson", () => {
    const simulation = new Simulation(createInitialWorld(24680));
    const queueLabor = (id: string, tick: number, farmers: number) =>
      simulation.enqueueCommand({
        id,
        issuedBy: "player-1",
        tick,
        type: "assign-labor",
        payload: { settlementId: "settlement-capital", farmers, builders: 2, lumberjacks: 4, miners: 0 }
      });

    queueLabor("learn-farms", 1, 10);
    simulation.tick();
    const firstDoctrineId = simulation.getState().heirs["heir-prime"].lastDoctrineId!;
    simulation.enqueueCommand({
      id: "learn-faith",
      issuedBy: "player-1",
      tick: 2,
      type: "generate-faith",
      payload: { empireId: "empire-player", amount: 1 }
    });
    simulation.tick();
    const newestDoctrineId = simulation.getState().heirs["heir-prime"].lastDoctrineId!;
    expect(newestDoctrineId).not.toBe(firstDoctrineId);

    simulation.enqueueCommand({
      id: "reward-reviewed-farms",
      issuedBy: "player-1",
      tick: 3,
      type: "reward-heir",
      payload: { heirId: "heir-prime", doctrineId: firstDoctrineId }
    });
    simulation.tick();

    expect(simulation.getState().doctrines[firstDoctrineId].confidence).toBe(38);
    expect(simulation.getState().doctrines[newestDoctrineId].confidence).toBe(22);
    expect(simulation.getState().heirs["heir-prime"].lastDoctrineId).toBe(newestDoctrineId);
  });
});
