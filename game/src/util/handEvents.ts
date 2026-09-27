import type { PokerEvent } from "../engine-api/types";

/** One action vocabulary for human play and bot replays. `raise_to` is the
 * street total; `amount` is chips newly added, which can be very different.
 */
export function actionLabel(event: Extract<PokerEvent, { type: "action" }>): string {
  if (event.action === "fold") return "folds";
  if (event.action === "check") return "checks";
  if (event.all_in) {
    if (event.action === "raise" && event.raise_to != null) return `raises all-in to ${event.raise_to}`;
    if (event.action === "call") return `calls all-in for ${event.amount}`;
    return `all-in ${event.amount}`;
  }
  if (event.action === "call") return event.amount > 0 ? `calls ${event.amount}` : "calls";
  if (event.action === "raise") {
    return event.raise_to != null ? `raises to ${event.raise_to}` : `raises ${event.amount}`;
  }
  return event.action;
}
