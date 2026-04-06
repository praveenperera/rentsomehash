import { GuideCard } from "./guide-card";

interface VpsCardProps {
  artSrc: string;
}

export function VpsCard({ artSrc }: VpsCardProps) {
  return (
    <GuideCard
      route="Node setup"
      eyebrow="Fresh VPS setup"
      title="Fresh VPS node setup for DATUM"
      subtitle="Rent a Linux VPS, install the combined node and DATUM box, wait for sync, then carry that endpoint into Braiins"
      pills={["LINUX VPS", "NODE + DATUM", "PORT 23334"]}
      footerLabel="Guide 1 of 4"
      renderIllustration={({ height, width }) => (
        <img src={artSrc} width={width} height={height} />
      )}
    />
  );
}
