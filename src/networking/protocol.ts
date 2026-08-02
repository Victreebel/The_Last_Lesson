import type { CommandIntent, AuthoritySnapshot } from "./LocalAuthority";
import type { GameCommand } from "../simulation/commands/GameCommand";
import type { EmpireId, PlayerId } from "../simulation/state/Ids";
import type { RivalDifficulty, ScenarioId } from "../simulation/state/WorldState";

export interface MatchSetup {
  readonly seed: number;
  readonly scenarioId: ScenarioId;
  readonly rivalDifficulty: RivalDifficulty;
}

export interface JoinMatchMessage {
  readonly type: "join-match";
  readonly roomId: string;
  readonly clientId: PlayerId;
  readonly empireId: EmpireId;
  readonly setup?: MatchSetup;
}

export interface SubmitIntentMessage {
  readonly type: "submit-intent";
  readonly intent: CommandIntent;
}

export interface RequestSnapshotMessage {
  readonly type: "request-snapshot";
}

export type ClientMessage = JoinMatchMessage | SubmitIntentMessage | RequestSnapshotMessage;

export interface JoinedMatchMessage {
  readonly type: "joined-match";
  readonly roomId: string;
  readonly clientId: PlayerId;
  readonly snapshot: AuthoritySnapshot;
}

export interface CommandAcceptedMessage {
  readonly type: "command-accepted";
  readonly command: GameCommand;
}

export interface SnapshotMessage {
  readonly type: "snapshot";
  readonly snapshot: AuthoritySnapshot;
}

export interface ProtocolErrorMessage {
  readonly type: "protocol-error";
  readonly message: string;
}

export type ServerMessage = JoinedMatchMessage | CommandAcceptedMessage | SnapshotMessage | ProtocolErrorMessage;

export function parseClientMessage(serialized: string): ClientMessage | undefined {
  try {
    const value: unknown = JSON.parse(serialized);
    if (!isRecord(value) || typeof value.type !== "string") {
      return undefined;
    }
    if (value.type === "request-snapshot") {
      return { type: "request-snapshot" };
    }
    if (value.type === "submit-intent" && isCommandIntent(value.intent)) {
      return { type: "submit-intent", intent: value.intent };
    }
    if (
      value.type === "join-match" &&
      isIdentifier(value.roomId) &&
      isIdentifier(value.clientId) &&
      isIdentifier(value.empireId) &&
      (value.setup === undefined || isMatchSetup(value.setup))
    ) {
      return {
        type: "join-match",
        roomId: value.roomId,
        clientId: value.clientId,
        empireId: value.empireId,
        ...(value.setup ? { setup: value.setup } : {})
      };
    }
  } catch {
    // Network input is untrusted. Invalid JSON is rejected without touching simulation state.
  }
  return undefined;
}

export function serializeServerMessage(message: ServerMessage): string {
  return JSON.stringify(message);
}

function isMatchSetup(value: unknown): value is MatchSetup {
  return (
    isRecord(value) &&
    Number.isInteger(value.seed) &&
    isScenarioId(value.scenarioId) &&
    isRivalDifficulty(value.rivalDifficulty)
  );
}

function isCommandIntent(value: unknown): value is CommandIntent {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    isRecord(value.payload) &&
    value.id === undefined &&
    value.issuedBy === undefined &&
    value.tick === undefined
  );
}

function isScenarioId(value: unknown): value is ScenarioId {
  return value === "crownfall" || value === "rivergate" || value === "ashen-oath" || value === "stonewall";
}

function isRivalDifficulty(value: unknown): value is RivalDifficulty {
  return value === "disciple" || value === "rival" || value === "architect";
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9-]{1,64}$/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
