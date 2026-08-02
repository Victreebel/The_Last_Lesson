import type { TerrainKind } from "../simulation/state/WorldState";

export type TerrainPattern = "grass" | "furrows" | "canopy" | "veins" | "blooms" | "contours" | "ripples" | "reeds";

export interface TerrainPresentation {
  readonly color: number;
  readonly patternColor: number;
  readonly symbol: string;
  readonly detail: string;
  readonly pattern: TerrainPattern;
}

/**
 * Terrain remains authoritative simulation data. These signatures are only a
 * legible, color-independent visual treatment for the existing world zones.
 */
export const TERRAIN_PRESENTATIONS: Record<TerrainKind, TerrainPresentation> = {
  grassland: {
    color: 0x4b623a,
    patternColor: 0x9ab66b,
    symbol: "G",
    detail: "OPEN BUILD GROUND",
    pattern: "grass"
  },
  fertile: {
    color: 0x758e3c,
    patternColor: 0xd5d67f,
    symbol: "F",
    detail: "FARMS / FOOD",
    pattern: "furrows"
  },
  forest: {
    color: 0x28513a,
    patternColor: 0x7ba26b,
    symbol: "W",
    detail: "LUMBER MILLS / WOOD",
    pattern: "canopy"
  },
  "iron-vein": {
    color: 0x5c6670,
    patternColor: 0xbfc8ce,
    symbol: "I",
    detail: "MINES / IRON",
    pattern: "veins"
  },
  "luxury-grove": {
    color: 0x987e45,
    patternColor: 0xf0c979,
    symbol: "L",
    detail: "PLANTATIONS / LUXURY",
    pattern: "blooms"
  },
  hills: {
    color: 0x746b4f,
    patternColor: 0xd3c68a,
    symbol: "H",
    detail: "SLOW / DEFENSE +",
    pattern: "contours"
  },
  water: {
    color: 0x2f667c,
    patternColor: 0x9cc8d5,
    symbol: "~",
    detail: "BLOCKS LAND UNITS",
    pattern: "ripples"
  },
  marsh: {
    color: 0x4a624f,
    patternColor: 0xafbd82,
    symbol: "M",
    detail: "SLOW / UNBUILDABLE",
    pattern: "reeds"
  }
};

export const getTerrainPresentation = (kind: TerrainKind): TerrainPresentation => TERRAIN_PRESENTATIONS[kind];
