// Mastery reflects decisions, not whether a player happened to win a short live
// hand. Each scored exercise has at most three stars; old completion-only saves
// remain valid and can earn stars the next time the lesson is practiced.
export function drillStars(correct: number, total: number): number {
  if (total <= 0 || correct < 0 || correct > total) return 0;
  if (correct === total) return 3;
  return correct / total >= 0.7 ? 2 : 1;
}

export function attemptStars(mistakes: number, verdict: "good" | "ok"): number {
  if (verdict === "ok") return 1;
  return mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
}

export function bestStars(previous: number | undefined, earned: number): number {
  return Math.max(previous ?? 0, earned);
}
