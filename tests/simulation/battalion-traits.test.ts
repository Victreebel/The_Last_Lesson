import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, getBattalionTraits, type BattalionState } from "../../src/simulation/state/WorldState";

describe("battalion traits", () => {
  it("derives forest expertise from repeated combat and records the learned trait", () => {
    const initial = createInitialWorld(606060);
    const attacker: BattalionState = {
      id: "forest-attacker", ownerEmpireId: "empire-player", settlementId: "settlement-capital",
      position: { x: 170, y: 650 }, targetId: "forest-defender", specialization: "militia", size: 8,
      attack: 100, defense: 80, maxDefense: 80, range: 60, speed: 40, attackCooldownTicks: 1,
      attackCooldownRemaining: 0, morale: 80, devotion: 50, supply: 100, experience: 0,
      battlefieldTraining: { forest: 5 }
    };
    const defender: BattalionState = { ...attacker, id: "forest-defender", ownerEmpireId: "empire-rival", settlementId: "settlement-rival", targetId: undefined, defense: 1, maxDefense: 1 };
    const simulation = new Simulation({ ...initial, battalions: { [attacker.id]: attacker, [defender.id]: defender } });

    const result = simulation.tick();
    const veteran = simulation.getState().battalions[attacker.id];

    expect(getBattalionTraits(veteran.battlefieldTraining)).toContain("Forest Veterans");
    expect(result.events.some((event) => event.type === "battalion-trained" && event.payload.trait === "Forest Veterans")).toBe(true);
  });
});
