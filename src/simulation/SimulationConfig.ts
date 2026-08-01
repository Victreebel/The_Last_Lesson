export interface SimulationConfig {
  readonly tickDurationMs: number;
  readonly schemaVersion: string;
  readonly gameVersion: string;
  readonly contentVersion: string;
}

export const defaultSimulationConfig: SimulationConfig = {
  tickDurationMs: 5000,
  schemaVersion: "1.1.0",
  gameVersion: "0.0.0",
  contentVersion: "0.0.0"
};
