import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("campaign scenarios", () => {
  it("keeps Crownfall as the balanced default opening", () => {
    const world = createInitialWorld(710);

    expect(world.scenarioId).toBe("crownfall");
    expect(world.settlements["settlement-capital"].buildingIds).toEqual(["building-castle"]);
  });

  it("starts Rivergate with a civic port advantage", () => {
    const world = createInitialWorld(711, "rival", "rivergate");
    const capital = world.settlements["settlement-capital"];

    expect(world.scenarioId).toBe("rivergate");
    expect(world.empires["empire-player"].resources.faith).toBe(8);
    expect(capital.buildingIds).toContain("building-rivergate-town-square");
    expect(world.buildings["building-rivergate-town-square"].complete).toBe(true);
  });

  it("starts Ashen Oath with captives and a rival religious road corridor", () => {
    const simulation = new Simulation(createInitialWorld(712, "rival", "ashen-oath"));
    const result = simulation.tick();
    const capital = simulation.getState().settlements["settlement-capital"];
    const pressureEvent = result.events.find(
      (event) => event.type === "religious-pressure-changed" && event.payload.settlementId === "settlement-capital"
    );

    expect(capital.population.captives).toBe(12);
    expect(capital.buildingIds).toContain("building-ashen-hovel");
    expect(capital.externalReligiousPressure).toBeGreaterThan(0);
    expect(pressureEvent?.payload.roadPressure).toBeGreaterThan(0);
  });

  it("starts Stonewall with a defensible gate line and civic reserves", () => {
    const world = createInitialWorld(713, "rival", "stonewall");
    const capital = world.settlements["settlement-capital"];

    expect(capital.buildingIds).toContain("building-stonewall-gate");
    expect(world.buildings["building-stonewall-wall-1"].complete).toBe(true);
    expect(world.empires["empire-player"].resources.iron).toBe(10);
  });
});
