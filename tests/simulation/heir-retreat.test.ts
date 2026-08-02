import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, type BattalionState } from "../../src/simulation/state/WorldState";

describe("heir retreat", () => {
  it("orders a depleted governed battalion back to its Crown when a visible enemy closes in", () => {
    const initial = createInitialWorld(909090);
    const enemy: BattalionState = {
      id: "crown-threat", ownerEmpireId: "empire-player", settlementId: "settlement-capital",
      position: { x: 1090, y: 390 }, specialization: "militia", size: 8, attack: 8, defense: 80,
      maxDefense: 80, range: 42, speed: 40, attackCooldownTicks: 1, attackCooldownRemaining: 0,
      morale: 70, devotion: 50, supply: 100, experience: 0
    };
    const simulation = new Simulation({
      ...initial,
      battalions: {
        ...initial.battalions,
        [enemy.id]: enemy,
        "battalion-rival-1": { ...initial.battalions["battalion-rival-1"], morale: 30, supply: 10 }
      }
    });

    const result = simulation.tick();
    const governor = simulation.getState().heirs["heir-rival"];
    const battalion = simulation.getState().battalions["battalion-rival-1"];

    expect(governor.lastDecision?.action).toBe("Retreat to Crown");
    expect(battalion.targetId).toBeUndefined();
    expect(result.events.some((event) => event.type === "battalion-retreated" && event.payload.heirId === "heir-rival")).toBe(true);
  });
});
