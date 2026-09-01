import { useCallback, useEffect, useState } from "react";
import { getBtcUsd, type PriceSnapshot } from "@/lib/price";
import { STALE_AFTER_MS } from "@/lib/sats";

const REFRESH_MS = 30_000;

export function useLivePrice(initial: PriceSnapshot) {
  const [price, setPrice] = useState(initial);
  const [now, setNow] = useState(() => initial.fetchedAt);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await getBtcUsd();
      setPrice(next);
    } catch {
      setPrice((prev) => ({
        ...prev,
        ok: false,
        stale: true,
        error: prev.error ?? "Price refresh failed",
      }));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh();
    }, REFRESH_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const reference = price.lastUpdatedAt ?? price.fetchedAt;
  const stale =
    price.stale ||
    !price.ok ||
    price.usd == null ||
    now - reference > STALE_AFTER_MS;

  return { ...price, stale, now, refresh, refreshing };
}
