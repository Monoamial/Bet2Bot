// Robot avatars for the player and each AI opponent. Every bot shares a common robot
// frame (badge + head + antenna) but has distinct colors, eyes, mouth, and an accessory
// that hints at its play style.

interface Palette { ring: string; face: string; glow: string; }

const PALETTE: Record<string, Palette> = {
  you: { ring: "#4ade80", face: "#1d3b2a", glow: "#7cf0a6" },
  caller: { ring: "#38bdf8", face: "#123043", glow: "#8bd8ff" },
  tight_aggressive: { ring: "#f5544e", face: "#3a1615", glow: "#ff8f8b" },
  profiler: { ring: "#a78bfa", face: "#2a1f45", glow: "#c9b6ff" },
  maniac: { ring: "#fb923c", face: "#3a2410", glow: "#ffc08a" },
  rock: { ring: "#94a3b8", face: "#2a2f36", glow: "#cbd5e1" },
  folder: { ring: "#64748b", face: "#242a31", glow: "#a9b4c2" },
  default: { ring: "#8b96a5", face: "#242a31", glow: "#c2cad4" },
};

function Features({ kind, glow }: { kind: string; glow: string }) {
  const eye = glow;
  const line = "#e9eef5";
  switch (kind) {
    case "you":
      return (
        <g>
          {/* headset */}
          <path d="M14 34 A22 22 0 0 1 58 34" fill="none" stroke={line} strokeWidth={3} />
          <rect x={11} y={33} width={7} height={12} rx={3} fill={line} />
          <rect x={54} y={33} width={7} height={12} rx={3} fill={line} />
          <rect x={26} y={32} width={7} height={7} rx={2} fill={eye} />
          <rect x={39} y={32} width={7} height={7} rx={2} fill={eye} />
          <path d="M28 46 Q36 52 44 46" fill="none" stroke={line} strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    case "caller":
      return (
        <g>
          <path d="M26 35 h8" stroke={eye} strokeWidth={4} strokeLinecap="round" />
          <path d="M38 35 h8" stroke={eye} strokeWidth={4} strokeLinecap="round" />
          <path d="M29 46 Q36 50 43 46" fill="none" stroke={line} strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    case "tight_aggressive":
      return (
        <g>
          {/* fin */}
          <path d="M36 8 L44 18 L30 18 Z" fill={eye} />
          {/* angry slanted visor eyes */}
          <path d="M25 31 L34 35 L25 38 Z" fill={eye} />
          <path d="M47 31 L38 35 L47 38 Z" fill={eye} />
          {/* jagged teeth */}
          <path d="M28 45 L31 49 L34 45 L37 49 L40 45 L43 49 L46 45"
            fill="none" stroke={line} strokeWidth={2.5} strokeLinejoin="round" />
        </g>
      );
    case "profiler":
      return (
        <g>
          <circle cx={30} cy={35} r={7} fill="none" stroke={eye} strokeWidth={3} />
          <circle cx={30} cy={35} r={2.5} fill={eye} />
          <circle cx={44} cy={35} r={2.5} fill={eye} />
          <path d="M29 47 h14" stroke={line} strokeWidth={3} strokeLinecap="round" />
          {/* scanner sweep */}
          <path d="M22 35 h4 M50 35 h-4" stroke={eye} strokeWidth={2} opacity={0.6} />
        </g>
      );
    case "maniac":
      return (
        <g stroke={eye} strokeWidth={2.5} strokeLinecap="round">
          <g transform="translate(30 35)"><path d="M-4 0 h8 M0 -4 v8 M-3 -3 l6 6 M-3 3 l6 -6" /></g>
          <g transform="translate(44 35)"><path d="M-4 0 h8 M0 -4 v8 M-3 -3 l6 6 M-3 3 l6 -6" /></g>
          <path d="M27 47 l3 -3 l3 3 l3 -3 l3 3 l3 -3" fill="none" stroke="#e9eef5" strokeWidth={2.5} />
        </g>
      );
    case "rock":
      return (
        <g>
          <rect x={26} y={33} width={6} height={6} fill={eye} />
          <rect x={40} y={33} width={6} height={6} fill={eye} />
          <path d="M28 47 h16" stroke={line} strokeWidth={3} strokeLinecap="round" />
          <path d="M22 24 l4 6 M50 26 l-4 5" stroke="#00000055" strokeWidth={2} />
        </g>
      );
    case "folder":
      return (
        <g>
          <path d="M26 37 Q30 32 34 37" fill="none" stroke={eye} strokeWidth={3} strokeLinecap="round" />
          <path d="M38 37 Q42 32 46 37" fill="none" stroke={eye} strokeWidth={3} strokeLinecap="round" />
          <circle cx={36} cy={47} r={2.5} fill={line} />
          <path d="M50 30 q3 5 0 8 q-3 -3 0 -8Z" fill="#8bd8ff" />
        </g>
      );
    default:
      return (
        <g>
          <circle cx={30} cy={35} r={3.5} fill={eye} />
          <circle cx={44} cy={35} r={3.5} fill={eye} />
          <path d="M29 47 h14" stroke={line} strokeWidth={3} strokeLinecap="round" />
        </g>
      );
  }
}

export function Avatar({ kind, size = 48 }: { kind: string; size?: number }) {
  const p = PALETTE[kind] ?? PALETTE.default;
  const gid = `av-${kind}`;
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" className="avatar" aria-label={`${kind} bot`}>
      <defs>
        <radialGradient id={gid} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor={p.face} />
          <stop offset="1" stopColor="#0d1116" />
        </radialGradient>
      </defs>
      <circle cx={36} cy={36} r={34} fill={`url(#${gid})`} stroke={p.ring} strokeWidth={3} />
      {/* antenna */}
      <path d={`M36 20 V12`} stroke={p.ring} strokeWidth={3} strokeLinecap="round" />
      <circle cx={36} cy={10} r={3.5} fill={p.glow} />
      {/* head */}
      <rect x={18} y={20} width={36} height={34} rx={11} fill="#0f151b" stroke={p.ring}
        strokeWidth={2} strokeOpacity={0.7} />
      <Features kind={kind} glow={p.glow} />
    </svg>
  );
}
