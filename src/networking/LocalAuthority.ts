import { Simulation, type SimulationTickResult } from "../simulation/Simulation";
import type { SimulationConfig } from "../simulation/SimulationConfig";
import type { GameCommand } from "../simulation/commands/GameCommand";
import type { GameEvent } from "../simulation/events/GameEvent";
import { stableHash } from "../simulation/hash/stableHash";
import type { EmpireId, PlayerId } from "../simulation/state/Ids";
import type { WorldState } from "../simulation/state/WorldState";

export type CommandIntent<TCommand extends GameCommand = GameCommand> = TCommand extends GameCommand
  ? Omit<TCommand, "id" | "issuedBy" | "tick">
  : never;

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

  submit(clientId: PlayerId, intent: CommandIntent): GameCommand {
    if (!this.clients.has(clientId)) {
      throw new Error(`Client ${clientId} is not connected to this authority.`);
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
