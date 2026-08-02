import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, getBattalionRank, type BattalionState } from "../../src/simulation/state/WorldState";

describe("battalion experience", () => {
  it("awards combat experience, derives rank, and preserves veteran morale under supply collapse", () => {
    const initial = createInitialWorld(181818);
    const attacker: BattalionState = {
      id: "experience-attacker",
      ownerEmpireId: "empire-player",
      settlementId: "settlement-capital",
      position: { x: 600, y: 300 },
      targetId: "experience-defender",
      specialization: "militia",
      size: 8,
      attack: 100,
      defense: 80,
      maxDefense: 80,
      range: 60,
      speed: 40,
      attackCooldownTicks: 1,
      attackCooldownRemaining: 0,
      morale: 80,
      devotion: 50,
      supply: 0,
      experience: 90
    };
    const defender: BattalionState = {
      ...attacker,
      id: "experience-defender",
      ownerEmpireId: "empire-rival",
      settlementId: "settlement-rival",
      targetId: undefined,
      defense: 1,
      maxDefense: 1,
      experience: 0
    };
    const simulation = new Simulation({
      ...initial,
      battalions: { [attacker.id]: attacker, [defender.id]: defender }
    });

    const result = simulation.tick();
    const veteran = simulation.getState().battalions[attacker.id];
    const experienceEvent = result.events.find((event) => event.type === "battalion-experienced");

    expect(veteran.experience).toBe(100);
    expect(veteran.morale).toBe(79);
    expect(getBattalionRank(veteran.experience)).toBe("Legendary");
    expect(experienceEvent?.payload.gained).toBe(10);
  });
});
