import { describe, expect, it } from "vitest";
import { getReconnaissanceContact } from "../../src/rendering/reconnaissancePresentation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("reconnaissance presentation", () => {
  it("briefs a rival contact only after it is visible to the Crown", () => {
    const initial = createInitialWorld(9301);
    expect(getReconnaissanceContact(initial, "battalion-rival-1")).toBeUndefined();

    const rivalBattalion = initial.battalions["battalion-rival-1"];
    const observed = {
      ...initial,
      battalions: {
        ...initial.battalions,
        "battalion-rival-1": {
          ...rivalBattalion,
          position: { x: 450, y: 300 }
        }
      }
    };

    expect(getReconnaissanceContact(observed, "battalion-rival-1")).toEqual({
      entityId: "battalion-rival-1",
      heading: "RIVAL MILITIA SPEARS",
      detail: "8 TROOPS // H100 M70 S100",
      ground: "GROUND: OPEN BUILD // 100% MOVE"
    });
  });

  it("projects visible rival buildings and convoys without exposing Crown assets", () => {
    const initial = createInitialWorld(9302);
    const observed = {
      ...initial,
      buildings: {
        ...initial.buildings,
        "building-rival-castle": {
          ...initial.buildings["building-rival-castle"],
          position: { x: 450, y: 300 }
        }
      },
      caravans: {
        "caravan-rival-scout": {
          id: "caravan-rival-scout",
          ownerEmpireId: "empire-rival" as const,
          settlementId: "settlement-rival" as const,
          kind: "caravan" as const,
          position: { x: 460, y: 300 },
          cargoFood: 12,
          capacity: 12,
          passengerBattalionIds: ["battalion-rival-1"],
          defense: 36,
          maxDefense: 36,
          speed: 54
        }
      }
    };

    expect(getReconnaissanceContact(observed, "building-rival-castle")?.detail).toBe("DEFENSE 500");
    expect(getReconnaissanceContact(observed, "caravan-rival-scout")).toMatchObject({
      heading: "RIVAL SUPPLY WAGON",
      detail: "DEFENSE 36 // FOOD 12 // 8 EMBARKED"
    });
    expect(getReconnaissanceContact(observed, "building-castle")).toBeUndefined();
  });
});
