import { describe, expect, it } from "vitest";
import {
  TACTICAL_RECONNAISSANCE_COLOR,
  TACTICAL_SELECTION_COLOR,
  getTacticalSelectionPresentation
} from "../../src/rendering/selectionPresentation";

describe("tactical selection presentation", () => {
  it("gives selected Crown forces a high-contrast green halo", () => {
    expect(getTacticalSelectionPresentation({ selected: true, inspected: false })).toEqual({
      fillAlpha: 0.52,
      haloAlpha: 0.94,
      haloColor: TACTICAL_SELECTION_COLOR,
      haloVisible: true,
      strokeColor: TACTICAL_SELECTION_COLOR,
      strokeWidth: 3
    });
  });

  it("keeps reconnaissance blue and subordinate to an active Crown selection", () => {
    expect(getTacticalSelectionPresentation({ selected: false, inspected: true })).toMatchObject({
      haloVisible: false,
      strokeColor: TACTICAL_RECONNAISSANCE_COLOR
    });
    expect(getTacticalSelectionPresentation({ selected: true, inspected: true })).toMatchObject({
      haloVisible: true,
      strokeColor: TACTICAL_SELECTION_COLOR
    });
  });
});
