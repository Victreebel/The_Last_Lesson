import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("settlement defection", () => {
  it("transfers an unguarded, religiously overwhelmed settlement without killing its governor", () => {
    const initial = createInitialWorld(9500);
    const hovelId = "building-defection-hovel";
    const roadIds = ["building-defection-road-1", "building-defection-road-2", "building-defection-road-3"];
    const simulation = new Simulation({
      ...initial,
      empires: {
        ...initial.empires,
        "empire-rival": { ...initial.empires["empire-rival"], settlementIds: ["settlement-rival"] }
      },
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          buildingIds: [...initial.settlements["settlement-capital"].buildingIds, hovelId],
          population: {
            ...initial.settlements["settlement-capital"].population,
            citizens: 1,
            captives: 12,
            loyalty: 0,
            devotion: 0
          },
          internalFaith: 0
        },
        "settlement-rival": {
          ...initial.settlements["settlement-rival"],
          buildingIds: [...initial.settlements["settlement-rival"].buildingIds, ...roadIds],
          battalionIds: []
        }
      },
      buildings: {
        ...initial.buildings,
        "building-rival-castle": {
          ...initial.buildings["building-rival-castle"],
          position: { x: 650, y: 300 }
        },
        [hovelId]: {
          id: hovelId,
          ownerEmpireId: "empire-player",
          settlementId: "settlement-capital",
          kind: "hovel",
          position: { x: 350, y: 330 },
          defense: 80,
          complete: true,
          remainingBuildTicks: 0
        },
        "building-defection-road-1": {
          id: "building-defection-road-1",
          ownerEmpireId: "empire-rival",
          settlementId: "settlement-rival",
          kind: "road",
          position: { x: 575, y: 300 },
          defense: 40,
          complete: true,
          remainingBuildTicks: 0
        },
        "building-defection-road-2": {
          id: "building-defection-road-2",
          ownerEmpireId: "empire-rival",
          settlementId: "settlement-rival",
          kind: "road",
          position: { x: 500, y: 300 },
          defense: 40,
          complete: true,
          remainingBuildTicks: 0
        },
        "building-defection-road-3": {
          id: "building-defection-road-3",
          ownerEmpireId: "empire-rival",
          settlementId: "settlement-rival",
          kind: "road",
          position: { x: 450, y: 300 },
          defense: 40,
          complete: true,
          remainingBuildTicks: 0
        }
      },
      battalions: {}
    });

    const result = simulation.tick();
    const state = simulation.getState();
    const capital = state.settlements["settlement-capital"];
    const defection = result.events.find((event) => event.type === "settlement-defected");

    expect(capital.ownerEmpireId).toBe("empire-rival");
    expect(state.heirs["heir-prime"].alive).toBe(true);
    expect(state.heirs[capital.heirId].ownerEmpireId).toBe("empire-rival");
    expect(state.empires["empire-player"].settlementIds).toEqual([]);
    expect(state.victory.winnerEmpireId).toBe("empire-rival");
    expect(defection?.payload.displacedHeirId).toBe("heir-prime");
    expect(defection?.payload.reason).toBe("rebellion");
    expect(result.events.some((event) => event.type === "victory-achieved")).toBe(true);
  });
});
