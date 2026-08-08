// SVG playing cards. One component renders any of the 52 cards from its 2-char code
// (e.g. "As", "Td", "7h") plus a decorative back. Cards are drawn in a 240x336 viewBox
// (standard 2.5:3.5 poker ratio) and scaled by width.

import { Pip, SuitShape } from "./suits";

const SERIF = 'Georgia, "Times New Roman", serif';
const RED = "#d4353b";
const BLACK = "#1b2028";

const L = 80, C = 120, R = 160; // pip columns
type XY = [number, number];

// Standard pip positions per rank. y > 168 pips are drawn upside-down (invert).
const LAYOUTS: Record<string, XY[]> = {
  "2": [[C, 72], [C, 264]],
  "3": [[C, 72], [C, 168], [C, 264]],
  "4": [[L, 80], [R, 80], [L, 256], [R, 256]],
  "5": [[L, 80], [R, 80], [C, 168], [L, 256], [R, 256]],
  "6": [[L, 80], [R, 80], [L, 168], [R, 168], [L, 256], [R, 256]],
  "7": [[L, 80], [R, 80], [C, 124], [L, 168], [R, 168], [L, 256], [R, 256]],
  "8": [[L, 80], [R, 80], [C, 124], [L, 168], [R, 168], [C, 212], [L, 256], [R, 256]],
  "9": [[L, 74], [R, 74], [L, 130], [R, 130], [C, 168], [L, 206], [R, 206], [L, 262], [R, 262]],
  "10": [[L, 70], [R, 70], [C, 100], [L, 126], [R, 126], [L, 210], [R, 210], [C, 236], [L, 266], [R, 266]],
};

function pipSize(rank: string): number {
  if (["2", "3", "4", "5"].includes(rank)) return 46;
  if (["6", "7", "8"].includes(rank)) return 42;
  return 34;
}

function CornerIndex({ label, suit, color }: { label: string; suit: string; color: string }) {
  return (
    <g>
      <text
        x={26} y={54} fontFamily={SERIF} fontSize={label === "10" ? 34 : 44}
        fontWeight={700} fill={color} textAnchor="middle"
      >
        {label}
      </text>
      <g transform={`translate(${26 - 13} ${64}) scale(0.26)`} fill={color}>
        <SuitShape suit={suit} />
      </g>
    </g>
  );
}

function CourtMotif({ rank, color }: { rank: string; color: string }) {
  if (rank === "K") {
    return (
      <path
        d="M92 128 L102 112 L112 128 L120 106 L128 128 L138 112 L148 128 L144 142 L96 142 Z"
        fill={color}
      />
    );
  }
  if (rank === "Q") {
    return (
      <g fill={color}>
        <path d="M94 132 Q120 108 146 132 L142 142 L98 142 Z" />
        <circle cx={94} cy={120} r={6} />
        <circle cx={120} cy={112} r={6} />
        <circle cx={146} cy={120} r={6} />
      </g>
    );
  }
  // Jack: a simple crossed banner/sword flourish.
  return (
    <g stroke={color} strokeWidth={7} strokeLinecap="round" fill="none">
      <path d="M100 112 L140 142" />
      <path d="M140 112 L100 142" />
    </g>
  );
}

function CardFace({ rank, suit }: { rank: string; suit: string }) {
  const color = suit === "h" || suit === "d" ? RED : BLACK;
  const label = rank === "T" ? "10" : rank;
  const isFace = ["J", "Q", "K"].includes(rank);
  const isAce = rank === "A";
  const pips = LAYOUTS[label];

  return (
    <>
      {/* corner indices (top-left, and bottom-right rotated) */}
      <CornerIndex label={label} suit={suit} color={color} />
      <g transform="rotate(180 120 168)">
        <CornerIndex label={label} suit={suit} color={color} />
      </g>

      {isAce && <Pip x={120} y={172} size={132} suit={suit} color={color} />}

      {pips &&
        pips.map(([x, y], i) => (
          <Pip key={i} x={x} y={y} size={pipSize(label)} suit={suit} color={color} invert={y > 168} />
        ))}

      {isFace && (
        <g>
          <rect
            x={64} y={70} width={112} height={196} rx={10}
            fill={color} opacity={0.06} stroke={color} strokeOpacity={0.5} strokeWidth={2}
          />
          <CourtMotif rank={rank} color={color} />
          <text
            x={120} y={214} fontFamily={SERIF} fontSize={104} fontWeight={700}
            fill={color} textAnchor="middle"
          >
            {label}
          </text>
          <g transform={`translate(${74} ${232}) scale(0.28)`} fill={color}>
            <SuitShape suit={suit} />
          </g>
          <g transform={`translate(${166 - 28} ${76}) scale(0.28)`} fill={color}>
            <SuitShape suit={suit} />
          </g>
        </g>
      )}
    </>
  );
}

export function PlayingCard({ code, width = 60 }: { code: string; width?: number }) {
  const rank = code[0].toUpperCase();
  const suit = code[1].toLowerCase();
  const height = width * 1.4;
  return (
    <svg width={width} height={height} viewBox="0 0 240 336" className="pcard" aria-label={code}>
      <defs>
        <linearGradient id="cardsheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#eef1f5" />
        </linearGradient>
      </defs>
      <rect x={2} y={2} width={236} height={332} rx={18} fill="url(#cardsheen)"
        stroke="#c7ced8" strokeWidth={2} />
      <CardFace rank={rank} suit={suit} />
    </svg>
  );
}

export function CardBackArt({ width = 60 }: { width?: number }) {
  const height = width * 1.4;
  return (
    <svg width={width} height={height} viewBox="0 0 240 336" className="pcard">
      <defs>
        <linearGradient id="backfill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f3a8a" />
          <stop offset="1" stopColor="#122057" />
        </linearGradient>
        <pattern id="lattice" width={26} height={26} patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)">
          <path d="M0 0 H26 M0 13 H26" stroke="#3b57c4" strokeWidth={2} opacity={0.55} />
        </pattern>
      </defs>
      <rect x={2} y={2} width={236} height={332} rx={18} fill="url(#backfill)"
        stroke="#0b1440" strokeWidth={2} />
      <rect x={16} y={16} width={208} height={304} rx={12} fill="url(#lattice)"
        stroke="#6f8bec" strokeWidth={2} strokeOpacity={0.6} />
      <g transform="translate(120 168)">
        <circle r={44} fill="#0b1440" stroke="#6f8bec" strokeWidth={2} strokeOpacity={0.7} />
        <g transform="translate(-30 -30) scale(0.6)" fill="#aebff2">
          <SuitShape suit="s" />
        </g>
      </g>
    </svg>
  );
}
