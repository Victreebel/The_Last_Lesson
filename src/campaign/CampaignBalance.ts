import type { GameCommand } from "../simulation/commands/GameCommand";
import type { GameEvent, EventType } from "../simulation/events/GameEvent";
import { Simulation } from "../simulation/Simulation";
import { createInitialWorld, type RivalDifficulty, type ScenarioId } from "../simulation/state/WorldState";
import { getImperialMandateProgress } from "./ImperialMandate";

export const CAMPAIGN_BALANCE_SCENARIOS: readonly ScenarioId[] = [
  "crownfall",
  "rivergate",
  "ashen-oath",
  "stonewall"
];

export const CAMPAIGN_BALANCE_TICKS = 180;

export interface CampaignBalanceReport {
  readonly scenarioId: ScenarioId;
  readonly seed: number;
  readonly ticks: number;
  readonly winnerEmpireId?: string;
  readonly playerCastleDefense: number;
  readonly playerCitizens: number;
  readonly playerCaptives: number;
  readonly playerFood: number;
  readonly playerHealth: number;
  readonly playerFaith: number;
  readonly playerBattalionCount: number;
  readonly rivalCastleDefense: number;
  readonly rivalCitizens: number;
  readonly rivalFood: number;
  readonly rivalBattalionCount: number;
  readonly completedFarm: boolean;
  readonly firstRivalAttackTick?: number;
  readonly rejectedCommands: number;
  readonly starvationEvents: number;
  readonly plagueEvents: number;
  readonly garrisonEvents: number;
  readonly caravanEvents: number;
  readonly activeMandate: string;
  readonly healthy: boolean;
}

const CAPITAL_ID = "settlement-capital";
const OPENING_FARM_POSITION = { x: 180, y: 180 };

function openingCommands(scenarioId: ScenarioId): readonly GameCommand[] {
  const commands: GameCommand[] = [
    {
      id: "balance-opening-labor",
      issuedBy: "player-1",
      tick: 1,
      type: "assign-labor",
      payload: {
        settlementId: CAPITAL_ID,
        farmers: scenarioId === "stonewall" ? 6 : 8,
        builders: scenarioId === "stonewall" ? 2 : 4,
        lumberjacks: 6,
        miners: 0,
        luxuryWorkers: 0
      }
    },
    {
      id: "balance-opening-farm",
      issuedBy: "player-1",
      tick: 1,
      type: "place-building",
      payload: { settlementId: CAPITAL_ID, kind: "farm", position: OPENING_FARM_POSITION }
    }
  ];

  if (scenarioId === "ashen-oath") {
    commands.push({
      id: "balance-mend-settlement",
      issuedBy: "player-1",
      tick: 1,
      type: "cast-miracle",
      payload: { empireId: "empire-player", kind: "mend-settlement", settlementId: CAPITAL_ID }
    });
  }

  if (scenarioId === "rivergate") {
    commands.push({
      id: "balance-commission-wagon",
      issuedBy: "player-1",
      tick: 2,
      type: "create-caravan",
      payload: { settlementId: CAPITAL_ID }
    });
  }

  if (scenarioId === "stonewall") {
    commands.push(
      {
        id: "balance-raise-gate-guard",
        issuedBy: "player-1",
        tick: 1,
        type: "create-battalion",
        payload: { settlementId: CAPITAL_ID, size: 10, specialization: "militia" }
      },
      {
        id: "balance-march-to-gate",
        issuedBy: "player-1",
        tick: 2,
        type: "move-battalion",
        payload: { battalionId: "battalion-1-1", destination: { x: 500, y: 320 } }
      },
      {
        id: "balance-garrison-gate",
        issuedBy: "player-1",
        tick: 5,
        type: "garrison-battalion",
        payload: { battalionId: "battalion-1-1", buildingId: "building-stonewall-gate" }
      }
    );
  } else {
    commands.push({
      id: "balance-raise-crown-guard",
      issuedBy: "player-1",
      tick: 12,
      type: "create-battalion",
      payload: { settlementId: CAPITAL_ID, size: 8, specialization: "militia" }
    });
  }

  return commands;
}

const countEvents = (events: readonly GameEvent[], type: EventType): number =>
  events.filter((event) => event.type === type).length;

const firstRivalAttack = (events: readonly GameEvent[]): number | undefined =>
  events.find(
    (event) =>
      event.type === "attack-ordered" &&
      event.payload.targetId === "building-castle" &&
      event.payload.heirId === "heir-rival"
  )?.tick;

/**
 * Runs one deterministic, representative opening for a campaign theatre.
 * It is a balance instrument, never a gameplay authority or AI substitute.
 */
export function runCampaignBalancePlaytest(
  scenarioId: ScenarioId,
  options: { readonly seed?: number; readonly ticks?: number; readonly difficulty?: RivalDifficulty } = {}
): CampaignBalanceReport {
  const seed = options.seed ?? 9600;
  const ticks = options.ticks ?? CAMPAIGN_BALANCE_TICKS;
  const simulation = new Simulation(createInitialWorld(seed, options.difficulty ?? "rival", scenarioId));
  for (const command of openingCommands(scenarioId)) {
    simulation.enqueueCommand(command);
  }
  simulation.runTicks(ticks);

  const state = simulation.getState();
  const events = simulation.getEventLog();
  const capital = state.settlements[CAPITAL_ID];
  const playerCastle = state.buildings[capital.centralBuildingId];
  const rivalSettlement = state.settlements["settlement-rival"];
  const rivalCastle = rivalSettlement ? state.buildings[rivalSettlement.centralBuildingId] : undefined;
  const completedFarm = capital.buildingIds.some(
    (buildingId) => state.buildings[buildingId]?.kind === "farm" && state.buildings[buildingId]?.complete
  );
  const playerBattalionCount = Object.values(state.battalions).filter(
    (battalion) => battalion.ownerEmpireId === "empire-player"
  ).length;
  const rivalBattalionCount = Object.values(state.battalions).filter(
    (battalion) => battalion.ownerEmpireId === "empire-rival"
  ).length;
  const rejectedCommands = countEvents(events, "command-rejected");
  const starvationEvents = countEvents(events, "starvation");
  const plagueEvents = countEvents(events, "plague-spread");
  const garrisonEvents = countEvents(events, "battalion-garrisoned");
  const caravanEvents = countEvents(events, "caravan-created");
  const firstRivalAttackTick = firstRivalAttack(events);
  const activeMandate = getImperialMandateProgress(state).activeStep.id;
  const healthy =
    state.victory.winnerEmpireId === undefined &&
    playerCastle?.defense !== undefined &&
    playerCastle.defense > 0 &&
    capital.population.citizens > 0 &&
    capital.population.health > 0 &&
    capital.localFood > 0 &&
    completedFarm &&
    playerBattalionCount > 0 &&
    rejectedCommands === 0 &&
    firstRivalAttackTick !== undefined &&
    (scenarioId !== "ashen-oath" || capital.plagueTicks === 0) &&
    (scenarioId !== "rivergate" || caravanEvents > 0) &&
    (scenarioId !== "stonewall" || garrisonEvents > 0);

  return {
    scenarioId,
    seed,
    ticks,
    winnerEmpireId: state.victory.winnerEmpireId,
    playerCastleDefense: playerCastle?.defense ?? 0,
    playerCitizens: capital.population.citizens,
    playerCaptives: capital.population.captives,
    playerFood: capital.localFood,
    playerHealth: capital.population.health,
    playerFaith: state.empires["empire-player"].resources.faith,
    playerBattalionCount,
    rivalCastleDefense: rivalCastle?.defense ?? 0,
    rivalCitizens: rivalSettlement?.population.citizens ?? 0,
    rivalFood: rivalSettlement?.localFood ?? 0,
    rivalBattalionCount,
    completedFarm,
    firstRivalAttackTick,
    rejectedCommands,
    starvationEvents,
    plagueEvents,
    garrisonEvents,
    caravanEvents,
    activeMandate,
    healthy
  };
}

export function runCampaignBalanceSuite(
  options: { readonly seed?: number; readonly ticks?: number; readonly difficulty?: RivalDifficulty } = {}
): readonly CampaignBalanceReport[] {
  return CAMPAIGN_BALANCE_SCENARIOS.map((scenarioId) => runCampaignBalancePlaytest(scenarioId, options));
}
