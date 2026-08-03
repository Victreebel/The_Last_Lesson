export type LessonPresentationStatus = "observed" | "reinforced" | "disciplined";

export interface LessonPresentationInput {
  readonly status: LessonPresentationStatus;
  readonly heirName?: string;
  readonly condition?: string;
  readonly action?: string;
  readonly goal?: string;
  readonly confidence?: number;
}

const statusLabel: Record<LessonPresentationStatus, string> = {
  observed: "OBSERVED",
  reinforced: "REINFORCED",
  disciplined: "QUESTIONED"
};

const feedbackLabel: Record<LessonPresentationStatus, string> = {
  observed: "HEIR [H] // REWARD OR PUNISH TO TEACH",
  reinforced: "HEIR [H] // REWARD CONFIRMED",
  disciplined: "HEIR [H] // PUNISHMENT RECORDED"
};

const compact = (value: string | undefined, fallback: string, limit = 54): string => {
  const words = (value ?? fallback).replace(/\s+/g, " ").trim();
  return words.length <= limit ? words.toUpperCase() : `${words.slice(0, limit - 3).trimEnd().toUpperCase()}...`;
};

/**
 * A presentation-only bridge from an immutable doctrine event to an actionable
 * battlefield brief. It deliberately does not own lesson state or feedback.
 */
export function getLessonPresentationLines(input: LessonPresentationInput): readonly string[] {
  const heir = compact(input.heirName, "HEIR", 28);
  const action = compact(input.action, "A NEW CONVICTION", 48);
  const condition = compact(input.condition, "THE CROWN ACTED", 54);
  const goal = compact(input.goal, "SHAPE FUTURE GOVERNANCE", 54);
  const confidence = Math.max(0, Math.min(100, Math.round(input.confidence ?? 0)));

  return [
    `LESSON ${statusLabel[input.status]} // ${heir} // H: FEEDBACK`,
    `WHEN: ${condition}`,
    `DOCTRINE: ${action} // ${confidence}%`,
    `GOAL: ${goal}`,
    feedbackLabel[input.status]
  ];
}
