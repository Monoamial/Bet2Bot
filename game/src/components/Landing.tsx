// The landing page: what Bet2Bot is, in one screen, with doors into the three tracks.
// Shown on first visit (and via the ♠ logo any time); returning players land on the
// tab they last used.

import { CardView } from "./Card";
import { TableFelt } from "../assets/TableFelt";

const TRACKS = [
  {
    key: "learn" as const,
    icon: "🎓",
    title: "Learn",
    pitch: "Short courses that teach real poker — hand rankings to position to discipline — with quizzes, drills, and live practice hands.",
    cta: "Start learning",
  },
  {
    key: "play" as const,
    icon: "🃏",
    title: "Play",
    pitch: "Sit at the table yourself. Classic Limit, No-Limit with real bet sizing, one-stack Survival, or a full 6-max table of bots.",
    cta: "Pick a game mode",
  },
  {
    key: "campaign" as const,
    icon: "🤖",
    title: "Campaign",
    pitch: "The twist: encode what you learned as a bot — built from blocks, no code — and send it to battle a cast of exploitable characters.",
    cta: "Build your bot",
  },
];

export function Landing({ onEnter }: { onEnter: (view: "learn" | "play" | "campaign") => void }) {
  return (
    <div className="landing">
      <div className="landing-hero">
        <TableFelt />
        <div className="landing-hero-content">
          <div className="landing-cards" aria-hidden>
            <span className="tilt-l"><CardView card="As" /></span>
            <span className="tilt-r"><CardView card="Ah" /></span>
          </div>
          <h1 className="landing-title">
            <span className="logo">♠</span> Bet2Bot
          </h1>
          <p className="landing-tag">
            Learn poker by playing it — then teach a <b>bot</b> to play it for you.
          </p>
          <p className="landing-sub">
            A full poker engine in your browser. No account, no server, no downloads —
            your progress lives on this device.
          </p>
          <button className="landing-go" onClick={() => onEnter("learn")}>
            ▶ Get started
          </button>
        </div>
      </div>

      <div className="landing-tracks">
        {TRACKS.map((t) => (
          <button key={t.key} className="landing-track" onClick={() => onEnter(t.key)}>
            <div className="landing-track-icon">{t.icon}</div>
            <div className="landing-track-title">{t.title}</div>
            <div className="landing-track-pitch">{t.pitch}</div>
            <div className="landing-track-cta">{t.cta} →</div>
          </button>
        ))}
      </div>

      <div className="landing-foot">
        Play → understand → automate. When your bot beats the whole cast, you didn't just
        win — you can explain <i>why</i>.
      </div>
    </div>
  );
}
