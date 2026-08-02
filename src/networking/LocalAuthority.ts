import { Simulation, type SimulationTickResult } from "../simulation/Simulation";
import type { SimulationConfig } from "../simulation/SimulationConfig";
import type { GameCommand } from "../simulation/commands/GameCommand";
import type { GameEvent } from "../simulation/events/GameEvent";
import { stableHash } from "../simulation/hash/stableHash";
import type { EmpireId, PlayerId } from "../simulation/state/Ids";
import type { WorldState } from "../simulation/state/WorldState";

type StripCommandAuthority<TCommand extends GameCommand> = TCommand extends unknown
  ? Omit<TCommand, "id" | "issuedBy" | "tick">
  : never;

/** A player command before the authoritative host assigns identity and tick. */
export type CommandIntent = StripCommandAuthority<GameCommand>;

export interface LocalClientConnection {
  readonly clientId: PlayerId;
  readonly empireId: EmpireId;
}

export interface AuthoritySnapshot {
  readonly tick: number;
  readonly state: WorldState;
  readonly stateHash: string;
  readonly eventLogHash: string;
  readonly recentEvents: GameEvent[];
  readonly connectedClients: LocalClientConnection[];
}

/**
 * In-process authoritative host for deterministic local co-op and networking
 * integration tests. It owns simulation time; clients may only submit intents.
 */
export class LocalAuthority {
  private readonly simulation: Simulation;
  private readonly clients = new Map<PlayerId, LocalClientConnection>();
  private commandSequence = 0;
  private recentEvents: GameEvent[] = [];
  private openingLaborPrepared = false;

  constructor(initialWorld: WorldState, config?: SimulationConfig) {
    this.simulation = new Simulation(structuredClone(initialWorld), config);
  }

  connect(connection: LocalClientConnection): AuthoritySnapshot {
    this.clients.set(connection.clientId, structuredClone(connection));
    return this.getSnapshot();
  }

  disconnect(clientId: PlayerId): void {
    this.clients.delete(clientId);
  }

  /**
   * Queues the same first-tick Crown labor plan used by a local campaign.
   * It is host-owned setup, so all joined clients see the identical opening.
   */
  prepareOpeningLabor(settlementId = "settlement-capital"): void {
    if (this.openingLaborPrepared) {
      return;
    }
    const settlement = this.simulation.getState().settlements[settlementId];
    if (!settlement) {
      return;
    }
    const population = settlement.population;
    const authoredLabor =
      population.farmers + population.builders + population.lumberjacks + population.miners + population.luxuryWorkers > 0;
    this.simulation.enqueueCommand({
      // This sort order lets a genuine player labor order for tick one supersede the default.
      id: "authority-0-opening-labor",
      issuedBy: "authority",
      tick: this.simulation.getState().tick + 1,
      type: "assign-labor",
      payload: {
        settlementId,
        farmers: authoredLabor ? population.farmers : 8,
        builders: authoredLabor ? population.builders : 4,
        lumberjacks: authoredLabor ? population.lumberjacks : 6,
        miners: authoredLabor ? population.miners : 0,
        luxuryWorkers: authoredLabor ? population.luxuryWorkers : 0
      }
    });
    this.openingLaborPrepared = true;
  }

  submit(clientId: PlayerId, intent: CommandIntent): GameCommand {
    const connection = this.clients.get(clientId);
    if (!connection) {
      throw new Error(`Client ${clientId} is not connected to this authority.`);
    }
    if (!this.isIntentAuthorized(connection.empireId, intent)) {
      throw new Error("This command is not authorized for the connected empire.");
    }

    const command = {
      ...structuredClone(intent),
      id: `authority-${this.commandSequence + 1}`,
      issuedBy: clientId,
      tick: this.simulation.getState().tick + 1
    } as GameCommand;
    this.commandSequence += 1;
    this.simulation.enqueueCommand(command);
    return structuredClone(command);
  }

  private isIntentAuthorized(empireId: EmpireId, intent: CommandIntent): boolean {
    const state = this.simulation.getState();
    const ownsSettlement = (settlementId: string) => state.settlements[settlementId]?.ownerEmpireId === empireId;
    const ownsBattalion = (battalionId: string) => state.battalions[battalionId]?.ownerEmpireId === empireId;
    const ownsCaravan = (caravanId: string) => state.caravans[caravanId]?.ownerEmpireId === empireId;
    const ownsBuilding = (buildingId: string) => state.buildings[buildingId]?.ownerEmpireId === empireId;
    const ownsHeir = (heirId: string) => state.heirs[heirId]?.ownerEmpireId === empireId;

    switch (intent.type) {
      case "assign-labor":
      case "place-building":
      case "create-battalion":
      case "create-caravan":
      case "create-ship":
      case "assimilate-captives":
      case "release-captives":
        return ownsSettlement(intent.payload.settlementId);
      case "move-battalion":
      case "attack-move-battalion":
      case "retreat-battalion":
        return ownsBattalion(intent.payload.battalionId);
      case "move-caravan":
      case "disembark-caravan":
        return ownsCaravan(intent.payload.caravanId);
      case "embark-battalion":
        return ownsBattalion(intent.payload.battalionId) && ownsCaravan(intent.payload.caravanId);
      case "garrison-battalion":
        return ownsBattalion(intent.payload.battalionId) && ownsBuilding(intent.payload.buildingId);
      case "attack-with-ship":
        return ownsCaravan(intent.payload.shipId);
      case "attack-target":
        return ownsBattalion(intent.payload.battalionId);
      case "reward-heir":
      case "punish-heir":
        return ownsHeir(intent.payload.heirId);
      case "cast-miracle":
        return (
          intent.payload.empireId === empireId &&
          (!intent.payload.settlementId || ownsSettlement(intent.payload.settlementId)) &&
          (!intent.payload.targetId || ownsBattalion(intent.payload.targetId))
        );
      case "generate-faith":
        // This developer-only command exists for deterministic test fixtures;
        // no connected player may mint an arbitrary miracle resource.
        return false;
    }
  }

  advance(): AuthoritySnapshot {
    const result = this.simulation.tick();
    this.recentEvents = structuredClone(result.events);
    return this.getSnapshot();
  }

  getSnapshot(): AuthoritySnapshot {
    const state = this.simulation.getState();
    return structuredClone({
      tick: state.tick,
      state,
      stateHash: stableHash(state),
      eventLogHash: stableHash(this.simulation.getEventLog()),
      recentEvents: this.recentEvents,
      connectedClients: [...this.clients.values()].sort((left, right) => left.clientId.localeCompare(right.clientId))
    });
  }

  getLastTickResult(): SimulationTickResult | undefined {
    if (this.recentEvents.length === 0 && this.simulation.getState().tick === 0) {
      return undefined;
    }
    return {
      tick: this.simulation.getState().tick,
      events: structuredClone(this.recentEvents),
      stateHash: stableHash(this.simulation.getState())
    };
  }
}
