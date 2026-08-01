import type { BuildingKind, Position } from "../state/WorldState";
import type { BattalionId, BuildingId, CommandId, HeirId, PlayerId, SettlementId } from "../state/Ids";

export type CommandType =
  | "assign-labor"
  | "place-building"
  | "generate-faith"
  | "create-battalion"
  | "move-battalion"
  | "attack-target"
  | "reward-heir"
  | "punish-heir"
  | "cast-miracle";

export type MiracleKind = "bless-harvest" | "inspire-battalion";

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
  readonly miners: number;
}

export interface PlaceBuildingPayload {
  readonly settlementId: SettlementId;
  readonly kind: BuildingKind;
  readonly position?: Position;
}

export interface GenerateFaithPayload {
  readonly empireId: string;
  readonly amount: number;
}

export interface CreateBattalionPayload {
  readonly settlementId: SettlementId;
  readonly size: number;
}

export interface MoveBattalionPayload {
  readonly battalionId: BattalionId;
  readonly destination: Position;
}

export interface AttackTargetPayload {
  readonly battalionId: BattalionId;
  readonly targetId: BattalionId | BuildingId;
}

export interface HeirFeedbackPayload {
  readonly heirId: HeirId;
}

export interface CastMiraclePayload {
  readonly empireId: string;
  readonly kind: MiracleKind;
  readonly settlementId?: SettlementId;
  readonly targetId?: BattalionId;
}

export type GameCommand =
  | GameCommandBase<"assign-labor", AssignLaborPayload>
  | GameCommandBase<"place-building", PlaceBuildingPayload>
  | GameCommandBase<"generate-faith", GenerateFaithPayload>
  | GameCommandBase<"create-battalion", CreateBattalionPayload>
  | GameCommandBase<"move-battalion", MoveBattalionPayload>
  | GameCommandBase<"attack-target", AttackTargetPayload>
  | GameCommandBase<"reward-heir", HeirFeedbackPayload>
  | GameCommandBase<"punish-heir", HeirFeedbackPayload>
  | GameCommandBase<"cast-miracle", CastMiraclePayload>;
