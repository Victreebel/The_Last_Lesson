import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, SCENARIO_PROFILES, terrainAtPosition } from "../../src/simulation/state/WorldState";

describe("campaign scenarios", () => {
  it("publishes each theatre's actual terrain lesson before a reign begins", () => {
    expect(SCENARIO_PROFILES).toMatchObject({
      crownfall: { terrainTag: "FERTILE HEARTLAND", terrainIntel: "FERTILE HEARTLAND // EXPANSION" },
      rivergate: { terrainTag: "NAVIGABLE RIVER", terrainIntel: "NAVIGABLE RIVER // SUPPLY & WARSHIPS" },
      "ashen-oath": { terrainTag: "BLIGHTED MARSH", terrainIntel: "BLIGHTED MARSH // PLAGUE & CAPTIVES" },
      stonewall: { terrainTag: "HILL-FORT RIDGE", terrainIntel: "HILL-FORT RIDGE // GATE DEFENSE" }
    });
  });

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
    expect(terrainAtPosition(world, { x: 700, y: 520 })).toBe("water");
    expect(world.terrainZones.some((zone) => zone.id === "rivergate-waterway")).toBe(true);
  });

  it("starts Ashen Oath with a recoverable plague, captives, and a rival religious road corridor", () => {
    const simulation = new Simulation(createInitialWorld(712, "rival", "ashen-oath"));
    const result = simulation.tick();
    const capital = simulation.getState().settlements["settlement-capital"];
    const pressureEvent = result.events.find(
      (event) => event.type === "religious-pressure-changed" && event.payload.settlementId === "settlement-capital"
    );

    expect(capital.population.captives).toBe(12);
    expect(capital.population.health).toBeLessThan(44);
    expect(capital.plagueTicks).toBe(2);
    expect(capital.buildingIds).toContain("building-ashen-hovel");
    expect(capital.externalReligiousPressure).toBeGreaterThan(0);
    expect(pressureEvent?.payload.roadPressure).toBeGreaterThan(0);
    expect(terrainAtPosition(simulation.getState(), { x: 500, y: 520 })).toBe("marsh");
    expect(simulation.getState().terrainZones.some((zone) => zone.id === "ashen-marsh")).toBe(true);
  });

  it("lets Ashen Oath's opening Faith cure the civic crisis immediately", () => {
    const simulation = new Simulation(createInitialWorld(715, "rival", "ashen-oath"));
    simulation.enqueueCommand({
      id: "ashen-mend",
      issuedBy: "player-1",
      tick: 1,
      type: "cast-miracle",
      payload: {
        empireId: "empire-player",
        kind: "mend-settlement",
        settlementId: "settlement-capital"
      }
    });

    const result = simulation.tick();
    const capital = simulation.getState().settlements["settlement-capital"];

    expect(capital.plagueTicks).toBe(0);
    expect(capital.population.health).toBeGreaterThan(70);
    expect(result.events.some((event) => event.type === "plague-spread")).toBe(false);
    expect(result.events.some((event) => event.type === "miracle-cast" && event.payload.miracle === "mend-settlement")).toBe(true);
  });

  it("starts Stonewall with a defensible gate line and civic reserves", () => {
    const world = createInitialWorld(713, "rival", "stonewall");
    const capital = world.settlements["settlement-capital"];

    expect(capital.buildingIds).toContain("building-stonewall-gate");
    expect(world.buildings["building-stonewall-wall-1"].complete).toBe(true);
    expect(world.empires["empire-player"].resources.iron).toBe(10);
    expect(capital.population).toMatchObject({ farmers: 6, builders: 2 });
    expect(terrainAtPosition(world, { x: 420, y: 300 })).toBe("hills");
    expect(world.terrainZones[0]?.id).toBe("stonewall-ridge");
  });

  it("keeps a Stonewall militia alive through the opening defense window", () => {
    const simulation = new Simulation(createInitialWorld(714, "rival", "stonewall"));
    simulation.enqueueCommand({
      id: "stonewall-militia",
      issuedBy: "player-1",
      tick: 1,
      type: "create-battalion",
      payload: { settlementId: "settlement-capital", size: 10, specialization: "militia" }
    });

    simulation.runTicks(9);

    const militia = simulation.getState().battalions["battalion-1-1"];
    expect(militia).toMatchObject({
      ownerEmpireId: "empire-player",
      specialization: "militia",
      size: 10
    });
    const gate = simulation.getState().buildings["building-stonewall-gate"];
    expect(Math.hypot(militia.position.x - gate.position.x, militia.position.y - gate.position.y)).toBeGreaterThan(80);
    expect(simulation.getState().settlements["settlement-capital"].population.militarizedCitizens).toBe(10);
  });
});
