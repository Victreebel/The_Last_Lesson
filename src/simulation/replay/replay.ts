import { Simulation } from "../Simulation";
import type { SimulationConfig } from "../SimulationConfig";
import type { GameCommand } from "../commands/GameCommand";
import { stableHash } from "../hash/stableHash";
import type { WorldState } from "../state/WorldState";

export interface ReplayInput {
  readonly initialWorld: WorldState;
  readonly commands: GameCommand[];
  readonly ticks: number;
  readonly config?: SimulationConfig;
}

export interface ReplayResult {
  readonly finalState: WorldState;
  readonly finalStateHash: string;
  readonly eventLogHash: string;
}

export function runReplay(input: ReplayInput): ReplayResult {
  const simulation = new Simulation(structuredClone(input.initialWorld), input.config);

  for (const command of input.commands) {
    simulation.enqueueCommand(command);
  }

  simulation.runTicks(input.ticks);

  const finalState = simulation.getState();

  return {
    finalState,
    finalStateHash: stableHash(finalState),
    eventLogHash: stableHash(simulation.getEventLog())
  };
}

