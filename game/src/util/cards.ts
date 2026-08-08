// Parse the engine's 2-char card strings (e.g. "As", "Td", "7h") for display.

const SUIT_SYMBOL: Record<string, string> = {
  s: "♠", // ♠
  h: "♥", // ♥
  d: "♦", // ♦
  c: "♣", // ♣
};

export interface ParsedCard {
  rank: string;
  suit: string; // symbol
  red: boolean;
}

export function parseCard(card: string): ParsedCard {
  const rank = card[0];
  const suit = card[1];
  return {
    rank: rank === "T" ? "10" : rank,
    suit: SUIT_SYMBOL[suit] ?? suit,
    red: suit === "h" || suit === "d",
  };
}
