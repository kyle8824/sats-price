import { createServerFn } from "@tanstack/react-start";
import { STALE_AFTER_MS, satsPerDollar } from "@/lib/sats";

export type PriceSourceId = "coingecko" | "coinbase" | "kraken";

export type PriceSnapshot = {
  ok: boolean;
  usd: number | null;
  satsPerDollar: number | null;
  lastUpdatedAt: number | null;
  fetchedAt: number;
  sourceId: PriceSourceId | null;
  sourceName: string | null;
  sourceUrl: string | null;
  stale: boolean;
  error: string | null;
};

type LiveQuote = {
  usd: number;
  lastUpdatedAt: number;
  sourceId: PriceSourceId;
  sourceName: string;
  sourceUrl: string;
};

const SOURCE_META: Record<
  PriceSourceId,
  { name: string; url: string }
> = {
  coingecko: {
    name: "CoinGecko",
    url: "https://www.coingecko.com/en/coins/bitcoin",
  },
  coinbase: {
    name: "Coinbase",
    url: "https://www.coinbase.com/price/bitcoin",
  },
  kraken: {
    name: "Kraken",
    url: "https://www.kraken.com/prices/bitcoin",
  },
};

const CACHE_FRESH_MS = 20_000;
const HEADERS = {
  Accept: "application/json",
  "User-Agent": "sats-price.com/1.0 (public sats-per-dollar page)",
};

let cache: PriceSnapshot | null = null;

function snapshotFromQuote(quote: LiveQuote, fetchedAt: number): PriceSnapshot {
  const stale = fetchedAt - quote.lastUpdatedAt > STALE_AFTER_MS;
  return {
    ok: true,
    usd: quote.usd,
    satsPerDollar: satsPerDollar(quote.usd),
    lastUpdatedAt: quote.lastUpdatedAt,
    fetchedAt,
    sourceId: quote.sourceId,
    sourceName: quote.sourceName,
    sourceUrl: quote.sourceUrl,
    stale,
    error: stale ? "Price is stale" : null,
  };
}

function failedSnapshot(error: string, fetchedAt: number): PriceSnapshot {
  if (cache?.usd != null) {
    const stale = true;
    return {
      ...cache,
      fetchedAt,
      ok: false,
      stale,
      error,
    };
  }
  return {
    ok: false,
    usd: null,
    satsPerDollar: null,
    lastUpdatedAt: null,
    fetchedAt,
    sourceId: null,
    sourceName: null,
    sourceUrl: null,
    stale: true,
    error,
  };
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Invalid JSON (${response.status})`);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

function positiveUsd(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Price missing");
  }
  return n;
}

async function fetchCoinGecko(signal: AbortSignal): Promise<LiveQuote> {
  const response = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_last_updated_at=true",
    { signal, headers: HEADERS },
  );
  const body = await readJson(response);
  const root = asRecord(body);
  const status = asRecord(root?.status);
  if (status && typeof status.error_message === "string") {
    throw new Error(status.error_message);
  }
  if (!response.ok) {
    throw new Error(`CoinGecko ${response.status}`);
  }
  const bitcoin = asRecord(root?.bitcoin);
  const usd = positiveUsd(bitcoin?.usd);
  const updated =
    typeof bitcoin?.last_updated_at === "number"
      ? bitcoin.last_updated_at * 1000
      : Date.now();
  return {
    usd,
    lastUpdatedAt: updated,
    sourceId: "coingecko",
    sourceName: SOURCE_META.coingecko.name,
    sourceUrl: SOURCE_META.coingecko.url,
  };
}

async function fetchCoinbase(signal: AbortSignal): Promise<LiveQuote> {
  const response = await fetch(
    "https://api.coinbase.com/v2/prices/BTC-USD/spot",
    { signal, headers: HEADERS },
  );
  if (!response.ok) throw new Error(`Coinbase ${response.status}`);
  const body = asRecord(await readJson(response));
  const data = asRecord(body?.data);
  const usd = positiveUsd(data?.amount);
  return {
    usd,
    lastUpdatedAt: Date.now(),
    sourceId: "coinbase",
    sourceName: SOURCE_META.coinbase.name,
    sourceUrl: SOURCE_META.coinbase.url,
  };
}

async function fetchKraken(signal: AbortSignal): Promise<LiveQuote> {
  const response = await fetch(
    "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
    { signal, headers: HEADERS },
  );
  if (!response.ok) throw new Error(`Kraken ${response.status}`);
  const body = asRecord(await readJson(response));
  const result = asRecord(body?.result);
  const pair = asRecord(result?.XXBTZUSD);
  const last = pair?.c;
  const lastPrice = Array.isArray(last) ? last[0] : undefined;
  const usd = positiveUsd(lastPrice);
  return {
    usd,
    lastUpdatedAt: Date.now(),
    sourceId: "kraken",
    sourceName: SOURCE_META.kraken.name,
    sourceUrl: SOURCE_META.kraken.url,
  };
}

function settle<T>(
  promise: Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  return promise.then(
    (value) => ({ ok: true, value }),
    (error) => ({ ok: false, error }),
  );
}

async function fetchLiveQuote(): Promise<LiveQuote> {
  const geckoAbort = AbortSignal.timeout(3000);
  const coinbaseAbort = AbortSignal.timeout(4000);
  const gecko = fetchCoinGecko(geckoAbort);
  const coinbase = fetchCoinbase(coinbaseAbort);

  const geckoResult = await settle(gecko);
  if (geckoResult.ok) return geckoResult.value;

  const coinbaseResult = await settle(coinbase);
  if (coinbaseResult.ok) return coinbaseResult.value;

  return await fetchKraken(AbortSignal.timeout(4000));
}

async function loadPrice(): Promise<PriceSnapshot> {
  const now = Date.now();
  if (cache?.ok && cache.usd != null && now - cache.fetchedAt < CACHE_FRESH_MS) {
    return {
      ...cache,
      stale: now - (cache.lastUpdatedAt ?? cache.fetchedAt) > STALE_AFTER_MS,
    };
  }

  try {
    const quote = await fetchLiveQuote();
    const next = snapshotFromQuote(quote, Date.now());
    cache = next;
    return next;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Price request failed";
    return failedSnapshot(message, Date.now());
  }
}

export const getBtcUsd = createServerFn({ method: "GET" }).handler(
  async (): Promise<PriceSnapshot> => loadPrice(),
);
