// The poker table background: a wooden rail around a green felt racetrack, with an
// inner betting line and a faint center emblem. Rendered behind the seats/board.

import { SuitShape } from "./suits";

export function TableFelt() {
  return (
    <svg
      className="table-felt-svg"
      viewBox="0 0 1000 640"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b3f22" />
          <stop offset="0.5" stopColor="#4a2a15" />
          <stop offset="1" stopColor="#331d0e" />
        </linearGradient>
        <radialGradient id="felt" cx="0.5" cy="0.42" r="0.75">
          <stop offset="0" stopColor="#1f7a46" />
          <stop offset="0.6" stopColor="#146536" />
          <stop offset="1" stopColor="#0c4526" />
        </radialGradient>
        <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.55" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.4" />
        </radialGradient>
      </defs>

      {/* wooden rail */}
      <rect x="6" y="6" width="988" height="628" rx="300" fill="url(#rail)"
        stroke="#241207" strokeWidth="4" />
      <rect x="14" y="14" width="972" height="612" rx="292" fill="none"
        stroke="#8a5a34" strokeWidth="2" strokeOpacity="0.6" />

      {/* felt */}
      <rect x="34" y="34" width="932" height="572" rx="270" fill="url(#felt)" />
      <rect x="34" y="34" width="932" height="572" rx="270" fill="url(#vignette)" />

      {/* betting line */}
      <rect x="132" y="118" width="736" height="404" rx="200" fill="none"
        stroke="#eafff1" strokeOpacity="0.16" strokeWidth="3" strokeDasharray="2 14"
        strokeLinecap="round" />

      {/* center emblem */}
      <g transform="translate(500 320)" opacity="0.08">
        <g transform="translate(-70 -96) scale(1.4)" fill="#eafff1">
          <SuitShape suit="s" />
        </g>
        <text x="0" y="150" textAnchor="middle" fontSize="46" fontWeight="800"
          letterSpacing="8" fill="#eafff1" fontFamily="system-ui, sans-serif">
          BET2BOT
        </text>
      </g>
    </svg>
  );
}
