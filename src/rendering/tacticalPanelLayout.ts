export interface TacticalTopPanelWidths {
  readonly accord: number;
  readonly heir: number;
  readonly build: number;
}

export interface TacticalTopPanelLayout {
  readonly scale: number;
  readonly accordX: number;
  readonly heirX: number;
  readonly buildX: number;
}

export const TACTICAL_TOP_PANEL_GAP = 12;
export const TACTICAL_TOP_PANEL_MARGIN = 16;

/**
 * Keeps the Accord, Heir, and Build headers inside one stable tactical strip.
 * Narrow phones use their dedicated stacked layout in the scene instead.
 */
export function getTacticalTopPanelLayout(
  viewportWidth: number,
  widths: TacticalTopPanelWidths
): TacticalTopPanelLayout {
  const totalPanelWidth = widths.accord + widths.heir + widths.build;
  const availableWidth = Math.max(
    0,
    viewportWidth - TACTICAL_TOP_PANEL_MARGIN * 2 - TACTICAL_TOP_PANEL_GAP * 2
  );
  const scale = Math.min(1, availableWidth / totalPanelWidth);
  const buildX = viewportWidth - TACTICAL_TOP_PANEL_MARGIN - widths.build * scale;
  const heirX = buildX - TACTICAL_TOP_PANEL_GAP - widths.heir * scale;
  const accordX = heirX - TACTICAL_TOP_PANEL_GAP - widths.accord * scale;

  return { scale, accordX, heirX, buildX };
}
