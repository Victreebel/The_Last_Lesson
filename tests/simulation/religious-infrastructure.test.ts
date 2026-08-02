import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, type BuildingState, type CaravanState } from "../../src/simulation/state/WorldState";

describe("religious infrastructure", () => {
  it("lets an enemy road corridor, caravan, and outpost increase external religious pressure", () => {
    const initial = createInitialWorld(5150);
    const rivalCastle = initial.buildings["building-rival-castle"];
    const capitalCastle = initial.buildings["building-castle"];
    const roadPositions = [
      { x: 520, y: 314 },
      { x: 616, y: 326 },
      { x: 712, y: 338 },
      { x: 808, y: 350 },
      { x: 904, y: 362 },
      { x: 1000, y: 374 }
    ];
    const roads = Object.fromEntries(
      roadPositions.map((position, index) => {
        const id = `rival-road-${index}`;
        const road: BuildingState = {
          id,
          ownerEmpireId: "empire-rival",
          settlementId: "settlement-rival",
          kind: "road",
          position,
          defense: 40,
          complete: true,
          remainingBuildTicks: 0
        };
        return [id, road];
      })
    );
    const caravan: CaravanState = {
      id: "rival-doctrine-caravan",
      ownerEmpireId: "empire-rival",
      settlementId: "settlement-rival",
      kind: "caravan",
      position: { x: capitalCastle.position.x + 80, y: capitalCastle.position.y },
      cargoFood: 0,
      capacity: 24,
      passengerBattalionIds: [],
      defense: 100,
      maxDefense: 100,
      speed: 32
    };
    const outpost: BuildingState = {
      id: "rival-doctrine-outpost",
      ownerEmpireId: "empire-rival",
      settlementId: "settlement-rival",
      kind: "outpost",
      position: { x: capitalCastle.position.x + 90, y: capitalCastle.position.y },
      defense: 150,
      complete: true,
      remainingBuildTicks: 0
    };
    const infrastructureWorld = {
      ...initial,
      buildings: { ...initial.buildings, ...roads, [outpost.id]: outpost },
      caravans: { ...initial.caravans, [caravan.id]: caravan },
      settlements: {
        ...initial.settlements,
        "settlement-rival": {
          ...initial.settlements["settlement-rival"],
          buildingIds: [...initial.settlements["settlement-rival"].buildingIds, ...Object.keys(roads), outpost.id],
          caravanIds: [caravan.id]
        }
      }
    };

    const baseline = new Simulation(initial);
    const withInfrastructure = new Simulation(infrastructureWorld);
    baseline.tick();
    const result = withInfrastructure.tick();

    const baselinePressure = baseline.getState().settlements["settlement-capital"].externalReligiousPressure;
    const infrastructurePressure = withInfrastructure.getState().settlements["settlement-capital"].externalReligiousPressure;
    const pressureEvent = result.events.find(
      (event) => event.type === "religious-pressure-changed" && event.payload.settlementId === "settlement-capital"
    );

    expect(infrastructurePressure).toBeGreaterThan(baselinePressure);
    expect(pressureEvent?.payload.roadPressure).toBeGreaterThan(0);
    expect(pressureEvent?.payload.caravanPressure).toBeGreaterThan(0);
    expect(pressureEvent?.payload.outpostPressure).toBeGreaterThan(0);
    expect(rivalCastle.ownerEmpireId).toBe("empire-rival");
  });
});
