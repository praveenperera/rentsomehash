import { GuideCard } from "./guide-card";

interface StartOsCardProps {
  artSrc: string;
}

export function StartOsCard({ artSrc }: StartOsCardProps) {
  return (
    <GuideCard
      route="Home node route"
      eyebrow="Existing StartOS setup"
      title="StartOS route with Start Tunnel"
      subtitle="Reuse your StartOS box, install the right packages, and route Braiins through Start Tunnel instead of rebuilding on a fresh VPS"
      pills={["STARTOS", "START TUNNEL", "BRAIINS"]}
      footerLabel="Guide 2 of 3"
      renderIllustration={({ height, width }) => (
        <img src={artSrc} width={width} height={height} />
      )}
    />
  );
}
