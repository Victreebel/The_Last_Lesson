import { describe, expect, it } from "vitest";
import { Simulation } from "../../src/simulation/Simulation";
import { createInitialWorld, type BattalionState, type CaravanState } from "../../src/simulation/state/WorldState";

const playerBattalion = (initial: ReturnType<typeof createInitialWorld>, position: { x: number; y: number }): BattalionState => ({
  ...initial.battalions["battalion-rival-1"],
  id: "battalion-crown-observer",
  ownerEmpireId: "empire-player",
  settlementId: "settlement-capital",
  position
});

const playerCaravan = (position: { x: number; y: number }): CaravanState => ({
  id: "caravan-crown-observer",
  ownerEmpireId: "empire-player",
  settlementId: "settlement-capital",
  kind: "caravan",
  position,
  cargoFood: 8,
  capacity: 12,
  passengerBattalionIds: [],
  defense: 24,
  maxDefense: 24,
  speed: 38
});

describe("rival counter-doctrine", () => {
  it("forms a visible counter-doctrine using the selected rival learning pace", () => {
    const initial = createInitialWorld(425, "rival");
    const battalion = playerBattalion(initial, { x: 920, y: 390 });
    const simulation = new Simulation({
      ...initial,
      battalions: { ...initial.battalions, [battalion.id]: battalion },
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          battalionIds: [battalion.id]
        }
      }
    });

    simulation.enqueueCommand({
      id: "hold-visible-line",
      issuedBy: "player-1",
      tick: 1,
      type: "hold-battalion",
      payload: { battalionId: battalion.id }
    });

    const result = simulation.tick();
    const doctrine = simulation.getState().doctrines["doctrine-heir-rival-counter-probe-fixed-crown-lines"];

    expect(doctrine).toMatchObject({
      ownerId: "heir-rival",
      preferredAction: "Lead an expedition",
      confidence: 22
    });
    expect(result.events.some((event) => event.type === "rival-doctrine-observed")).toBe(true);
  });

  it("does not let rival heirs learn from Crown actions beyond their shared vision", () => {
    const initial = createInitialWorld(426, "architect");
    const battalion = playerBattalion(initial, { x: 440, y: 300 });
    const simulation = new Simulation({
      ...initial,
      battalions: { ...initial.battalions, [battalion.id]: battalion },
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          battalionIds: [battalion.id]
        }
      }
    });

    simulation.enqueueCommand({
      id: "hold-hidden-line",
      issuedBy: "player-1",
      tick: 1,
      type: "hold-battalion",
      payload: { battalionId: battalion.id }
    });

    const result = simulation.tick();

    expect(simulation.getState().doctrines["doctrine-heir-rival-counter-probe-fixed-crown-lines"]).toBeUndefined();
    expect(result.events.some((event) => event.type === "rival-doctrine-observed")).toBe(false);
  });

  it("turns an observed Crown caravan into a logistics-interdiction target", () => {
    const initial = createInitialWorld(427, "architect");
    const caravan = playerCaravan({ x: 900, y: 390 });
    const simulation = new Simulation({
      ...initial,
      caravans: { ...initial.caravans, [caravan.id]: caravan },
      settlements: {
        ...initial.settlements,
        "settlement-capital": {
          ...initial.settlements["settlement-capital"],
          caravanIds: [caravan.id]
        }
      }
    });

    simulation.enqueueCommand({
      id: "route-visible-caravan",
      issuedBy: "player-1",
      tick: 1,
      type: "move-caravan",
      payload: { caravanId: caravan.id, destination: { x: 920, y: 390 } }
    });
    simulation.runTicks(12);

    const counterDoctrine = simulation.getState().doctrines["doctrine-heir-rival-counter-interdict-crown-logistics"];
    const hostileTargetingCaravan = Object.values(simulation.getState().battalions).some(
      (battalion) => battalion.ownerEmpireId === "empire-rival" && battalion.targetId === caravan.id
    );

    expect(counterDoctrine).toMatchObject({ preferredAction: "Interdict Crown logistics", confidence: 28 });
    expect(hostileTargetingCaravan).toBe(true);
  });
});
