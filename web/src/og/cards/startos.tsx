import { GuideCard } from "./guide-card";

interface StartOsCardProps {
  artSrc: string;
}

export function StartOsCard({ artSrc }: StartOsCardProps) {
  return (
    <GuideCard
      route="Node setup"
      eyebrow="Existing StartOS setup"
      title="StartOS node setup for DATUM"
      subtitle="Reuse your StartOS box, install the right packages, and expose DATUM through Start Tunnel or your router"
      pills={["STARTOS", "DATUM", "START TUNNEL"]}
      footerLabel="Guide 2 of 4"
      renderIllustration={({ height, width }) => (
        <img src={artSrc} width={width} height={height} />
      )}
    />
  );
}
