import { describe, expect, it } from "vitest";
import { getOrderIndicators } from "../../src/rendering/orderPresentation";
import { createInitialWorld } from "../../src/simulation/state/WorldState";

describe("order presentation", () => {
  it("shows selected Crown movement and advance routes from authoritative orders", () => {
    const world = createInitialWorld(501);
    const crownBattalion = {
      ...world.battalions["battalion-rival-1"],
      id: "battalion-crown-route",
      ownerEmpireId: "empire-player" as const,
      settlementId: "settlement-capital",
      position: { x: 430, y: 330 },
      destination: { x: 620, y: 330 },
      attackMoveDestination: { x: 700, y: 330 }
    };
    const state = { ...world, battalions: { ...world.battalions, [crownBattalion.id]: crownBattalion } };

    expect(getOrderIndicators(state, [crownBattalion.id])).toEqual([
      {
        actorId: crownBattalion.id,
        kind: "advance",
        origin: crownBattalion.position,
        destination: crownBattalion.attackMoveDestination
      }
    ]);
  });

  it("shows an ordered attack only while its rival target is visible", () => {
    const world = createInitialWorld(502);
    const crownBattalion = {
      ...world.battalions["battalion-rival-1"],
      id: "battalion-crown-attack",
      ownerEmpireId: "empire-player" as const,
      settlementId: "settlement-capital",
      position: { x: 750, y: 390 },
      targetId: "battalion-rival-1"
    };
    const state = { ...world, battalions: { ...world.battalions, [crownBattalion.id]: crownBattalion } };

    expect(getOrderIndicators(state, [crownBattalion.id])).toMatchObject([
      { actorId: crownBattalion.id, kind: "attack", destination: world.battalions["battalion-rival-1"].position }
    ]);

    const fogged = {
      ...state,
      battalions: { ...state.battalions, [crownBattalion.id]: { ...crownBattalion, position: { x: 400, y: 390 } } }
    };
    expect(getOrderIndicators(fogged, [crownBattalion.id])).toEqual([]);
  });

  it("projects every queued movement leg for a selected Crown battalion", () => {
    const world = createInitialWorld(503);
    const crownBattalion = {
      ...world.battalions["battalion-rival-1"],
      id: "battalion-crown-waypoints",
      ownerEmpireId: "empire-player" as const,
      settlementId: "settlement-capital",
      position: { x: 420, y: 320 },
      destination: { x: 520, y: 320 },
      waypoints: [{ x: 520, y: 420 }, { x: 620, y: 420 }]
    };
    const state = { ...world, battalions: { ...world.battalions, [crownBattalion.id]: crownBattalion } };

    expect(getOrderIndicators(state, [crownBattalion.id])).toEqual([
      { actorId: crownBattalion.id, kind: "move", origin: { x: 420, y: 320 }, destination: { x: 520, y: 320 } },
      { actorId: crownBattalion.id, kind: "move", origin: { x: 520, y: 320 }, destination: { x: 520, y: 420 } },
      { actorId: crownBattalion.id, kind: "move", origin: { x: 520, y: 420 }, destination: { x: 620, y: 420 } }
    ]);
  });

  it("marks the selected Crown force's held ground without inventing a movement route", () => {
    const world = createInitialWorld(504);
    const crownBattalion = {
      ...world.battalions["battalion-rival-1"],
      id: "battalion-crown-hold",
      ownerEmpireId: "empire-player" as const,
      settlementId: "settlement-capital",
      position: { x: 510, y: 350 },
      stance: "hold" as const,
      destination: undefined,
      targetId: undefined
    };
    const state = { ...world, battalions: { ...world.battalions, [crownBattalion.id]: crownBattalion } };

    expect(getOrderIndicators(state, [crownBattalion.id])).toEqual([
      {
        actorId: crownBattalion.id,
        kind: "hold",
        origin: crownBattalion.position,
        destination: crownBattalion.position
      }
    ]);
  });
});
