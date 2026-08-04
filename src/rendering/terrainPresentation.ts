import type { TerrainKind } from "../simulation/state/WorldState";

export type TerrainPattern = "grass" | "furrows" | "canopy" | "veins" | "blooms" | "contours" | "ripples" | "reeds";

export interface TerrainPresentation {
  readonly color: number;
  readonly patternColor: number;
  readonly symbol: string;
  readonly detail: string;
  readonly compactDetail: string;
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
    detail: "OPEN BUILD // 100% MOVE",
    compactDetail: "OPEN BUILD",
    pattern: "grass"
  },
  fertile: {
    color: 0x758e3c,
    patternColor: 0xd5d67f,
    symbol: "F",
    detail: "FARMS / FOOD // 100% MOVE",
    compactDetail: "FARM / FOOD",
    pattern: "furrows"
  },
  forest: {
    color: 0x28513a,
    patternColor: 0x7ba26b,
    symbol: "W",
    detail: "MILLS / WOOD // 72% MOVE // +12% DEF",
    compactDetail: "MILL / WOOD",
    pattern: "canopy"
  },
  "iron-vein": {
    color: 0x5c6670,
    patternColor: 0xbfc8ce,
    symbol: "I",
    detail: "MINES / IRON // 100% MOVE",
    compactDetail: "MINE / IRON",
    pattern: "veins"
  },
  "luxury-grove": {
    color: 0x987e45,
    patternColor: 0xf0c979,
    symbol: "L",
    detail: "PLANTATIONS / LUXURY // 100% MOVE",
    compactDetail: "PLANTATION / LUX",
    pattern: "blooms"
  },
  hills: {
    color: 0x746b4f,
    patternColor: 0xd3c68a,
    symbol: "H",
    detail: "68% MOVE // +22% DEF",
    compactDetail: "68% MOVE / +22 DEF",
    pattern: "contours"
  },
  water: {
    color: 0x2f667c,
    patternColor: 0x9cc8d5,
    symbol: "~",
    detail: "LAND BLOCKED // SHIPS ONLY",
    compactDetail: "SHIPS ONLY",
    pattern: "ripples"
  },
  marsh: {
    color: 0x4a624f,
    patternColor: 0xafbd82,
    symbol: "M",
    detail: "UNBUILDABLE // 45% MOVE // -10% DEF",
    compactDetail: "45% MOVE / -10 DEF",
    pattern: "reeds"
  }
};

export const getTerrainPresentation = (kind: TerrainKind): TerrainPresentation => TERRAIN_PRESENTATIONS[kind];

/**
 * World labels identify terrain without turning every test zone into a full
 * screen-sidecard. The full detail remains available to placement and theatre
 * guidance, while this compact cue preserves the playable field.
 */
export function getTerrainZoneBadge(kind: TerrainKind, label: string): { readonly heading: string; readonly detail: string } {
  const presentation = getTerrainPresentation(kind);
  return {
    heading: `[${presentation.symbol}] ${label}`,
    detail: presentation.compactDetail
  };
}
