import { describe, expect, it } from "vitest";
import { TERRAIN_PRESENTATIONS } from "../../src/rendering/terrainPresentation";
import { terrainDefenseMultiplier, terrainMovementMultiplier, type TerrainKind } from "../../src/simulation/state/WorldState";

describe("terrain presentation", () => {
  it("gives every authoritative terrain kind an explicit readable signature", () => {
    expect(Object.keys(TERRAIN_PRESENTATIONS)).toHaveLength(8);
    expect(new Set(Object.values(TERRAIN_PRESENTATIONS).map((presentation) => presentation.symbol)).size).toBe(8);
    expect(new Set(Object.values(TERRAIN_PRESENTATIONS).map((presentation) => presentation.pattern)).size).toBe(8);
  });

  it("keeps terrain guidance attached to the visual representation", () => {
    expect(TERRAIN_PRESENTATIONS.fertile).toMatchObject({ detail: "FARMS / FOOD // 100% MOVE", pattern: "furrows" });
    expect(TERRAIN_PRESENTATIONS.forest).toMatchObject({ detail: "MILLS / WOOD // 72% MOVE // +12% DEF", pattern: "canopy" });
    expect(TERRAIN_PRESENTATIONS["iron-vein"]).toMatchObject({ detail: "MINES / IRON // 100% MOVE", pattern: "veins" });
    expect(TERRAIN_PRESENTATIONS.water).toMatchObject({ detail: "LAND BLOCKED // SHIPS ONLY", pattern: "ripples" });
  });

  it("surfaces the authoritative tactical modifiers on every non-water terrain label", () => {
    const terrainKinds = Object.keys(TERRAIN_PRESENTATIONS) as TerrainKind[];
    for (const kind of terrainKinds.filter((candidate) => candidate !== "water")) {
      const detail = TERRAIN_PRESENTATIONS[kind].detail;
      expect(detail).toContain(`${Math.round(terrainMovementMultiplier(kind) * 100)}% MOVE`);
      const defensePercent = Math.round((terrainDefenseMultiplier(kind) - 1) * 100);
      if (defensePercent !== 0) {
        expect(detail).toContain(`${defensePercent > 0 ? "+" : ""}${defensePercent}% DEF`);
      }
    }
  });
});
