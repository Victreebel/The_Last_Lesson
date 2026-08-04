export interface TacticalSelectionPresentation {
  readonly fillAlpha: number;
  readonly haloAlpha: number;
  readonly haloColor: number;
  readonly haloVisible: boolean;
  readonly strokeColor: number;
  readonly strokeWidth: number;
}

export const TACTICAL_SELECTION_COLOR = 0xc8f59d;
export const TACTICAL_RECONNAISSANCE_COLOR = 0x84cbe1;
const TACTICAL_NEUTRAL_COLOR = 0xf0d36f;

/**
 * Produces the complete, presentation-only focus treatment for a tactical
 * entity. Crown command is green; reconnaissance remains blue so selection
 * never looks like discovered rival intelligence.
 */
export function getTacticalSelectionPresentation(input: {
  readonly inspected: boolean;
  readonly selected: boolean;
}): TacticalSelectionPresentation {
  if (input.selected) {
    return {
      fillAlpha: 0.52,
      haloAlpha: 0.94,
      haloColor: TACTICAL_SELECTION_COLOR,
      haloVisible: true,
      strokeColor: TACTICAL_SELECTION_COLOR,
      strokeWidth: 3
    };
  }

  if (input.inspected) {
    return {
      fillAlpha: 0.35,
      haloAlpha: 0,
      haloColor: TACTICAL_RECONNAISSANCE_COLOR,
      haloVisible: false,
      strokeColor: TACTICAL_RECONNAISSANCE_COLOR,
      strokeWidth: 3
    };
  }

  return {
    fillAlpha: 0.35,
    haloAlpha: 0,
    haloColor: TACTICAL_NEUTRAL_COLOR,
    haloVisible: false,
    strokeColor: TACTICAL_NEUTRAL_COLOR,
    strokeWidth: 2
  };
}
