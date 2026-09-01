import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBtcUsd } from "@/lib/price";
import { useLivePrice } from "@/lib/use-live-price";
import {
  SATS_CHIPS,
  USD_CHIPS,
  dollarsToSats,
  formatAgo,
  formatPlainSats,
  formatPlainUsd,
  formatSats,
  formatUsd,
  parseAmount,
  satsToDollars,
} from "@/lib/sats";

export const Route = createFileRoute("/")({
  loader: () => getBtcUsd(),
  component: Home,
  pendingComponent: PageShell,
});

function Home() {
  const initial = Route.useLoaderData();
  const price = useLivePrice(initial);
  const live = price.ok && !price.stale;
  const updated = formatAgo(
    price.lastUpdatedAt ?? price.fetchedAt,
    price.now,
  );

  return (
    <PageShell>
      <header className="flex items-end justify-between gap-4 border-b border-border py-3">
        <div className="min-w-0">
          <h1 className="text-sm font-medium tracking-tight text-fg">
            sats-price
          </h1>
          <p className="text-sm leading-normal text-muted">
            how many sats a dollar buys.
          </p>
        </div>
        <p
          className={
            live
              ? "shrink-0 text-sm leading-normal tabular-nums text-muted"
              : "shrink-0 text-sm leading-normal font-medium tabular-nums text-danger"
          }
        >
          {live
            ? `updated ${updated}`
            : price.usd == null
              ? "no quote"
              : `stale · ${updated}`}
        </p>
      </header>

      <StatusBanner
        stale={price.stale}
        ok={price.ok}
        hasPrice={price.usd != null}
        error={price.error}
        refreshing={price.refreshing}
        onRetry={() => void price.refresh()}
      />

      <div className="border-b border-border py-4 sm:py-5">
        <Hero
          sats={price.satsPerDollar}
          usd={price.usd}
          stale={price.stale}
        />
      </div>

      <div className="py-4 sm:py-5">
        <Converter btcUsd={price.usd} disabled={price.usd == null} />
      </div>

      <footer className="border-t border-border py-3 text-sm leading-normal text-muted">
        <p>100 sats = 1 bit</p>
        <SourceLine
          sourceName={price.sourceName}
          sourceUrl={price.sourceUrl}
          lastUpdatedAt={price.lastUpdatedAt ?? price.fetchedAt}
          now={price.now}
          ok={price.ok && price.usd != null}
        />
      </footer>
    </PageShell>
  );
}

function PageShell({ children }: { children?: ReactNode }) {
  return (
    <main className="page-shell mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 sm:px-6">
      {children ?? (
        <>
          <header className="border-b border-border py-3">
            <h1 className="text-sm font-medium tracking-tight text-fg">
              sats-price
            </h1>
            <p className="text-sm text-muted">how many sats a dollar buys.</p>
          </header>
          <div className="border-b border-border py-4">
            <div className="h-12 w-40 border border-border bg-surface" />
          </div>
          <div className="grid grid-cols-1 gap-5 py-4 sm:grid-cols-2">
            <div className="h-28 border border-border bg-surface" />
            <div className="h-28 border border-border bg-surface" />
          </div>
        </>
      )}
    </main>
  );
}

function StatusBanner({
  stale,
  ok,
  hasPrice,
  error,
  refreshing,
  onRetry,
}: {
  stale: boolean;
  ok: boolean;
  hasPrice: boolean;
  error: string | null;
  refreshing: boolean;
  onRetry: () => void;
}) {
  if (!stale && ok) return null;

  const title = !hasPrice ? "Price unavailable" : "Price is stale";
  const detail = !hasPrice
    ? "The bitcoin price could not be loaded. Converter paused until a quote arrives."
    : "Quote older than five minutes. Last-known number only — do not treat as live.";

  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 bg-danger px-3 py-2.5 text-danger-fg"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug">{title}</p>
        <p className="mt-1 text-sm leading-normal text-danger-fg/90">{detail}</p>
        {error && hasPrice ? (
          <p className="mt-1 text-sm leading-normal text-danger-fg/80">{error}</p>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRetry}
        disabled={refreshing}
        className="shrink-0 text-danger-fg underline decoration-danger-fg/50 hover:bg-transparent hover:text-danger-fg hover:decoration-danger-fg"
      >
        Retry
      </Button>
    </div>
  );
}

function Hero({
  sats,
  usd,
  stale,
}: {
  sats: number | null;
  usd: number | null;
  stale: boolean;
}) {
  const ready = sats != null && Number.isFinite(sats);

  return (
    <section aria-live="polite" className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-8">
      <p
        className={
          stale
            ? "font-mono text-hero font-medium tracking-tight text-danger tabular-nums"
            : "font-mono text-hero font-medium tracking-tight text-fg tabular-nums"
        }
      >
        {ready ? formatSats(sats) : "—"}
      </p>
      <div className="sm:pb-1">
        <p className="text-sm leading-normal text-muted">sats / $1</p>
        <p className="mt-0.5 font-mono text-sm leading-normal tabular-nums text-muted">
          {usd != null ? formatUsd(usd) : "—"} BTC-USD
        </p>
      </div>
    </section>
  );
}

function Converter({
  btcUsd,
  disabled,
}: {
  btcUsd: number | null;
  disabled: boolean;
}) {
  const [side, setSide] = useState<"usd" | "sats">("usd");
  const [raw, setRaw] = useState("1");

  const parsed = parseAmount(raw);
  const usdValue =
    side === "usd"
      ? parsed
      : parsed != null && btcUsd != null
        ? satsToDollars(parsed, btcUsd)
        : null;
  const satsValue =
    side === "sats"
      ? parsed
      : parsed != null && btcUsd != null
        ? dollarsToSats(parsed, btcUsd)
        : null;

  const usdText = side === "usd" ? raw : usdValue == null ? "" : formatPlainUsd(usdValue);
  const satsText =
    side === "sats" ? raw : satsValue == null ? "" : formatPlainSats(satsValue);

  return (
    <section>
      <h2 className="sr-only">Convert dollars and sats</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-8">
        <div className="min-w-0">
        <Field
          id="usd-amount"
          label="US dollars"
          value={usdText}
          disabled={disabled}
          inputMode="decimal"
          onChange={(value) => {
            setSide("usd");
            setRaw(value);
          }}
        />
        <ChipRow>
          {USD_CHIPS.map((amount) => (
            <Button
              key={amount}
              variant="chip"
              size="chip"
              disabled={disabled}
              data-active={usdValue === amount}
              onClick={() => {
                setSide("usd");
                setRaw(String(amount));
              }}
            >
              {`$${amount}`}
            </Button>
          ))}
        </ChipRow>
      </div>

      <div className="min-w-0">
        <Field
          id="sats-amount"
          label="sats"
          value={satsText}
          disabled={disabled}
          inputMode="numeric"
          onChange={(value) => {
            setSide("sats");
            setRaw(value);
          }}
        />
        <ChipRow>
          {SATS_CHIPS.map((amount) => (
            <Button
              key={amount}
              variant="chip"
              size="chip"
              disabled={disabled}
              data-active={satsValue === amount}
              onClick={() => {
                setSide("sats");
                setRaw(formatPlainSats(amount));
              }}
            >
              {satsChipLabel(amount)}
            </Button>
          ))}
        </ChipRow>
      </div>
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  value,
  disabled,
  inputMode,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  inputMode: "decimal" | "numeric";
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        inputMode={inputMode}
        autoComplete="off"
        spellCheck={false}
        placeholder="0"
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5"
      />
    </div>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>;
}

function satsChipLabel(amount: number): string {
  const formatted = formatSats(amount);
  return amount === 1 ? "1 sat" : `${formatted} sats`;
}

function SourceLine({
  sourceName,
  sourceUrl,
  lastUpdatedAt,
  now,
  ok,
}: {
  sourceName: string | null;
  sourceUrl: string | null;
  lastUpdatedAt: number;
  now: number;
  ok: boolean;
}) {
  const when = formatAgo(lastUpdatedAt, now);
  const name = sourceName ?? "a public market API";

  return (
    <p className="mt-1 text-pretty">
      {ok ? (
        <>
          Spot USD from{" "}
          {sourceUrl ? (
            <a
              href={sourceUrl}
              className="text-fg underline decoration-border underline-offset-2 transition-colors duration-(--duration-quick) hover:decoration-fg"
              target="_blank"
              rel="noreferrer"
            >
              {name}
            </a>
          ) : (
            name
          )}
          ’s public API · {when}
        </>
      ) : (
        <>
          Tries CoinGecko, then Coinbase, then Kraken.{" "}
          {sourceName ? `Last good quote: ${sourceName}.` : "No quote yet."}
        </>
      )}
    </p>
  );
}
