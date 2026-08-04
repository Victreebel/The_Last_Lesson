import type { BattalionSpecialization, BuildingKind, Position } from "../state/WorldState";
import type { BattalionId, BuildingId, CaravanId, CommandId, DoctrineId, HeirId, PlayerId, SettlementId } from "../state/Ids";

export type CommandType =
  | "assign-labor"
  | "place-building"
  | "generate-faith"
  | "create-battalion"
  | "create-caravan"
  | "create-ship"
  | "move-battalion"
  | "attack-move-battalion"
  | "retreat-battalion"
  | "move-caravan"
  | "embark-battalion"
  | "disembark-caravan"
  | "garrison-battalion"
  | "attack-with-ship"
  | "attack-target"
  | "assimilate-captives"
  | "release-captives"
  | "exchange-captives"
  | "reward-heir"
  | "punish-heir"
  | "cast-miracle";

export type MiracleKind = "bless-harvest" | "inspire-battalion" | "mend-settlement" | "divine-judgment";

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
  readonly luxuryWorkers?: number;
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
  readonly specialization?: BattalionSpecialization;
}

export interface MoveBattalionPayload {
  readonly battalionId: BattalionId;
  readonly destination: Position;
  /** Appends a deterministic waypoint to the current direct-movement route. */
  readonly append?: boolean;
}

export interface RetreatBattalionPayload {
  readonly battalionId: BattalionId;
}

export interface CreateCaravanPayload {
  readonly settlementId: SettlementId;
}

export interface CreateShipPayload {
  readonly settlementId: SettlementId;
}

export interface MoveCaravanPayload {
  readonly caravanId: CaravanId;
  readonly destination: Position;
}

export interface EmbarkBattalionPayload {
  readonly battalionId: BattalionId;
  readonly caravanId: CaravanId;
}

export interface DisembarkCaravanPayload {
  readonly caravanId: CaravanId;
}

export interface GarrisonBattalionPayload {
  readonly battalionId: BattalionId;
  readonly buildingId: BuildingId;
}

export interface AttackWithShipPayload {
  readonly shipId: CaravanId;
  readonly targetId: CaravanId;
}

export interface AttackTargetPayload {
  readonly battalionId: BattalionId;
  readonly targetId: BattalionId | BuildingId | CaravanId;
}

export interface AssimilateCaptivesPayload {
  readonly settlementId: SettlementId;
  readonly count: number;
}

export interface ReleaseCaptivesPayload {
  readonly settlementId: SettlementId;
  readonly count: number;
}

/** A player-negotiated accord; governors neither initiate nor learn from it. */
export interface ExchangeCaptivesPayload {
  readonly settlementId: SettlementId;
  readonly rivalSettlementId: SettlementId;
  readonly count: number;
}

export interface HeirFeedbackPayload {
  readonly heirId: HeirId;
  /** Defaults to the Heir's newest lesson; an explicit ID supports reviewed prior convictions. */
  readonly doctrineId?: DoctrineId;
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
  | GameCommandBase<"create-caravan", CreateCaravanPayload>
  | GameCommandBase<"create-ship", CreateShipPayload>
  | GameCommandBase<"move-battalion", MoveBattalionPayload>
  | GameCommandBase<"attack-move-battalion", MoveBattalionPayload>
  | GameCommandBase<"retreat-battalion", RetreatBattalionPayload>
  | GameCommandBase<"move-caravan", MoveCaravanPayload>
  | GameCommandBase<"embark-battalion", EmbarkBattalionPayload>
  | GameCommandBase<"disembark-caravan", DisembarkCaravanPayload>
  | GameCommandBase<"garrison-battalion", GarrisonBattalionPayload>
  | GameCommandBase<"attack-with-ship", AttackWithShipPayload>
  | GameCommandBase<"attack-target", AttackTargetPayload>
  | GameCommandBase<"assimilate-captives", AssimilateCaptivesPayload>
  | GameCommandBase<"release-captives", ReleaseCaptivesPayload>
  | GameCommandBase<"exchange-captives", ExchangeCaptivesPayload>
  | GameCommandBase<"reward-heir", HeirFeedbackPayload>
  | GameCommandBase<"punish-heir", HeirFeedbackPayload>
  | GameCommandBase<"cast-miracle", CastMiraclePayload>;
