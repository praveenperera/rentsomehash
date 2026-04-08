import * as React from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalculatorIcon,
  QuestionIcon,
  WarningIcon,
} from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ApiErrorResponse } from "@/lib/generated/hashpower-calculator/ApiErrorResponse";
import type { CalculatorInputs } from "@/lib/generated/hashpower-calculator/CalculatorInputs";
import type { CalculatorResults } from "@/lib/generated/hashpower-calculator/CalculatorResults";
import type { CalculatorWarning } from "@/lib/generated/hashpower-calculator/CalculatorWarning";
import type { HashpowerCalculatorResponse } from "@/lib/generated/hashpower-calculator/HashpowerCalculatorResponse";
import type { MarketSnapshot } from "@/lib/generated/hashpower-calculator/MarketSnapshot";
import type { WarningCode } from "@/lib/generated/hashpower-calculator/WarningCode";
import { cn } from "@/lib/utils";

const DEFAULT_BUDGET_USD = 1_000;
const DEFAULT_DURATION_DAYS = 30;
const DEFAULT_PRICE_SATS_PER_PH_DAY = 44_000;
const MIN_DURATION_DAYS = 7;
const MAX_DURATION_DAYS = 360;
const MAX_BUDGET_USD = 100_000;
const BRAIINS_PRICE_STEP = 10;
const BLOCK_SUBSIDY_BTC = 3.125;
const OCEAN_DATUM_POOL_FEE_RATE = 0.01;
const HASHES_PER_EH = 1e18;
const MAX_U32_TARGET = 4_294_967_296;
const SECONDS_PER_DAY = 86_400;
const MARKET_DATA_CACHE_KEY = "hashpower-calculator:market-data:v1";
const MARKET_DATA_CACHE_TTL_MS = 120_000;
const LOCAL_WARNING_CODES = new Set<WarningCode>([
  "EXPECTED_VALUE_ONLY",
  "SIMPLIFIED_MODEL",
  "LIQUIDITY",
  "OCEAN_TIMING_UNAVAILABLE",
  "SHORT_OCEAN_WINDOW",
]);
const FAQ_ITEMS = [
  {
    question: "Is this a forecast?",
    answer:
      "No. It is an expected-value comparison using current inputs and current market data. Actual mining results can land above or below the estimate.",
  },
  {
    question: "Why might I earn less than expected?",
    answer:
      "This is an estimate, not a promise. The numbers use recent OCEAN block fees minus the 1% DATUM fee, but the real world does not care about our math. Difficulty jumps, fee crashes, bid slippage, and mining variance can all swing your actual payout up or down. Hash rental prices will also shift during that period. Shorter windows get hit harder by block variance.",
  },
  {
    question: "What does one fewer block impact mean?",
    answer:
      "This percentage shows how sensitive your estimate is to variance. At current OCEAN hashrate, a 7-day rental expects ~15 blocks. Miss one and your payout drops ~6.5% below estimate. A 30-day rental expects ~65 blocks — miss one and you are only down ~1.5%. Longer rentals smooth out block variance.",
  },
  {
    question: "Why is 30 days the default duration?",
    answer:
      "30 days hits a sweet spot — long enough for OCEAN to find ~65 blocks, which smooths out variance. Miss one block and you are only down ~1.5% vs ~6.5% over 7 days (~15 blocks). Shorter rentals mean each missed block stings more.",
  },
  {
    question: "How are average transaction fees calculated?",
    answer:
      "We grab up to 12 recent OCEAN blocks and pull the fee data from mempool.space for each. Add up the fees per block, take the average, then add that to the 3.125 BTC subsidy. Then we knock off 1% for OCEAN's DATUM fee. No fee data available? We fall back to subsidy-only.",
  },
  {
    question: "Why compare against buying spot BTC?",
    answer:
      "Buying spot is the clean baseline for the same budget. The calculator shows whether the current rental assumptions are expected to return more or less BTC than simply buying bitcoin outright.",
  },
] as const;
const DEFAULT_FAQ_ITEM_ID = faqItemId(FAQ_ITEMS[0].question);
const FAQ_ITEM_IDS = new Set<string>(
  FAQ_ITEMS.map((item) => faqItemId(item.question)),
);

type LoadState =
  | { status: "loading"; data: HashpowerCalculatorResponse | null; error: null }
  | { status: "ready"; data: HashpowerCalculatorResponse; error: null }
  | {
      status: "error";
      data: HashpowerCalculatorResponse | null;
      error: string;
    };

type StoredMarketData = {
  body: HashpowerCalculatorResponse;
  etag: string | null;
  savedAt: number;
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
  const marketDefaultPrice =
    marketData?.market.defaultPriceSatsPerEhDay !== undefined
      ? marketData.market.defaultPriceSatsPerEhDay / 1_000
      : (marketData?.inputs.priceSatsPerPhDay ?? DEFAULT_PRICE_SATS_PER_PH_DAY);
  const displayedPrice = priceTouched
    ? (priceSatsPerPhDay ?? marketDefaultPrice)
    : marketDefaultPrice;
  const data = marketData
    ? calculateBrowserEstimate(marketData, {
        budgetUsd,
        durationDays,
        priceSatsPerPhDay: displayedPrice,
      })
    : null;
  const isLoading = state.status === "loading";
  const priceSlider = priceSliderRange(displayedPrice);

  return (
    <div className="space-y-4">
      {state.status === "error" && (
        <Alert variant="destructive">
          <WarningIcon className="size-4" aria-hidden="true" />
          <AlertTitle>Live calculator data unavailable</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary/30 bg-card/92 h-full">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl tracking-[-0.06em]">
              Adjust the rental inputs
            </CardTitle>
            <CardDescription className="text-sm leading-7">
              Hashpower price starts from the lowest live Braiins ask with
              available hash. If no ask currently has available hash, it falls
              back to the Braiins last average price. If you edit it, the
              calculator uses your custom sats/PH/day assumption. Results are
              estimates based on current inputs, not a forecast. Longer
              durations spread pool block variance across more expected blocks.
            </CardDescription>
          </CardHeader>
          <CalculatorControls
            budgetUsd={budgetUsd}
            displayedPrice={displayedPrice}
            durationDays={durationDays}
            priceTouched={priceTouched}
            priceSlider={priceSlider}
            onBudgetChange={(value) =>
              setBudgetUsd(clamp(value, 100, MAX_BUDGET_USD))
            }
            onDurationChange={(value) =>
              setDurationDays(
                clamp(value, MIN_DURATION_DAYS, MAX_DURATION_DAYS),
              )
            }
            onPriceChange={(value) => {
              setPriceTouched(true);
              setPriceSatsPerPhDay(value);
            }}
            onResetPrice={() => {
              setPriceTouched(false);
              setPriceSatsPerPhDay(marketDefaultPrice);
            }}
          />
        </Card>

        {data ? (
          <div className="grid gap-4 md:grid-cols-2">
            <ResultsGrid data={data} priceModified={priceTouched} />
          </div>
        ) : isLoading ? (
          <Card className="bg-card/86 h-full">
            <CardHeader className="space-y-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
          </Card>
        ) : (
          <UnavailableCard
            title="Estimate unavailable"
            description="Live market data could not be loaded, so the estimate cannot be shown right now"
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr] lg:items-stretch">
        {data ? (
          <OceanTimingCard data={data} />
        ) : isLoading ? (
          <Card className="bg-card/86 h-full">
            <CardHeader className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className="space-y-1 border border-border/70 bg-background/50 p-3"
                  >
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <UnavailableCard
            title="Timing unavailable"
            description="OCEAN timing and warning details are unavailable until live market data loads again"
          />
        )}

        {data && <WarningsCard data={data} />}
      </div>

      <div className="pt-2">
        <CalculatorFaqCard />
      </div>
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
        max={MAX_BUDGET_USD}
        step={50}
        suffix="USD"
        prefix="$"
        onChange={onBudgetChange}
      />
      <NumberSlider
        label="Duration"
        value={durationDays}
        min={MIN_DURATION_DAYS}
        max={MAX_DURATION_DAYS}
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
        step={BRAIINS_PRICE_STEP}
        suffix="sats/PH/day"
        onChange={onPriceChange}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-6 text-muted-foreground">
          Price defaults to the lowest live Braiins ask with available hash,
          otherwise the last average Braiins price. The spot comparison uses the
          current BTC/USD price.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!priceTouched}
          onClick={onResetPrice}
        >
          Reset to default price
        </Button>
      </div>
    </CardContent>
  );
}

function UnavailableCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="bg-card/86 h-full">
      <CardHeader className="space-y-3">
        <CardTitle className="text-lg tracking-[-0.04em]">{title}</CardTitle>
        <CardDescription className="text-sm leading-7">
          {description}
        </CardDescription>
      </CardHeader>
    </Card>
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
          onChange={(event) => {
            const nextValue = event.currentTarget.value;
            const parsed = Number.parseFloat(nextValue);
            if (!nextValue.trim() || !Number.isFinite(parsed)) {
              return;
            }

            onChange(parsed);
          }}
          className="w-36 pr-1.5 text-right font-mono [&::-webkit-inner-spin-button]:ml-2"
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
  const totalBtcDelta = data.results.expectedMinedBtc - data.results.budgetBtc;
  const totalUsdDelta = totalBtcDelta * data.market.btcUsd;

  return (
    <>
      <MetricCard
        eyebrow="Rented speed"
        title={`${formatNumber(data.results.hashratePh, 2)} PH/s`}
        description={`${formatNumber(data.results.hashrateEh, 5)} EH/s for ${formatNumber(data.inputs.durationDays, 0)} days`}
      />
      <MetricCard
        eyebrow="Expected mined"
        title={`${formatBtc(data.results.expectedMinedBtc)} BTC`}
        description={
          <span className="inline-flex items-center gap-1.5">
            {data.market.oceanAverageBlockTxFeesBtc === null
              ? "Estimated after 1% OCEAN DATUM fee, subsidy-only"
              : "Estimated with recent tx fees and 1% OCEAN DATUM fee"}
            <Tooltip>
              <TooltipTrigger
                aria-label="Show reward breakdown"
                className="text-muted-foreground hover:text-foreground"
              >
                <QuestionIcon className="size-4" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>
                <RewardBreakdownTooltip
                  averageTxFeesBtc={data.market.oceanAverageBlockTxFeesBtc}
                />
              </TooltipContent>
            </Tooltip>
          </span>
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
        detail={
          <div className="mt-2 border-t border-border/70 pt-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {deltaPositive ? "Total gain" : "Total loss"}
            </p>
            <p
              className={cn(
                "text-xl tracking-[-0.06em]",
                deltaPositive ? "text-primary" : "text-destructive",
              )}
            >
              {formatSignedUsd(totalUsdDelta)}
            </p>
            <p
              className={cn(
                "font-mono text-sm",
                deltaPositive ? "text-primary/78" : "text-destructive/78",
              )}
            >
              {formatSignedBtc(totalBtcDelta)} BTC
            </p>
          </div>
        }
      />
    </>
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
  description: React.ReactNode;
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

function RewardBreakdownTooltip({
  averageTxFeesBtc,
}: {
  averageTxFeesBtc: number | null;
}) {
  return (
    <div className="font-mono text-xs">
      <div>3.125 subsidy</div>
      {averageTxFeesBtc === null ? (
        <div className="text-muted-foreground">+ unavailable tx fees</div>
      ) : (
        <div>+ {formatBtc(averageTxFeesBtc)} avg tx fees</div>
      )}
      <div>- 1% OCEAN fee</div>
    </div>
  );
}

function OceanTimingCard({ data }: { data: HashpowerCalculatorResponse }) {
  return (
    <Card className="bg-card/86 h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg tracking-[-0.06em]">
          <CalculatorIcon className="size-5 text-primary" aria-hidden="true" />
          OCEAN payout timing context
        </CardTitle>
        <CardDescription className="text-sm leading-7">
          OCEAN pool hashrate affects payout-event frequency, not the core
          expected-value math. Shorter windows can land materially below the
          expected value if OCEAN finds fewer blocks than expected.
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
            label={
              <span className="inline-flex items-center gap-1.5">
                One fewer block impact
                <Tooltip>
                  <TooltipTrigger
                    aria-label="Explain one fewer block impact"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <QuestionIcon className="size-4" aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent>
                    This percentage shows how sensitive your estimate is to
                    variance. Over 7 days, missing 1 block from 14 expected
                    would cost you ~7%. Over 30 days, missing 1 from 60 expected
                    is only ~1.7%. Longer rentals smooth out block variance.
                  </TooltipContent>
                </Tooltip>
              </span>
            }
            value={
              data.results.oneOceanBlockShortfallPct
                ? formatPercentFromPct(data.results.oneOceanBlockShortfallPct)
                : "Unavailable"
            }
          />
          <TimingItem
            label={
              <span className="inline-flex items-center gap-1.5">
                Avg tx fees / block
                <Tooltip>
                  <TooltipTrigger
                    aria-label="Explain average tx fees calculation"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <QuestionIcon className="size-4" aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Up to 12 recent OCEAN blocks are sampled. For each block,
                    the transaction fee total is pulled from mempool.space. The
                    average of those per-block fee totals is shown here.
                  </TooltipContent>
                </Tooltip>
              </span>
            }
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

function TimingItem({
  label,
  value,
}: {
  label: React.ReactNode;
  value: string;
}) {
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
    <Card className="bg-card/86 h-full">
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

function CalculatorFaqCard() {
  const [openItems, setOpenItems] = React.useState<string[]>([
    DEFAULT_FAQ_ITEM_ID,
  ]);

  React.useEffect(() => {
    const openHashItem = () => {
      const itemId = faqItemIdFromHash(window.location.hash);

      if (!FAQ_ITEM_IDS.has(itemId)) {
        return;
      }

      setOpenItems([itemId]);
      document.getElementById(itemId)?.scrollIntoView({ block: "start" });
    };

    openHashItem();
    window.addEventListener("hashchange", openHashItem);

    return () => window.removeEventListener("hashchange", openHashItem);
  }, []);

  function handleFaqValueChange(value: string[]) {
    setOpenItems(value);

    const itemId = value.at(-1);

    if (!itemId) {
      return;
    }

    const url = new URL(window.location.href);
    url.hash = itemId;
    window.history.replaceState(null, "", url);
  }

  return (
    <Card className="bg-card/86">
      <CardHeader>
        <CardTitle className="text-lg tracking-[-0.06em]">FAQ</CardTitle>
        <CardDescription className="text-sm leading-7">
          Short answers to the common questions behind this calculator.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion
          className="border border-border/70 bg-background/40"
          value={openItems}
          onValueChange={handleFaqValueChange}
        >
          {FAQ_ITEMS.map((item) => {
            const itemId = faqItemId(item.question);

            return (
              <AccordionItem
                id={itemId}
                key={itemId}
                value={itemId}
                className="scroll-mt-24"
              >
                <AccordionTrigger className="px-4 py-4 text-sm font-heading tracking-[-0.03em]">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="px-4 text-sm leading-7 text-foreground/74">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}

function faqItemId(question: string) {
  return `faq-${question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function faqItemIdFromHash(hash: string) {
  const itemId = hash.slice(1);

  try {
    return decodeURIComponent(itemId);
  } catch {
    return itemId;
  }
}

async function loadMarketData(signal: AbortSignal) {
  const cached = readStoredMarketData();

  if (cached && isStoredMarketDataFresh(cached)) {
    return cached.body;
  }

  try {
    const response = await fetch(
      "/api/hashpower-calculator",
      requestInit(signal, cached),
    );

    if (response.status === 304) {
      if (cached) {
        writeStoredMarketData(cached.body, cached.etag);
        return cached.body;
      }

      clearStoredMarketData();
      return loadMarketData(signal);
    }

    const body = (await response.json()) as
      | HashpowerCalculatorResponse
      | ApiErrorResponse;

    if (!response.ok) {
      throw new Error(
        "error" in body ? body.error.message : "Calculator data unavailable",
      );
    }

    const data = body as HashpowerCalculatorResponse;
    writeStoredMarketData(data, response.headers.get("ETag"));
    return data;
  } catch (error) {
    if (!import.meta.env.DEV || signal.aborted) {
      throw error;
    }

    // astro dev does not run the Cloudflare worker API, so use a stable snapshot locally
    return DEV_MARKET_DATA;
  }
}

function requestInit(signal: AbortSignal, cached: StoredMarketData | null) {
  const headers = cached?.etag
    ? {
        "If-None-Match": cached.etag,
      }
    : undefined;

  return {
    signal,
    headers,
  };
}

function readStoredMarketData(): StoredMarketData | null {
  const storage = browserStorage();

  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(MARKET_DATA_CACHE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;

    if (isStoredMarketData(parsed)) {
      return parsed;
    }
  } catch {
    // ignore storage and JSON parsing failures
  }

  clearStoredMarketData();
  return null;
}

function writeStoredMarketData(
  body: HashpowerCalculatorResponse,
  etag: string | null,
) {
  const storage = browserStorage();

  if (!storage) {
    return;
  }

  try {
    const data: StoredMarketData = {
      body,
      etag,
      savedAt: Date.now(),
    };

    storage.setItem(MARKET_DATA_CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage write failures
  }
}

function clearStoredMarketData() {
  const storage = browserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(MARKET_DATA_CACHE_KEY);
  } catch {
    // ignore storage removal failures
  }
}

function browserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function isStoredMarketDataFresh(data: StoredMarketData) {
  return Date.now() - data.savedAt < MARKET_DATA_CACHE_TTL_MS;
}

function isStoredMarketData(value: unknown): value is StoredMarketData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Partial<StoredMarketData>;

  return (
    typeof data.savedAt === "number" &&
    "etag" in data &&
    (data.etag === null || typeof data.etag === "string") &&
    !!data.body &&
    typeof data.body === "object"
  );
}

const DEV_MARKET_DATA: HashpowerCalculatorResponse = {
  inputs: {
    budgetUsd: DEFAULT_BUDGET_USD,
    durationDays: DEFAULT_DURATION_DAYS,
    priceSatsPerPhDay: 45_062,
  },
  market: {
    bestAskSatsPerEhDay: 45_062_000,
    lastAvgSatsPerEhDay: 45_062_000,
    availableHashratePh: 12.4,
    topAskHashratePh: 4.8,
    topAskSatsPerEhDay: 45_062_000,
    defaultPriceSatsPerEhDay: 45_062_000,
    defaultAskHashratePh: 4.8,
    difficulty: 138_966_858_174_568.75,
    btcUsd: 68_513,
    marketStatus: "DEV_SNAPSHOT",
    oceanHashrateEh: 13.18,
    oceanAverageTimeToBlockHours: 11,
    oceanAverageBlockTxFeesBtc: 0.02182927,
    oceanBlockFeeSampleSize: 12,
    fetchedAt: 1_743_990_000,
    sources: [
      {
        label: "Braiins spot stats",
        url: "https://hashpower.braiins.com/webapi/spot/stats",
      },
      {
        label: "Braiins orderbook",
        url: "https://hashpower.braiins.com/webapi/orderbook",
      },
      {
        label: "Braiins difficulty stats",
        url: "https://hashpower.braiins.com/webapi/difficulty-stats",
      },
      {
        label: "Braiins BTC price",
        url: "https://hashpower.braiins.com/webapi/btc-price",
      },
      {
        label: "OCEAN dashboard",
        url: "https://ocean.xyz/dashboard",
      },
      {
        label: "OCEAN blocks found",
        url: "https://ocean.xyz/data/json/blocksfound?range=1m",
      },
      {
        label: "Mempool block summary",
        url: "https://mempool.space/api/v1/block/:hash/summary",
      },
    ],
  },
  results: {
    budgetBtc: 0.01459577,
    buyBtc: 0.01459577,
    hashratePh: 1.07968,
    hashrateEh: 0.00107968,
    expectedNetworkBlocks: 0.00468877,
    expectedMinedBtc: 0.01460722,
    deltaPct: 0.0798,
    expectedOceanBlocks: 65.45,
    oneOceanBlockShortfallPct: 1.52788,
    probabilityAtLeastOneOceanBlock: 0.99999977,
    probabilityAtLeastTwoOceanBlocks: 0.9999962,
  },
  warnings: [
    {
      code: "MEMORYLESS_CACHE",
      message:
        "Local Astro dev uses a bundled market snapshot because the Cloudflare worker API is not running",
    },
  ],
  stale: false,
  cacheMode: "MEMORYLESS",
};

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
    oneOceanBlockShortfallPct:
      expectedOceanBlocks === null ? null : 100 / expectedOceanBlocks,
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

  if (exceedsDefaultAskLiquidity(market, inputs, results)) {
    warnings.push({
      code: "LIQUIDITY",
      message:
        "The requested hashrate exceeds the available hash at the default calculator price, so the flat-price estimate may be too optimistic.",
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

function exceedsDefaultAskLiquidity(
  market: MarketSnapshot,
  inputs: CalculatorInputs,
  results: CalculatorResults,
) {
  if (market.defaultAskHashratePh === null) {
    return false;
  }

  const defaultPrice = market.defaultPriceSatsPerEhDay / 1_000;
  return (
    results.hashratePh > market.defaultAskHashratePh &&
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
  const rawMin = price * 0.5;
  const rawMax = price * 1.5;
  const snappedMin = Math.max(
    BRAIINS_PRICE_STEP,
    Math.floor(rawMin / BRAIINS_PRICE_STEP) * BRAIINS_PRICE_STEP,
  );
  const snappedMax = Math.max(
    1_000,
    Math.ceil(rawMax / BRAIINS_PRICE_STEP) * BRAIINS_PRICE_STEP,
  );

  return { min: snappedMin, max: snappedMax };
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

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatSignedUsd(value: number) {
  const prefix = value >= 0 ? "+" : "-";
  return `${prefix}${formatUsd(Math.abs(value))}`;
}

function formatSignedBtc(value: number) {
  const prefix = value >= 0 ? "+" : "-";
  return `${prefix}${formatBtc(Math.abs(value))}`;
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function formatPercentFromPct(value: number) {
  return formatPercent(value / 100);
}

function formatSignedPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    signDisplay: "always",
    style: "percent",
  }).format(value / 100);
}
