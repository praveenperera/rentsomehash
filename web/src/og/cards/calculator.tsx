import { GuideCard } from "./guide-card";

interface CalculatorCardProps {
  artSrc: string;
}

export function CalculatorCard({ artSrc }: CalculatorCardProps) {
  return (
    <GuideCard
      route="Calculator"
      eyebrow="Hashpower EV"
      title="Compare renting hashpower with buying bitcoin"
      subtitle="Use live Braiins price, BTC/USD, network difficulty, and OCEAN timing data before funding a bid"
      pills={["LIVE MARKET", "7-DAY DEFAULT", "BTC SPOT"]}
      footerLabel="Expected value, not a forecast"
      renderIllustration={({ height, width }) => (
        <img src={artSrc} width={width} height={height} />
      )}
    />
  );
}
