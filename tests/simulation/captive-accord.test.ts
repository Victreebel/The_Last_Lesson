import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, type BuildingState } from "../../src/simulation/state/WorldState";

const withCitizenHousing = () => {
  const initial = createInitialWorld(440044);
  const capitalVilla: BuildingState = {
    id: "building-capital-villa-accord",
    ownerEmpireId: "empire-player",
    settlementId: "settlement-capital",
    kind: "villa",
    position: { x: 340, y: 300 },
    defense: 80,
    complete: true,
    remainingBuildTicks: 0
  };
  const rivalVilla: BuildingState = {
    id: "building-rival-villa-accord",
    ownerEmpireId: "empire-rival",
    settlementId: "settlement-rival",
    kind: "villa",
    position: { x: 1090, y: 340 },
    defense: 80,
    complete: true,
    remainingBuildTicks: 0
  };
  const capitalHovel: BuildingState = {
    id: "building-capital-hovel-accord",
    ownerEmpireId: "empire-player",
    settlementId: "settlement-capital",
    kind: "hovel",
    position: { x: 390, y: 300 },
    defense: 60,
    complete: true,
    remainingBuildTicks: 0
  };
  const rivalHovel: BuildingState = {
    id: "building-rival-hovel-accord",
    ownerEmpireId: "empire-rival",
    settlementId: "settlement-rival",
    kind: "hovel",
    position: { x: 1140, y: 340 },
    defense: 60,
    complete: true,
    remainingBuildTicks: 0
  };

  return {
    ...initial,
    buildings: {
      ...initial.buildings,
      [capitalVilla.id]: capitalVilla,
      [rivalVilla.id]: rivalVilla,
      [capitalHovel.id]: capitalHovel,
      [rivalHovel.id]: rivalHovel
    },
    settlements: {
      ...initial.settlements,
      "settlement-capital": {
        ...initial.settlements["settlement-capital"],
        buildingIds: [...initial.settlements["settlement-capital"].buildingIds, capitalVilla.id, capitalHovel.id],
        population: { ...initial.settlements["settlement-capital"].population, captives: 4 }
      },
      "settlement-rival": {
        ...initial.settlements["settlement-rival"],
        buildingIds: [...initial.settlements["settlement-rival"].buildingIds, rivalVilla.id, rivalHovel.id],
        population: { ...initial.settlements["settlement-rival"].population, captives: 4 }
      }
    }
  };
};

describe("captive accords", () => {
  it("returns equal captives to both realms without creating an heir doctrine", () => {
    const initial = withCitizenHousing();
    const simulation = new Simulation(initial);
    simulation.enqueueCommand({
      id: "captive-accord",
      issuedBy: "player-1",
      tick: 1,
      type: "exchange-captives",
      payload: { settlementId: "settlement-capital", rivalSettlementId: "settlement-rival", count: 4 }
    });

    const result = simulation.tick();
    const state = simulation.getState();

    expect(state.settlements["settlement-capital"].population).toMatchObject({ citizens: 28, captives: 0 });
    expect(state.settlements["settlement-rival"].population).toMatchObject({ citizens: 28, captives: 0 });
    expect(state.empires["empire-player"].moralMemory?.captivesReleased).toBe(4);
    expect(state.empires["empire-rival"].moralMemory?.captivesReleased).toBe(4);
    expect(state.empires["empire-player"].moralMemory?.captivesExchanged).toBe(4);
    expect(state.empires["empire-rival"].moralMemory?.captivesExchanged).toBe(4);
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "captives-exchanged",
        payload: expect.objectContaining({
          settlementId: "settlement-capital",
          rivalSettlementId: "settlement-rival",
          count: 4
        })
      })
    );
    expect(result.events.some((event) => event.type === "doctrine-observed")).toBe(false);
  });

  it("rejects a unilateral exchange without changing captive populations", () => {
    const initial = withCitizenHousing();
    const simulation = new Simulation({
      ...initial,
      settlements: {
        ...initial.settlements,
        "settlement-rival": {
          ...initial.settlements["settlement-rival"],
          population: { ...initial.settlements["settlement-rival"].population, captives: 0 }
        }
      }
    });
    simulation.enqueueCommand({
      id: "unilateral-accord",
      issuedBy: "player-1",
      tick: 1,
      type: "exchange-captives",
      payload: { settlementId: "settlement-capital", rivalSettlementId: "settlement-rival", count: 4 }
    });

    const result = simulation.tick();

    expect(simulation.getState().settlements["settlement-capital"].population.captives).toBe(4);
    expect(result.events).toContainEqual(
      expect.objectContaining({ type: "command-rejected", payload: expect.objectContaining({ reason: "accord-unavailable" }) })
    );
  });
});
