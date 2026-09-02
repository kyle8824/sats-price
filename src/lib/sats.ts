export const SATS_PER_BTC = 100_000_000;
export const STALE_AFTER_MS = 5 * 60 * 1000;

export function satsPerDollar(btcUsd: number): number {
  if (!Number.isFinite(btcUsd) || btcUsd <= 0) return NaN;
  return SATS_PER_BTC / btcUsd;
}

export function dollarsToSats(usd: number, btcUsd: number): number {
  if (!Number.isFinite(usd) || !Number.isFinite(btcUsd) || btcUsd <= 0) {
    return NaN;
  }
  return Math.round((usd * SATS_PER_BTC) / btcUsd);
}

export function satsToDollars(sats: number, btcUsd: number): number {
  if (!Number.isFinite(sats) || !Number.isFinite(btcUsd) || btcUsd <= 0) {
    return NaN;
  }
  return (sats * btcUsd) / SATS_PER_BTC;
}

export function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/[$,\s_]/g, "");
  if (cleaned === "" || cleaned === ".") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function formatSats(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(value),
  );
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  let maximumFractionDigits = 2;
  if (abs > 0 && abs < 0.01) maximumFractionDigits = 8;
  else if (abs < 1) maximumFractionDigits = 4;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(value);
}

export function formatPlainUsd(value: number): string {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if (abs === 0) return "0.00";
  if (abs >= 1) return value.toFixed(2);
  if (abs >= 0.01) return trimTrailingZeros(value.toFixed(4));
  return trimTrailingZeros(value.toFixed(8));
}

function trimTrailingZeros(value: string): string {
  if (!value.includes(".")) return value;
  return value.replace(/0+$/, "").replace(/\.$/, "");
}

export function formatBits(sats: number): string {
  if (!Number.isFinite(sats)) return "—";
  const bits = sats / 100;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(bits);
}

export function formatPlainSats(value: number): string {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Math.round(value),
  );
}

export function formatAgo(fromMs: number, nowMs: number): string {
  const delta = Math.max(0, nowMs - fromMs);
  const seconds = Math.round(delta / 1000);
  if (seconds < 8) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export const USD_CHIPS = [1, 5, 20, 100] as const;
export const SATS_CHIPS = [1, 100, 1_000, 1_000_000] as const;
