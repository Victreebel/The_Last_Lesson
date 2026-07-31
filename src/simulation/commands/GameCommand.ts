import type { BuildingKind } from "../state/WorldState";
import type { CommandId, PlayerId, SettlementId } from "../state/Ids";

export type CommandType = "assign-labor" | "place-building" | "generate-faith";

export interface GameCommandBase<TType extends CommandType, TPayload> {
  readonly id: CommandId;
  readonly issuedBy: PlayerId | "system";
  readonly tick: number;
  readonly type: TType;
  readonly payload: TPayload;
}

export interface AssignLaborPayload {
  readonly settlementId: SettlementId;
  readonly farmers: number;
  readonly builders: number;
  readonly lumberjacks: number;
}

export interface PlaceBuildingPayload {
  readonly settlementId: SettlementId;
  readonly kind: BuildingKind;
}

export interface GenerateFaithPayload {
  readonly empireId: string;
  readonly amount: number;
}

export type GameCommand =
  | GameCommandBase<"assign-labor", AssignLaborPayload>
  | GameCommandBase<"place-building", PlaceBuildingPayload>
  | GameCommandBase<"generate-faith", GenerateFaithPayload>;

