import { GuideCard } from "./guide-card";

interface BraiinsOceanCardProps {
  artSrc: string;
}

export function BraiinsOceanCard({ artSrc }: BraiinsOceanCardProps) {
  return (
    <GuideCard
      route="Main route"
      eyebrow="Fresh VPS workflow"
      title="Braiins to OCEAN on a fresh DATUM box"
      subtitle="Rent a Linux VPS and install the combined node and DATUM box. Wait for sync, then point Braiins hashpower at it"
      pills={["LINUX VPS", "NODE + DATUM", "BRAIINS BID"]}
      footerLabel="Guide 1 of 3"
      renderIllustration={({ height, width }) => (
        <img src={artSrc} width={width} height={height} />
      )}
    />
  );
}
