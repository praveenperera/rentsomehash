import { GuideCard } from "./guide-card";

interface UmbrelCardProps {
  artSrc: string;
}

export function UmbrelCard({ artSrc }: UmbrelCardProps) {
  return (
    <GuideCard
      route="Node setup"
      eyebrow="Existing Umbrel setup"
      title="Umbrel node setup for DATUM"
      subtitle="Reuse your Umbrel box, install Bitcoin Knots and DATUM, then expose port 23334 so Braiins can reach it"
      pills={["UMBREL", "DATUM", "PORT 23334"]}
      footerLabel="Guide 3 of 4"
      renderIllustration={({ height, width }) => (
        <img src={artSrc} width={width} height={height} />
      )}
    />
  );
}
