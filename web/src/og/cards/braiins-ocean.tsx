import { GuideCard } from "./guide-card";

interface BraiinsOceanCardProps {
  artSrc: string;
}

export function BraiinsOceanCard({ artSrc }: BraiinsOceanCardProps) {
  return (
    <GuideCard
      route="Braiins setup"
      eyebrow="Shared Braiins setup"
      title="Braiins hashpower setup for DATUM and OCEAN"
      subtitle="Once your node is ready, create the account, fund it, and point the bid at your DATUM endpoint"
      pills={["BRAIINS", "FUND ACCOUNT", "CREATE BID"]}
      footerLabel="Guide 4 of 4"
      renderIllustration={({ height, width }) => (
        <img src={artSrc} width={width} height={height} />
      )}
    />
  );
}
