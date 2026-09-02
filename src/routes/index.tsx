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
  formatBits,
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
  const [side, setSide] = useState<"usd" | "sats">("usd");
  const [raw, setRaw] = useState("1");

  const parsed = parseAmount(raw);
  const usdValue =
    side === "usd"
      ? parsed
      : parsed != null && price.usd != null
        ? satsToDollars(parsed, price.usd)
        : null;
  const satsValue =
    side === "sats"
      ? parsed
      : parsed != null && price.usd != null
        ? dollarsToSats(parsed, price.usd)
        : null;

  return (
    <PageShell>
      <StatusBanner
        stale={price.stale}
        ok={price.ok}
        hasPrice={price.usd != null}
        error={price.error}
        refreshing={price.refreshing}
        onRetry={() => void price.refresh()}
      />

      <div className="flex flex-1 flex-col justify-center py-8 sm:py-12">
        <Hero
          sats={satsValue}
          stale={price.stale}
        />
        <div className="mt-10">
          <Converter
            disabled={price.usd == null}
            side={side}
            raw={raw}
            usdValue={usdValue}
            satsValue={satsValue}
            onUsd={(value) => {
              setSide("usd");
              setRaw(value);
            }}
            onSats={(value) => {
              setSide("sats");
              setRaw(value);
            }}
          />
        </div>
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
    <main className="page-shell relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 sm:px-8">
      {children ?? (
        <div className="flex flex-1 flex-col justify-center py-8">
          <div className="h-16 w-56 bg-surface/40" />
        </div>
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
  stale,
}: {
  sats: number | null;
  stale: boolean;
}) {
  const ready = sats != null && Number.isFinite(sats);

  return (
    <section aria-live="polite" className="text-center">
      <p
        className={
          stale
            ? "text-hero font-semibold tracking-tight text-danger tabular-nums"
            : "text-hero font-semibold tracking-tight text-fg tabular-nums"
        }
      >
        {ready ? formatSats(sats) : "—"}
      </p>
      <p className="mt-3 text-sm tracking-wide text-muted">
        sats{ready ? ` (₿${formatBits(sats)} bits)` : ""}
      </p>
    </section>
  );
}

function Converter({
  disabled,
  side,
  raw,
  usdValue,
  satsValue,
  onUsd,
  onSats,
}: {
  disabled: boolean;
  side: "usd" | "sats";
  raw: string;
  usdValue: number | null;
  satsValue: number | null;
  onUsd: (value: string) => void;
  onSats: (value: string) => void;
}) {
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
          label="USD"
          value={usdText}
          disabled={disabled}
          inputMode="decimal"
          onChange={onUsd}
        />
        <ChipRow>
          {USD_CHIPS.map((amount) => (
            <Button
              key={amount}
              variant="chip"
              size="chip"
              disabled={disabled}
              data-active={usdValue === amount}
              onClick={() => onUsd(String(amount))}
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
          onChange={onSats}
        />
        <ChipRow>
          {SATS_CHIPS.map((amount) => (
            <Button
              key={amount}
              variant="chip"
              size="chip"
              disabled={disabled}
              data-active={satsValue === amount}
              onClick={() => onSats(formatPlainSats(amount))}
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
