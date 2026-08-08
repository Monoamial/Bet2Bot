// Suit shapes drawn in a 0..100 local coordinate box. Fill comes from the parent <g>.
// Used both for corner indices and for pip layouts on number cards.

export const SUIT_PATH: Record<string, string> = {
  h: "M50 84 C 22 62, 10 46, 10 30 C 10 18, 19 10, 30 10 C 39 10, 46 16, 50 24 " +
     "C 54 16, 61 10, 70 10 C 81 10, 90 18, 90 30 C 90 46, 78 62, 50 84 Z",
  d: "M50 6 L 86 50 L 50 94 L 14 50 Z",
  s: "M50 12 C 50 12, 88 44, 88 62 C 88 74, 79 82, 68 82 C 60 82, 54 78, 51 72 " +
     "C 52 80, 55 88, 62 92 L 38 92 C 45 88, 48 80, 49 72 C 46 78, 40 82, 32 82 " +
     "C 21 82, 12 74, 12 62 C 12 44, 50 12, 50 12 Z",
};

export function SuitShape({ suit }: { suit: string }) {
  if (suit === "c") {
    return (
      <g>
        <circle cx={50} cy={30} r={18} />
        <circle cx={30} cy={54} r={18} />
        <circle cx={70} cy={54} r={18} />
        <path d="M50 48 C 53 66 55 78 62 92 L 38 92 C 45 78 47 66 50 48 Z" />
      </g>
    );
  }
  return <path d={SUIT_PATH[suit] ?? SUIT_PATH.s} />;
}

/** A single suit pip centered at (x, y) with a given pixel size, optionally flipped. */
export function Pip({
  x, y, size, suit, color, invert,
}: {
  x: number; y: number; size: number; suit: string; color: string; invert?: boolean;
}) {
  const scale = size / 100;
  return (
    <g
      transform={`translate(${x - size / 2} ${y - size / 2}) scale(${scale})${
        invert ? " rotate(180 50 50)" : ""
      }`}
      fill={color}
    >
      <SuitShape suit={suit} />
    </g>
  );
}
