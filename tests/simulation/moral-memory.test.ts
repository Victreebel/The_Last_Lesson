import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, type BuildingState } from "../../src/simulation/state/WorldState";

describe("moral memory", () => {
  it("records captive release and applies unresolved captivity as rebellion pressure", () => {
    const initial = createInitialWorld(191919);
    const releaseSimulation = new Simulation({
      ...initial,
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          population: { ...initial.settlements["settlement-capital"].population, captives: 4 }
        }
      }
    });
    releaseSimulation.enqueueCommand({
      id: "release-captives",
      issuedBy: "player-1",
      tick: 1,
      type: "release-captives",
      payload: { settlementId: "settlement-capital", count: 4 }
    });

    const releaseResult = releaseSimulation.tick();
    expect(releaseSimulation.getState().empires["empire-player"].moralMemory?.captivesReleased).toBe(4);
    expect(releaseResult.events.some((event) => event.type === "moral-memory-changed")).toBe(true);

    const burdenSimulation = new Simulation({
      ...initial,
      buildings: {
        ...initial.buildings,
        "burden-hovel": {
          id: "burden-hovel",
          ownerEmpireId: "empire-player",
          settlementId: "settlement-capital",
          kind: "hovel",
          position: { x: 350, y: 330 },
          defense: 50,
          complete: true,
          remainingBuildTicks: 0
        } satisfies BuildingState
      },
      empires: {
        ...initial.empires,
        "empire-player": {
          ...initial.empires["empire-player"],
          moralMemory: { captivesTaken: 12, captivesIntegrated: 0, captivesReleased: 0 }
        }
      },
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          internalFaith: 0,
          buildingIds: [...initial.settlements["settlement-capital"].buildingIds, "burden-hovel"],
          population: {
            ...initial.settlements["settlement-capital"].population,
            captives: 12,
            loyalty: 0
          }
        }
      }
    });

    burdenSimulation.tick();
    expect(burdenSimulation.getState().settlements["settlement-capital"].pressures.rebellion).toBe(36);
  });
});
