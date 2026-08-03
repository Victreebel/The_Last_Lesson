import { describe, expect, it } from "vitest";
import {
  getTacticalTopPanelLayout,
  TACTICAL_TOP_PANEL_GAP,
  TACTICAL_TOP_PANEL_MARGIN,
  type TacticalTopPanelWidths
} from "../../src/rendering/tacticalPanelLayout";

const widths: TacticalTopPanelWidths = {
  accord: 262,
  heir: 286,
  build: 306
};

describe("tactical top panel layout", () => {
  it("keeps all compact-width panel headers inside the viewport without overlap", () => {
    const layout = getTacticalTopPanelLayout(768, widths);

    expect(layout.scale).toBeLessThan(1);
    expect(layout.accordX).toBeCloseTo(TACTICAL_TOP_PANEL_MARGIN);
    expect(layout.heirX).toBeGreaterThanOrEqual(layout.accordX + widths.accord * layout.scale + TACTICAL_TOP_PANEL_GAP);
    expect(layout.buildX).toBeGreaterThanOrEqual(layout.heirX + widths.heir * layout.scale + TACTICAL_TOP_PANEL_GAP);
    expect(layout.buildX + widths.build * layout.scale).toBeLessThanOrEqual(768 - TACTICAL_TOP_PANEL_MARGIN);
  });

  it("preserves full-sized desktop panels", () => {
    const layout = getTacticalTopPanelLayout(1280, widths);

    expect(layout.scale).toBe(1);
    expect(layout.accordX).toBe(386);
    expect(layout.buildX + widths.build).toBe(1280 - TACTICAL_TOP_PANEL_MARGIN);
  });
});
