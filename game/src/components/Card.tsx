import { CardBackArt, PlayingCard } from "../assets/PlayingCard";

export function CardView({ card, small }: { card: string; small?: boolean }) {
  return <PlayingCard code={card} width={small ? 40 : 60} />;
}

export function CardBack({ small }: { small?: boolean }) {
  return <CardBackArt width={small ? 40 : 60} />;
}
