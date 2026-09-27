// Missed puzzle templates return after a few different decisions, rather than
// vanishing forever in a large random pool. The re-deal still uses a fresh seed.
export type ReviewQueue = Record<string, { dueAfter: number; misses: number }>;

export function updateReview(queue: ReviewQueue, id: string, correct: boolean, solved: number): ReviewQueue {
  const next = { ...queue };
  if (correct) delete next[id];
  else next[id] = { dueAfter: solved + 3, misses: (next[id]?.misses ?? 0) + 1 };
  return next;
}

export function dueReview(queue: ReviewQueue, poolIds: readonly string[], solved: number, previous?: string): string | null {
  const available = new Set(poolIds);
  const entries = Object.entries(queue)
    .filter(([id, review]) => available.has(id) && id !== previous && review.dueAfter <= solved)
    .sort((a, b) => a[1].dueAfter - b[1].dueAfter || a[0].localeCompare(b[0]));
  return entries[0]?.[0] ?? null;
}

/** Prevent a missed template from resurfacing randomly before it is due. If a
 * tiny topic has no other available spot, fall back rather than trapping play.
 */
export function candidateIds(queue: ReviewQueue, poolIds: readonly string[], solved: number, previous?: string): string[] {
  const due = dueReview(queue, poolIds, solved, previous);
  if (due) return [due];
  const others = poolIds.filter((id) => poolIds.length === 1 || id !== previous);
  const available = others.filter((id) => !queue[id] || queue[id].dueAfter <= solved);
  return available.length ? available : others;
}
