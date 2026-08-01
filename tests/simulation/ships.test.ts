import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("ships", () => {
  it("launches a water-only warship from a Town Square", () => {
    const initial = createInitialWorld(9393);
    const simulation = new Simulation({
      ...initial,
      empires: {
        ...initial.empires,
        "empire-player": {
          ...initial.empires["empire-player"],
          resources: { ...initial.empires["empire-player"].resources, wood: 40, iron: 4 }
        }
      },
      buildings: {
        ...initial.buildings,
        "building-town-square-ship": {
          id: "building-town-square-ship",
          ownerEmpireId: "empire-player",
          settlementId: "settlement-capital",
          kind: "town-square",
          position: { x: 500, y: 340 },
          defense: 150,
          complete: true,
          remainingBuildTicks: 0
        }
      },
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          buildingIds: [...initial.settlements["settlement-capital"].buildingIds, "building-town-square-ship"],
          localFood: 60
        }
      }
    });
    simulation.enqueueCommand({ id: "launch-ship", issuedBy: "player-1", tick: 1, type: "create-ship", payload: { settlementId: "settlement-capital" } });
    const launch = simulation.tick();
    const ship = Object.values(simulation.getState().caravans).find((vehicle) => vehicle.kind === "ship");

    expect(ship?.kind).toBe("ship");
    expect(launch.events.some((event) => event.type === "ship-created")).toBe(true);

    simulation.enqueueCommand({ id: "sail-river", issuedBy: "player-1", tick: 2, type: "move-caravan", payload: { caravanId: ship!.id, destination: { x: 800, y: 530 } } });
    simulation.tick();
    expect(simulation.getState().caravans[ship!.id].destination).toEqual({ x: 800, y: 530 });

    simulation.enqueueCommand({ id: "beach-ship", issuedBy: "player-1", tick: 3, type: "move-caravan", payload: { caravanId: ship!.id, destination: { x: 400, y: 300 } } });
    const rejected = simulation.tick();
    expect(rejected.events.some((event) => event.type === "command-rejected")).toBe(true);
  });

  it("lets warships fire on hostile vessels while embarked troops remain silent", () => {
    const initial = createInitialWorld(9494);
    const playerShip = {
      id: "ship-player-test",
      ownerEmpireId: "empire-player" as const,
      settlementId: "settlement-capital",
      kind: "ship" as const,
      position: { x: 650, y: 530 },
      cargoFood: 0,
      capacity: 52,
      passengerBattalionIds: ["battalion-ship-passenger"],
      defense: 110,
      maxDefense: 110,
      speed: 56
    };
    const rivalShip = {
      id: "ship-rival-test",
      ownerEmpireId: "empire-rival" as const,
      settlementId: "settlement-rival",
      kind: "ship" as const,
      position: { x: 700, y: 530 },
      cargoFood: 0,
      capacity: 52,
      passengerBattalionIds: [],
      defense: 110,
      maxDefense: 110,
      speed: 56
    };
    const passenger = {
      ...initial.battalions["battalion-rival-1"],
      id: "battalion-ship-passenger",
      ownerEmpireId: "empire-player" as const,
      settlementId: "settlement-capital",
      position: playerShip.position,
      embarkedInCaravanId: playerShip.id,
      targetId: rivalShip.id,
      attack: 200,
      range: 120
    };
    const simulation = new Simulation({
      ...initial,
      caravans: { [playerShip.id]: playerShip, [rivalShip.id]: rivalShip },
      battalions: { ...initial.battalions, [passenger.id]: passenger }
    });
    simulation.enqueueCommand({
      id: "ship-fire",
      issuedBy: "player-1",
      tick: 1,
      type: "attack-with-ship",
      payload: { shipId: playerShip.id, targetId: rivalShip.id }
    });

    const result = simulation.tick();

    expect(simulation.getState().caravans[rivalShip.id].defense).toBe(88);
    expect(result.events.some((event) => event.type === "ship-fired")).toBe(true);
  });
});
