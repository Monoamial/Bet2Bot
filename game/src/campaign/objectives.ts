import type { LevelResult, SessionResult } from "../engine-api/types";

export type NumericObjectiveMetric =
  | "playerBb100"
  | "illegalActions"
  | "handsSurvived"
  | "finalStack";
export type ObjectiveMetric = NumericObjectiveMetric | "sessionBusted";
export type NumericComparison = "gt" | "gte" | "lt" | "lte" | "eq";
export type StarCount = 1 | 2 | 3;

export type ObjectiveCheck =
  | {
      id: string;
      label: string;
      metric: NumericObjectiveMetric;
      comparison: NumericComparison;
      threshold: number;
    }
  | {
      id: string;
      label: string;
      metric: "sessionBusted";
      comparison: "eq";
      threshold: boolean;
    };

export interface ObjectiveTier {
  id: string;
  label: string;
  stars: StarCount;
  /** Every check in a tier must pass before its stars are awarded. */
  checks: readonly ObjectiveCheck[];
}

export interface ObjectiveDefinition {
  id: string;
  title: string;
  /** Tiers award the highest passed star count, not the sum of tier values. */
  tiers: readonly ObjectiveTier[];
}

export type ObjectiveRunResult = LevelResult | SessionResult;
export type EvaluatedObjectiveCheck = ObjectiveCheck & {
  actual: number | boolean | null;
  passed: boolean;
};
export type EvaluatedObjectiveTier = Omit<ObjectiveTier, "checks"> & {
  checks: EvaluatedObjectiveCheck[];
  passed: boolean;
};
export type EvaluatedObjective = Omit<ObjectiveDefinition, "tiers"> & {
  tiers: EvaluatedObjectiveTier[];
  stars: number;
  maxStars: number;
};

export interface ObjectiveScore {
  objectives: EvaluatedObjective[];
  stars: number;
  maxStars: number;
}

/**
 * Campaign stars are based on the existing > winBb100 target and a stretch
 * tier at twice that threshold. They do not change the progression gate.
 */
export function createLimitLevelObjectives(winBb100: number): ObjectiveDefinition[] {
  const stretchTarget = winBb100 * 2;
  return [
    {
      id: "beat-opponent",
      title: "Beat the opponent",
      tiers: [
        {
          id: "campaign-target",
          label: "Campaign objective",
          stars: 1,
          checks: [
            {
              id: "campaign-bb100",
              label: `bb/100 > ${winBb100}`,
              metric: "playerBb100",
              comparison: "gt",
              threshold: winBb100,
            },
          ],
        },
        {
          id: "stretch-target",
          label: "Stretch win",
          stars: 2,
          checks: [
            {
              id: "stretch-bb100",
              label: `bb/100 > ${stretchTarget}`,
              metric: "playerBb100",
              comparison: "gt",
              threshold: stretchTarget,
            },
          ],
        },
      ],
    },
  ];
}

/** Clear the fixed-stack Survival level by completing the full 200-hand session. */
export const SURVIVE_200_OBJECTIVE: ObjectiveDefinition = {
  id: "survive-200-hands",
  title: "Survive 200 hands",
  tiers: [
    {
      id: "complete-200-without-busting",
      label: "Finish 200 hands without busting",
      stars: 3,
      checks: [
        {
          id: "hands-survived",
          label: "Hands survived ≥ 200",
          metric: "handsSurvived",
          comparison: "gte",
          threshold: 200,
        },
        {
          id: "session-not-busted",
          label: "Session not busted",
          metric: "sessionBusted",
          comparison: "eq",
          threshold: false,
        },
      ],
    },
  ],
};

export function maxObjectiveStars(objectives: readonly ObjectiveDefinition[]): number {
  return objectives.reduce(
    (total, objective) => total + objective.tiers.reduce((max, tier) => Math.max(max, tier.stars), 0),
    0,
  );
}

export function evaluateObjectives(
  definitions: readonly ObjectiveDefinition[],
  result: ObjectiveRunResult | null | undefined,
): ObjectiveScore {
  const objectives = definitions.map((definition): EvaluatedObjective => {
    const tiers = definition.tiers.map((tier): EvaluatedObjectiveTier => {
      const checks = tier.checks.map((check) => evaluateCheck(check, result));
      return {
        ...tier,
        checks,
        // Empty or unavailable checks never grant stars.
        passed: checks.length > 0 && checks.every((check) => check.passed),
      };
    });
    return {
      ...definition,
      tiers,
      stars: tiers.reduce((best, tier) => tier.passed ? Math.max(best, tier.stars) : best, 0),
      maxStars: tiers.reduce((max, tier) => Math.max(max, tier.stars), 0),
    };
  });

  return {
    objectives,
    stars: objectives.reduce((total, objective) => total + objective.stars, 0),
    maxStars: objectives.reduce((total, objective) => total + objective.maxStars, 0),
  };
}

function evaluateCheck(
  check: ObjectiveCheck,
  result: ObjectiveRunResult | null | undefined,
): EvaluatedObjectiveCheck {
  const actual = readMetric(result, check.metric);
  let passed = false;
  if (check.metric === "sessionBusted") {
    passed = typeof actual === "boolean" && actual === check.threshold;
  } else {
    passed = typeof actual === "number" && compare(actual, check.comparison, check.threshold);
  }
  return { ...check, actual, passed } as EvaluatedObjectiveCheck;
}

function compare(actual: number, comparison: NumericComparison, threshold: number): boolean {
  if (!Number.isFinite(actual) || !Number.isFinite(threshold)) return false;
  switch (comparison) {
    case "gt": return actual > threshold;
    case "gte": return actual >= threshold;
    case "lt": return actual < threshold;
    case "lte": return actual <= threshold;
    case "eq": return actual === threshold;
  }
}

function readMetric(
  result: ObjectiveRunResult | null | undefined,
  metric: ObjectiveMetric,
): number | boolean | null {
  // Missing/error payloads and missing metrics fail closed instead of becoming successes.
  if (!result || result.error !== null) return null;

  switch (metric) {
    case "playerBb100":
      return Number.isFinite(result.player_bb100) ? result.player_bb100 : null;
    case "illegalActions": {
      const player = result.summary?.[result.player_index];
      return player && Number.isFinite(player.illegal) ? player.illegal : null;
    }
    case "handsSurvived":
      return isSessionResult(result) ? result.hands_survived : null;
    case "finalStack":
      return isSessionResult(result) ? result.final_stack : null;
    case "sessionBusted":
      return isSessionResult(result) ? result.busted : null;
  }
}

function isSessionResult(result: ObjectiveRunResult): result is SessionResult {
  const candidate = result as Partial<SessionResult>;
  return Number.isFinite(candidate.hands_survived)
    && Number.isFinite(candidate.final_stack)
    && typeof candidate.busted === "boolean";
}
