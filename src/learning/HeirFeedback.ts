/**
 * Shared teaching outcomes. These remain deterministic simulation values;
 * the renderer only uses them to explain the command before it is issued.
 */
export const HEIR_FEEDBACK = {
  reward: { confidenceDelta: 16, trustDelta: 5 },
  punish: { confidenceDelta: -18, trustDelta: -6 }
} as const;

export type HeirFeedbackKind = keyof typeof HEIR_FEEDBACK;
