import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("heir governance", () => {
  it("turns settlement pressure into an explainable autonomous decision", () => {
    const initial = createInitialWorld(112358);
    const simulation = new Simulation({
      ...initial,
      settlements: {
        ...initial.settlements,
        "settlement-rival": {
          ...initial.settlements["settlement-rival"],
          localFood: 50
        }
      }
    });

    const result = simulation.tick();
    const heir = simulation.getState().heirs["heir-rival"];
    const settlement = simulation.getState().settlements["settlement-rival"];

    expect(heir.lastDecision?.action).toBe("Prioritize farm labor");
    expect(heir.lastDecision?.utility).toBeGreaterThanOrEqual(30);
    expect(heir.lastDoctrineId).toBeDefined();
    expect(simulation.getState().doctrines[heir.lastDoctrineId!].confidence).toBe(20);
    expect(settlement.population.farmers).toBe(8);
    expect(result.events.some((event) => event.type === "heir-decision")).toBe(true);
  });

  it("integrates captives when unrest makes assimilation the highest-value settlement action", () => {
    const initial = createInitialWorld(112359);
    const simulation = new Simulation({
      ...initial,
      buildings: {
        ...initial.buildings,
        "building-rival-town-square": {
          id: "building-rival-town-square",
          ownerEmpireId: "empire-rival",
          settlementId: "settlement-rival",
          kind: "town-square",
          position: { x: 1030, y: 350 },
          defense: 150,
          complete: true,
          remainingBuildTicks: 0
        },
        "building-rival-villa": {
          id: "building-rival-villa",
          ownerEmpireId: "empire-rival",
          settlementId: "settlement-rival",
          kind: "villa",
          position: { x: 1100, y: 350 },
          defense: 75,
          complete: true,
          remainingBuildTicks: 0
        },
        "building-rival-hovel": {
          id: "building-rival-hovel",
          ownerEmpireId: "empire-rival",
          settlementId: "settlement-rival",
          kind: "hovel",
          position: { x: 1160, y: 350 },
          defense: 50,
          complete: true,
          remainingBuildTicks: 0
        }
      },
      settlements: {
        ...initial.settlements,
        "settlement-rival": {
          ...initial.settlements["settlement-rival"],
          buildingIds: [
            ...initial.settlements["settlement-rival"].buildingIds,
            "building-rival-town-square",
            "building-rival-villa",
            "building-rival-hovel"
          ],
          localFood: 20,
          population: {
            ...initial.settlements["settlement-rival"].population,
            captives: 8
          },
          pressures: {
            ...initial.settlements["settlement-rival"].pressures,
            rebellion: 60
          }
        }
      }
    });

    const result = simulation.tick();
    const heir = simulation.getState().heirs["heir-rival"];
    const settlement = simulation.getState().settlements["settlement-rival"];

    expect(heir.lastDecision?.action).toBe("Assimilate captives");
    expect(settlement.population.captives).toBe(4);
    expect(settlement.population.citizens).toBe(28);
    expect(result.events.some((event) => event.type === "captives-assimilated")).toBe(true);
  });

  it("records a governor concern before scarcity becomes starvation", () => {
    const initial = createInitialWorld(112360);
    const simulation = new Simulation({
      ...initial,
      settlements: {
        ...initial.settlements,
        "settlement-rival": {
          ...initial.settlements["settlement-rival"],
          localFood: 10
        }
      }
    });

    const result = simulation.tick();
    const heir = simulation.getState().heirs["heir-rival"];

    expect(heir.concern?.category).toBe("starvation");
    expect(result.events.some((event) => event.type === "heir-concern")).toBe(true);
  });

  it("preserves a food workforce before recruiting a second governed battalion", () => {
    const simulation = new Simulation(createInitialWorld(112361, "rival"));

    simulation.runTicks(12);

    const settlement = simulation.getState().settlements["settlement-rival"];
    expect(settlement.battalionIds).toHaveLength(2);
    expect(settlement.population.militarizedCitizens).toBe(16);
    expect(settlement.population.farmers).toBe(6);
    expect(settlement.localFood).toBeGreaterThan(60);
  });

  it("records a Crown governor's decision as a provisional lesson until the player gives feedback", () => {
    const initial = createInitialWorld(112362);
    const simulation = new Simulation({
      ...initial,
      heirs: {
        ...initial.heirs,
        "heir-prime": { ...initial.heirs["heir-prime"], mode: "governance" }
      },
      settlements: {
        ...initial.settlements,
        "settlement-capital": { ...initial.settlements["settlement-capital"], localFood: 50 }
      }
    });

    simulation.tick();
    const heir = simulation.getState().heirs["heir-prime"];
    const doctrineId = heir.lastDoctrineId!;
    expect(simulation.getState().doctrines[doctrineId].confidence).toBe(0);

    simulation.enqueueCommand({
      id: "reinforce-governor-lesson",
      issuedBy: "player-1",
      tick: 2,
      type: "reward-heir",
      payload: { heirId: heir.id, doctrineId }
    });
    simulation.tick();
    expect(simulation.getState().doctrines[doctrineId].confidence).toBe(16);
  });
});
