import { describe, expect, it } from "vitest";
import { getLineFormationDestinations } from "../../src/rendering/formationPresentation";

describe("formation presentation", () => {
  it("assigns a stable, grid-aligned line around the ordered destination", () => {
    const destinations = getLineFormationDestinations(
      [
        { id: "battalion-b", position: { x: 520, y: 320 } },
        { id: "battalion-a", position: { x: 460, y: 320 } },
        { id: "battalion-c", position: { x: 580, y: 320 } }
      ],
      { x: 800, y: 320 }
    );

    expect(destinations).toEqual([
      { battalionId: "battalion-a", destination: { x: 800, y: 256 } },
      { battalionId: "battalion-b", destination: { x: 800, y: 320 } },
      { battalionId: "battalion-c", destination: { x: 800, y: 384 } }
    ]);
  });

  it("rotates the line with the direction of travel and remains independent of selection order", () => {
    const ordered = getLineFormationDestinations(
      [
        { id: "battalion-a", position: { x: 480, y: 440 } },
        { id: "battalion-b", position: { x: 544, y: 440 } }
      ],
      { x: 512, y: 704 }
    );
    const reversed = getLineFormationDestinations(
      [
        { id: "battalion-b", position: { x: 544, y: 440 } },
        { id: "battalion-a", position: { x: 480, y: 440 } }
      ],
      { x: 512, y: 704 }
    );

    expect(ordered).toEqual([
      { battalionId: "battalion-a", destination: { x: 544, y: 704 } },
      { battalionId: "battalion-b", destination: { x: 480, y: 704 } }
    ]);
    expect(reversed).toEqual(ordered);
  });
});
