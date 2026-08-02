import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, type BattalionState } from "../../src/simulation/state/WorldState";

describe("battle morale", () => {
  it("turns a decisive battalion victory into an explainable morale and devotion gain", () => {
    const initial = createInitialWorld(404040);
    const attacker: BattalionState = {
      id: "morale-attacker",
      ownerEmpireId: "empire-player",
      settlementId: "settlement-capital",
      position: { x: 600, y: 300 },
      targetId: "morale-defender",
      specialization: "militia",
      size: 8,
      attack: 100,
      defense: 80,
      maxDefense: 80,
      range: 60,
      speed: 40,
      attackCooldownTicks: 1,
      attackCooldownRemaining: 0,
      morale: 70,
      devotion: 50,
      supply: 100,
      experience: 0
    };
    const defender: BattalionState = {
      ...attacker,
      id: "morale-defender",
      ownerEmpireId: "empire-rival",
      settlementId: "settlement-rival",
      targetId: undefined,
      defense: 1,
      maxDefense: 1
    };
    const simulation = new Simulation({
      ...initial,
      battalions: { [attacker.id]: attacker, [defender.id]: defender }
    });

    const result = simulation.tick();
    const victor = simulation.getState().battalions[attacker.id];

    expect(victor.morale).toBe(78);
    expect(victor.devotion).toBe(52);
    expect(result.events.some((event) => event.type === "battle-morale-shifted")).toBe(true);
  });
});
