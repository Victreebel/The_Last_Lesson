import { describe, expect, it } from "vitest";
import { TERRAIN_PRESENTATIONS } from "../../src/rendering/terrainPresentation";

describe("terrain presentation", () => {
  it("gives every authoritative terrain kind an explicit readable signature", () => {
    expect(Object.keys(TERRAIN_PRESENTATIONS)).toHaveLength(8);
    expect(new Set(Object.values(TERRAIN_PRESENTATIONS).map((presentation) => presentation.symbol)).size).toBe(8);
    expect(new Set(Object.values(TERRAIN_PRESENTATIONS).map((presentation) => presentation.pattern)).size).toBe(8);
  });

  it("keeps terrain guidance attached to the visual representation", () => {
    expect(TERRAIN_PRESENTATIONS.fertile).toMatchObject({ detail: "FARMS / FOOD", pattern: "furrows" });
    expect(TERRAIN_PRESENTATIONS.forest).toMatchObject({ detail: "LUMBER MILLS / WOOD", pattern: "canopy" });
    expect(TERRAIN_PRESENTATIONS["iron-vein"]).toMatchObject({ detail: "MINES / IRON", pattern: "veins" });
    expect(TERRAIN_PRESENTATIONS.water).toMatchObject({ detail: "BLOCKS LAND UNITS", pattern: "ripples" });
  });
});
