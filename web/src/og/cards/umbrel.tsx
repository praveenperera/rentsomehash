import { GuideCard } from "./guide-card";

interface UmbrelCardProps {
  artSrc: string;
}

export function UmbrelCard({ artSrc }: UmbrelCardProps) {
  return (
    <GuideCard
      route="Home node route"
      eyebrow="Existing Umbrel setup"
      title="Umbrel route with port forwarding"
      subtitle="Reuse your Umbrel box, install Bitcoin Knots and DATUM, then forward port 23334 so Braiins can reach it"
      pills={["UMBREL", "PORT 23334", "BRAIINS"]}
      footerLabel="Guide 3 of 3"
      renderIllustration={({ height, width }) => (
        <img src={artSrc} width={width} height={height} />
      )}
    />
  );
}
