import * as React from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalculatorIcon,
  WarningIcon,
} from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import type { HashpowerCalculatorResponse } from "@/lib/generated/hashpower-calculator/HashpowerCalculatorResponse";
import { cn } from "@/lib/utils";

const DEFAULT_BUDGET_USD = 1_000;
const DEFAULT_DURATION_DAYS = 7;
const DEFAULT_PRICE_SATS_PER_PH_DAY = 44_000;
const DEBOUNCE_MS = 250;

type LoadState =
  | { status: "loading"; data: HashpowerCalculatorResponse | null; error: null }
  | { status: "ready"; data: HashpowerCalculatorResponse; error: null }
  | {
      status: "error";
      data: HashpowerCalculatorResponse | null;
      error: string;
    };

type CalculatorRequest = {
  budgetUsd: number;
  durationDays: number;
  priceSatsPerPhDay: number | null;
};

export function HashpowerCalculator() {
  const [budgetUsd, setBudgetUsd] = React.useState(DEFAULT_BUDGET_USD);
  const [durationDays, setDurationDays] = React.useState(DEFAULT_DURATION_DAYS);
  const [priceSatsPerPhDay, setPriceSatsPerPhDay] = React.useState<
    number | null
  >(null);
  const [priceTouched, setPriceTouched] = React.useState(false);
  const state = useCalculatorData({
    budgetUsd,
    durationDays,
    priceSatsPerPhDay: priceTouched ? priceSatsPerPhDay : null,
    priceTouched,
    setDefaultPrice: setPriceSatsPerPhDay,
  });

  const data = state.data;
  const braiinsBestAskPrice =
    data?.market.bestAskSatsPerEhDay !== undefined
      ? data.market.bestAskSatsPerEhDay / 1_000
      : (data?.inputs.priceSatsPerPhDay ?? DEFAULT_PRICE_SATS_PER_PH_DAY);
  const displayedPrice = priceTouched
    ? (priceSatsPerPhDay ?? braiinsBestAskPrice)
    : braiinsBestAskPrice;
  const priceSlider = priceSliderRange(displayedPrice);
  const budgetSliderMax = Math.max(10_000, budgetUsd);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
        <Card className="border-primary/30 bg-card/92">
          <CardHeader className="space-y-2">
            <Badge
              variant="outline"
              className="w-fit border-primary/25 bg-primary/10 text-primary"
            >
              7-day default
            </Badge>
            <CardTitle className="text-xl tracking-[-0.06em]">
              Adjust the rental inputs
            </CardTitle>
            <CardDescription className="text-sm leading-7">
              Hashpower price starts from the live Braiins best ask. If you edit
              it, the Worker uses your custom sats/PH/day assumption.
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

          {data ? <ResultsGrid data={data} /> : <LoadingGrid />}
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

function useCalculatorData({
  budgetUsd,
  durationDays,
  priceSatsPerPhDay,
  priceTouched,
  setDefaultPrice,
}: CalculatorRequest & {
  priceTouched: boolean;
  setDefaultPrice: (value: number) => void;
}) {
  const [state, setState] = React.useState<LoadState>({
    status: "loading",
    data: null,
    error: null,
  });

  React.useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      void loadCalculatorData({
        budgetUsd,
        durationDays,
        priceSatsPerPhDay,
        signal: controller.signal,
      })
        .then((data) => {
          setState({ status: "ready", data, error: null });
          if (!priceTouched) {
            setDefaultPrice(data.inputs.priceSatsPerPhDay);
          }
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
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [
    budgetUsd,
    durationDays,
    priceSatsPerPhDay,
    priceTouched,
    setDefaultPrice,
  ]);

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
        min={priceSlider.min}
        max={priceSlider.max}
        step={10}
        suffix="sats/PH/day"
        onChange={onPriceChange}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-6 text-muted-foreground">
          Price defaults to the current Braiins best ask. The spot comparison
          uses live BTC/USD from the same Worker response.
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
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  prefix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-3">
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

function ResultsGrid({ data }: { data: HashpowerCalculatorResponse }) {
  const deltaPositive = data.results.deltaPct >= 0;

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
        description="Subsidy-only expected value"
      />
      <MetricCard
        eyebrow="Buying spot"
        title={`${formatBtc(data.results.buyBtc)} BTC`}
        description={`At $${formatNumber(data.market.btcUsd, 0)} per BTC`}
      />
      <MetricCard
        eyebrow="Expected difference"
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
        description="Positive means the hashpower estimate returns more BTC than buying spot"
      />
    </div>
  );
}

function MetricCard({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
}) {
  return (
    <Card className="bg-card/86">
      <CardHeader className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {eyebrow}
        </p>
        <CardTitle className="text-2xl tracking-[-0.08em]">{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
    </Card>
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
          Market data fetched at{" "}
          {new Date(data.market.fetchedAt * 1_000).toLocaleString()}.
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

async function loadCalculatorData({
  budgetUsd,
  durationDays,
  priceSatsPerPhDay,
  signal,
}: {
  budgetUsd: number;
  durationDays: number;
  priceSatsPerPhDay: number | null;
  signal: AbortSignal;
}) {
  const params = new URLSearchParams({
    budget_usd: String(budgetUsd),
    duration_days: String(durationDays),
  });

  if (priceSatsPerPhDay !== null) {
    params.set("price_sats_per_ph_day", String(priceSatsPerPhDay));
  }

  const response = await fetch(`/api/hashpower-calculator?${params}`, {
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
