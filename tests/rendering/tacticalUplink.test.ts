import { describe, expect, it } from "vitest";
import { getTacticalUplinkStatusLines } from "../../src/rendering/tacticalUplink";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("tactical Uplink presentation", () => {
  it("keeps the active battlefield status to five high-signal lines", () => {
    const state = createInitialWorld(9201);
    const settlement = state.settlements["settlement-capital"];
    const lines = getTacticalUplinkStatusLines({
      order: "SELECT",
      settlement,
      citizenCapacity: 24,
      captiveCapacity: 0,
      selectedCaravan: false,
      selectedBattalionCount: 0
    });

    expect(lines).toEqual([
      "ORDER: SELECT // NO UNIT SELECTED",
      "PEOPLE: 24/24 CIV // 0 MIL // GROWTH 0/80",
      "LABOR: F0 B0 W0 I0 L0",
      "STABILITY: CAPTIVES 0/0 // REBELLION 0% // HEALTH 90 // PLAGUE 0",
      "FAITH: INTERNAL 50 // RIVAL PRESSURE 0"
    ]);
    expect(lines.join("\n")).not.toContain("CIVIC RECORD");
  });

  it("preserves selected-force details without expanding the command readout", () => {
    const state = createInitialWorld(9202);
    const settlement = state.settlements["settlement-capital"];
    const battalion = {
      id: "test-spears",
      ownerEmpireId: "empire-player" as const,
      settlementId: "settlement-capital" as const,
      position: { x: 0, y: 0 },
      specialization: "spears" as const,
      size: 12,
      attack: 1,
      defense: 1,
      maxDefense: 1,
      range: 1,
      speed: 1,
      attackCooldownTicks: 1,
      attackCooldownRemaining: 0,
      morale: 84,
      devotion: 50,
      supply: 92,
      experience: 36
    };

    const lines = getTacticalUplinkStatusLines({
      order: "ATTACK",
      settlement,
      citizenCapacity: 24,
      captiveCapacity: 0,
      selectedBattalion: battalion,
      selectedCaravan: false,
      selectedBattalionCount: 1,
      activeControlGroup: 2
    });

    expect(lines).toHaveLength(5);
    expect(lines[0]).toBe("ORDER: ATTACK // VETERAN SPEARS // H100 M84 S92");
  });
});
