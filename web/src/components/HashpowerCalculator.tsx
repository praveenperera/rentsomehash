import * as React from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalculatorIcon,
  WarningIcon,
} from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import type { ApiErrorResponse } from "@/lib/generated/hashpower-calculator/ApiErrorResponse";
import type { CalculatorInputs } from "@/lib/generated/hashpower-calculator/CalculatorInputs";
import type { CalculatorResults } from "@/lib/generated/hashpower-calculator/CalculatorResults";
import type { CalculatorWarning } from "@/lib/generated/hashpower-calculator/CalculatorWarning";
import type { HashpowerCalculatorResponse } from "@/lib/generated/hashpower-calculator/HashpowerCalculatorResponse";
import type { MarketSnapshot } from "@/lib/generated/hashpower-calculator/MarketSnapshot";
import type { WarningCode } from "@/lib/generated/hashpower-calculator/WarningCode";
import { cn } from "@/lib/utils";

const DEFAULT_BUDGET_USD = 1_000;
const DEFAULT_DURATION_DAYS = 7;
const DEFAULT_PRICE_SATS_PER_PH_DAY = 44_000;
const BLOCK_SUBSIDY_BTC = 3.125;
const OCEAN_DATUM_POOL_FEE_RATE = 0.01;
const HASHES_PER_EH = 1e18;
const MAX_U32_TARGET = 4_294_967_296;
const SECONDS_PER_DAY = 86_400;
const LOCAL_WARNING_CODES = new Set<WarningCode>([
  "EXPECTED_VALUE_ONLY",
  "SIMPLIFIED_MODEL",
  "LIQUIDITY",
  "OCEAN_TIMING_UNAVAILABLE",
  "SHORT_OCEAN_WINDOW",
]);

type LoadState =
  | { status: "loading"; data: HashpowerCalculatorResponse | null; error: null }
  | { status: "ready"; data: HashpowerCalculatorResponse; error: null }
  | {
      status: "error";
      data: HashpowerCalculatorResponse | null;
      error: string;
    };

export function HashpowerCalculator() {
  const [budgetUsd, setBudgetUsd] = React.useState(DEFAULT_BUDGET_USD);
  const [durationDays, setDurationDays] = React.useState(DEFAULT_DURATION_DAYS);
  const [priceSatsPerPhDay, setPriceSatsPerPhDay] = React.useState<
    number | null
  >(null);
  const [priceTouched, setPriceTouched] = React.useState(false);
  const state = useMarketData(setPriceSatsPerPhDay);

  const marketData = state.data;
  const braiinsBestAskPrice =
    marketData?.market.bestAskSatsPerEhDay !== undefined
      ? marketData.market.bestAskSatsPerEhDay / 1_000
      : (marketData?.inputs.priceSatsPerPhDay ?? DEFAULT_PRICE_SATS_PER_PH_DAY);
  const displayedPrice = priceTouched
    ? (priceSatsPerPhDay ?? braiinsBestAskPrice)
    : braiinsBestAskPrice;
  const data = marketData
    ? calculateBrowserEstimate(marketData, {
        budgetUsd,
        durationDays,
        priceSatsPerPhDay: displayedPrice,
      })
    : null;
  const priceSlider = priceSliderRange(displayedPrice);
  const budgetSliderMax = Math.max(10_000, budgetUsd);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
        <Card className="border-primary/30 bg-card/92">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl tracking-[-0.06em]">
              Adjust the rental inputs
            </CardTitle>
            <CardDescription className="text-sm leading-7">
              Hashpower price starts from the live Braiins best ask. If you edit
              it, the calculator uses your custom sats/PH/day assumption.
              Results are estimates based on current inputs, not a forecast.
            </CardDescription>
          </CardHeader>
          <CalculatorControls
            budgetSliderMax={budgetSliderMax}
            budgetUsd={budgetUsd}
            displayedPrice={displayedPrice}
            durationDays={durationDays}
            priceTouched={priceTouched}
            priceSlider={priceSlider}
            onBudgetChange={setBudgetUsd}
            onDurationChange={setDurationDays}
            onPriceChange={(value) => {
              setPriceTouched(true);
              setPriceSatsPerPhDay(value);
            }}
            onResetPrice={() => {
              setPriceTouched(false);
              setPriceSatsPerPhDay(braiinsBestAskPrice);
            }}
          />
        </Card>

        <div className="space-y-4">
          {state.status === "error" && (
            <Alert variant="destructive">
              <WarningIcon className="size-4" aria-hidden="true" />
              <AlertTitle>Live calculator data unavailable</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {data ? (
            <ResultsGrid data={data} priceModified={priceTouched} />
          ) : (
            <LoadingGrid />
          )}
        </div>
      </div>

      {data && (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <OceanTimingCard data={data} />
          <WarningsCard data={data} />
        </div>
      )}
    </div>
  );
}

function useMarketData(setDefaultPrice: (value: number) => void) {
  const [state, setState] = React.useState<LoadState>({
    status: "loading",
    data: null,
    error: null,
  });

  React.useEffect(() => {
    const controller = new AbortController();
    void loadMarketData(controller.signal)
      .then((data) => {
        setState({ status: "ready", data, error: null });
        setDefaultPrice(data.inputs.priceSatsPerPhDay);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setState((current) => ({
          status: "error",
          data: current.data,
          error:
            error instanceof Error
              ? error.message
              : "Calculator data unavailable",
        }));
      });

    return () => {
      controller.abort();
    };
  }, [setDefaultPrice]);

  return state;
}

function CalculatorControls({
  budgetSliderMax,
  budgetUsd,
  displayedPrice,
  durationDays,
  priceTouched,
  priceSlider,
  onBudgetChange,
  onDurationChange,
  onPriceChange,
  onResetPrice,
}: {
  budgetSliderMax: number;
  budgetUsd: number;
  displayedPrice: number;
  durationDays: number;
  priceTouched: boolean;
  priceSlider: { min: number; max: number };
  onBudgetChange: (value: number) => void;
  onDurationChange: (value: number) => void;
  onPriceChange: (value: number) => void;
  onResetPrice: () => void;
}) {
  return (
    <CardContent className="space-y-6">
      <NumberSlider
        label="Budget"
        value={budgetUsd}
        min={100}
        max={budgetSliderMax}
        step={50}
        suffix="USD"
        prefix="$"
        onChange={onBudgetChange}
      />
      <NumberSlider
        label="Duration"
        value={durationDays}
        min={1}
        max={30}
        step={1}
        suffix="days"
        onChange={onDurationChange}
      />
      <NumberSlider
        label="Braiins price"
        value={displayedPrice}
        modified={priceTouched}
        min={priceSlider.min}
        max={priceSlider.max}
        step={10}
        suffix="sats/PH/day"
        onChange={onPriceChange}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-6 text-muted-foreground">
          Price defaults to the current Braiins best ask. The spot comparison
          uses the current BTC/USD price.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!priceTouched}
          onClick={onResetPrice}
        >
          Reset to best ask
        </Button>
      </div>
    </CardContent>
  );
}

function NumberSlider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  prefix = "",
  modified = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  prefix?: string;
  modified?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label
      className={cn(
        "block space-y-3 border border-transparent p-3 transition-colors",
        modified &&
          "border-primary/50 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]",
      )}
    >
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="block text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            {label}
          </span>
          <span className="block font-mono text-sm text-foreground/78">
            {prefix}
            {formatCompact(value)} {suffix}
          </span>
        </div>
        <Input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={Math.max(max, value)}
          step={step}
          onChange={(event) =>
            onChange(Number.parseFloat(event.currentTarget.value || "0"))
          }
          className="w-36 text-right font-mono"
        />
      </div>
      <Slider
        value={[clamp(value, min, max)]}
        min={min}
        max={max}
        step={step}
        onValueChange={(nextValue) => onChange(sliderValue(nextValue, value))}
      />
    </label>
  );
}

function ResultsGrid({
  data,
  priceModified,
}: {
  data: HashpowerCalculatorResponse;
  priceModified: boolean;
}) {
  const deltaPositive = data.results.deltaPct >= 0;
  const deltaDescription =
    data.results.deltaPct < 0
      ? "Negative means the estimate returns less BTC than buying spot"
      : "Positive means the estimate returns more BTC than buying spot";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <MetricCard
        eyebrow="Rented speed"
        title={`${formatNumber(data.results.hashratePh, 2)} PH/s`}
        description={`${formatNumber(data.results.hashrateEh, 5)} EH/s for ${formatNumber(data.inputs.durationDays, 0)} days`}
      />
      <MetricCard
        eyebrow="Expected mined"
        title={`${formatBtc(data.results.expectedMinedBtc)} BTC`}
        description={
          data.market.oceanAverageBlockTxFeesBtc === null
            ? "Estimated after 1% OCEAN DATUM fee, subsidy-only"
            : "Estimated with recent tx fees and 1% OCEAN DATUM fee"
        }
        detail={
          <RewardBreakdown
            averageTxFeesBtc={data.market.oceanAverageBlockTxFeesBtc}
          />
        }
      />
      <MetricCard
        eyebrow="Buying spot"
        title={`${formatBtc(data.results.buyBtc)} BTC`}
        description={`At $${formatNumber(data.market.btcUsd, 0)} per BTC`}
      />
      <MetricCard
        eyebrow="Expected difference"
        modified={priceModified}
        title={
          <span
            className={cn(
              "inline-flex items-center gap-2",
              deltaPositive ? "text-primary" : "text-destructive",
            )}
          >
            {deltaPositive ? (
              <ArrowUpIcon className="size-5" aria-hidden="true" />
            ) : (
              <ArrowDownIcon className="size-5" aria-hidden="true" />
            )}
            {formatSignedPercent(data.results.deltaPct)}
          </span>
        }
        description={deltaDescription}
      />
    </div>
  );
}

function MetricCard({
  eyebrow,
  title,
  description,
  modified = false,
  detail,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  modified?: boolean;
  detail?: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "bg-card/86 transition-colors",
        modified &&
          "border-primary/50 bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.12)]",
      )}
    >
      <CardHeader className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </p>
        <CardTitle className="text-2xl tracking-[-0.08em]">{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
        {detail}
      </CardHeader>
    </Card>
  );
}

function RewardBreakdown({
  averageTxFeesBtc,
}: {
  averageTxFeesBtc: number | null;
}) {
  return (
    <p className="font-mono text-[10px] leading-4 text-muted-foreground/70">
      3.125 subsidy
      {averageTxFeesBtc === null
        ? " + unavailable tx fees"
        : ` + ${formatBtc(averageTxFeesBtc)} avg tx fees`}
      {" - 1% OCEAN fee"}
    </p>
  );
}

function OceanTimingCard({ data }: { data: HashpowerCalculatorResponse }) {
  return (
    <Card className="bg-card/86">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg tracking-[-0.06em]">
          <CalculatorIcon className="size-5 text-primary" aria-hidden="true" />
          OCEAN payout timing context
        </CardTitle>
        <CardDescription className="text-sm leading-7">
          OCEAN pool hashrate affects payout-event frequency, not the core
          expected-value math.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <TimingItem
            label="OCEAN hashrate"
            value={
              data.market.oceanHashrateEh
                ? `${formatNumber(data.market.oceanHashrateEh, 2)} EH/s`
                : "Unavailable"
            }
          />
          <TimingItem
            label="Average time to block"
            value={
              data.market.oceanAverageTimeToBlockHours
                ? `${formatNumber(data.market.oceanAverageTimeToBlockHours, 1)} hours`
                : "Unavailable"
            }
          />
          <TimingItem
            label="Expected OCEAN blocks"
            value={
              data.results.expectedOceanBlocks
                ? formatNumber(data.results.expectedOceanBlocks, 2)
                : "Unavailable"
            }
          />
          <TimingItem
            label="Chance of 2+ pool blocks"
            value={
              data.results.probabilityAtLeastTwoOceanBlocks
                ? formatPercent(data.results.probabilityAtLeastTwoOceanBlocks)
                : "Unavailable"
            }
          />
          <TimingItem
            label="Avg tx fees / block"
            value={
              data.market.oceanAverageBlockTxFeesBtc
                ? `${formatBtc(data.market.oceanAverageBlockTxFeesBtc)} BTC`
                : "Unavailable"
            }
          />
          <TimingItem
            label="Fee estimate source"
            value={
              data.market.oceanBlockFeeSampleSize > 0
                ? `${formatNumber(data.market.oceanBlockFeeSampleSize, 0)} recent OCEAN blocks`
                : "Unavailable"
            }
          />
        </dl>
      </CardContent>
    </Card>
  );
}

function TimingItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 border border-border/70 bg-background/50 p-3">
      <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="font-mono text-sm text-foreground/84">{value}</dd>
    </div>
  );
}

function WarningsCard({ data }: { data: HashpowerCalculatorResponse }) {
  return (
    <Card className="bg-card/86">
      <CardHeader>
        <CardTitle className="text-lg tracking-[-0.06em]">
          Model notes
        </CardTitle>
        <CardDescription className="text-sm leading-7">
          Estimate generated from market data fetched at{" "}
          {new Date(data.market.fetchedAt * 1_000).toLocaleString()}. Treat this
          as a rough comparison, not a mining forecast.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.warnings.map((warning) => (
          <Alert key={warning.code} className="bg-background/50">
            <WarningIcon className="size-4 text-primary" aria-hidden="true" />
            <AlertTitle>{warningLabel(warning.code)}</AlertTitle>
            <AlertDescription>{warning.message}</AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className="bg-card/86">
          <CardHeader className="space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

async function loadMarketData(signal: AbortSignal) {
  const response = await fetch("/api/hashpower-calculator", {
    signal,
  });
  const body = (await response.json()) as
    | HashpowerCalculatorResponse
    | ApiErrorResponse;

  if (!response.ok) {
    throw new Error(
      "error" in body ? body.error.message : "Calculator data unavailable",
    );
  }

  return body as HashpowerCalculatorResponse;
}

function calculateBrowserEstimate(
  marketData: HashpowerCalculatorResponse,
  inputs: CalculatorInputs,
): HashpowerCalculatorResponse {
  const results = calculateResults(marketData.market, inputs);
  const warnings = uniqueWarnings([
    ...localWarnings(marketData.market, inputs, results),
    ...marketData.warnings.filter(
      (warning) => !LOCAL_WARNING_CODES.has(warning.code),
    ),
  ]);

  return {
    ...marketData,
    inputs,
    results,
    warnings,
  };
}

function calculateResults(
  market: MarketSnapshot,
  inputs: CalculatorInputs,
): CalculatorResults {
  const budgetBtc = inputs.budgetUsd / market.btcUsd;
  const buyBtc = budgetBtc;
  const priceBtcPerEhDay = (inputs.priceSatsPerPhDay * 1_000) / 100_000_000;
  const hashrateEh = budgetBtc / (priceBtcPerEhDay * inputs.durationDays);
  const hashratePh = hashrateEh * 1_000;
  const expectedNetworkBlocks =
    (hashrateEh * HASHES_PER_EH * inputs.durationDays * SECONDS_PER_DAY) /
    (market.difficulty * MAX_U32_TARGET);
  const grossBlockRewardBtc =
    BLOCK_SUBSIDY_BTC + (market.oceanAverageBlockTxFeesBtc ?? 0);
  const expectedMinedBtc =
    expectedNetworkBlocks *
    grossBlockRewardBtc *
    (1 - OCEAN_DATUM_POOL_FEE_RATE);
  const deltaPct = (expectedMinedBtc / buyBtc - 1) * 100;
  const expectedOceanBlocks = market.oceanAverageTimeToBlockHours
    ? (inputs.durationDays * 24) / market.oceanAverageTimeToBlockHours
    : null;

  return {
    budgetBtc,
    buyBtc,
    hashratePh,
    hashrateEh,
    expectedNetworkBlocks,
    expectedMinedBtc,
    deltaPct,
    expectedOceanBlocks,
    probabilityAtLeastOneOceanBlock:
      expectedOceanBlocks === null
        ? null
        : probabilityAtLeastOne(expectedOceanBlocks),
    probabilityAtLeastTwoOceanBlocks:
      expectedOceanBlocks === null
        ? null
        : probabilityAtLeastTwo(expectedOceanBlocks),
  };
}

function localWarnings(
  market: MarketSnapshot,
  inputs: CalculatorInputs,
  results: CalculatorResults,
): CalculatorWarning[] {
  const warnings: CalculatorWarning[] = [
    {
      code: "EXPECTED_VALUE_ONLY",
      message:
        "This is expected value, not a forecast. Actual mining results can vary heavily.",
    },
    {
      code: "SIMPLIFIED_MODEL",
      message: modelWarning(market),
    },
  ];

  if (exceedsTopAskLiquidity(market, inputs, results)) {
    warnings.push({
      code: "LIQUIDITY",
      message:
        "The requested hashrate exceeds top ask liquidity at the best-ask price, so the flat-price estimate may be too optimistic.",
    });
  }

  if (results.expectedOceanBlocks === null) {
    warnings.push({
      code: "OCEAN_TIMING_UNAVAILABLE",
      message:
        "OCEAN payout timing data is unavailable, so only the core expected-value estimate is shown.",
    });
  }

  if (results.expectedOceanBlocks !== null && results.expectedOceanBlocks < 2) {
    warnings.push({
      code: "SHORT_OCEAN_WINDOW",
      message:
        "The selected window has fewer than two expected OCEAN pool blocks at the current pool hashrate.",
    });
  }

  return warnings;
}

function modelWarning(market: MarketSnapshot) {
  if (market.oceanAverageBlockTxFeesBtc !== null) {
    return `This estimate uses a recent OCEAN block transaction-fee average of ${formatBtc(market.oceanAverageBlockTxFeesBtc)} BTC per block, applies OCEAN's 1% DATUM pool fee, and ignores future difficulty changes, fee changes, bid slippage, exact OCEAN TIDES payout accounting, and mining variance.`;
  }

  return "Recent OCEAN block transaction-fee data is unavailable, so this estimate uses subsidy only, applies OCEAN's 1% DATUM pool fee, and ignores future difficulty changes, fee changes, bid slippage, exact OCEAN TIDES payout accounting, and mining variance.";
}

function exceedsTopAskLiquidity(
  market: MarketSnapshot,
  inputs: CalculatorInputs,
  results: CalculatorResults,
) {
  if (market.topAskHashratePh === null) {
    return false;
  }

  const defaultPrice = market.bestAskSatsPerEhDay / 1_000;
  return (
    results.hashratePh > market.topAskHashratePh &&
    Math.abs(inputs.priceSatsPerPhDay - defaultPrice) < 0.000_001
  );
}

function probabilityAtLeastOne(lambda: number) {
  return 1 - Math.exp(-lambda);
}

function probabilityAtLeastTwo(lambda: number) {
  return 1 - Math.exp(-lambda) * (1 + lambda);
}

function uniqueWarnings(warnings: CalculatorWarning[]) {
  const seen = new Set<WarningCode>();
  return warnings.filter((warning) => {
    if (seen.has(warning.code)) {
      return false;
    }

    seen.add(warning.code);
    return true;
  });
}

function priceSliderRange(price: number) {
  return {
    min: Math.max(1, Math.floor(price * 0.5)),
    max: Math.max(1_000, Math.ceil(price * 1.5)),
  };
}

function sliderValue(value: number | readonly number[], fallback: number) {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value;
}

function warningLabel(code: string) {
  return code
    .split("_")
    .map((part) => part.toLowerCase())
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 10 ? 2 : 0,
  }).format(value);
}

function formatNumber(value: number, maximumFractionDigits: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(
    value,
  );
}

function formatBtc(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 8,
    minimumFractionDigits: 8,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function formatSignedPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    signDisplay: "always",
    style: "percent",
  }).format(value / 100);
}
