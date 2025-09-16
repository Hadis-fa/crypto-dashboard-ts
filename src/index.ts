import express from "express";
import { TTLCache } from "./cache";
import { fetchSimplePrices, fetchDailyHistory, toGeckoId } from "./coingecko";

const app = express();
const PORT = process.env.PORT ?? 3000;

// Cache: 30s for spot prices; 5m for history
const spotCache = new TTLCache<any>(30_000);
const histCache = new TTLCache<any>(300_000);

app.get("/health", (_req, res) => res.json({ ok: true }));

// e.g. /prices?symbols=BTC,ETH,SOL
app.get("/prices", async (req, res) => {
  try {
    const raw = (req.query.symbols as string | undefined) ?? "";
    const symbols = raw.split(",").map(s => s.trim()).filter(Boolean);
    if (symbols.length === 0) {
      return res.status(400).json({ error: "Provide symbols, e.g. /prices?symbols=BTC,ETH" });
    }

    const ids = symbols.map(toGeckoId);
    if (ids.some(id => !id)) {
      return res.status(400).json({ error: "One or more symbols not supported." });
    }

    const key = (ids as string[]).join(",");
    const cached = spotCache.get(key);
    if (cached) {
      const result = symbols.map(sym => {
        const id = toGeckoId(sym)!;
        return { symbol: sym.toUpperCase(), usd: cached[id]?.usd ?? null };
      });
      return res.json({ source: "cache", data: result });
    }

    const data = await fetchSimplePrices(ids as string[]);
    spotCache.set(key, data);

    const result = symbols.map(sym => {
      const id = toGeckoId(sym)!;
      return { symbol: sym.toUpperCase(), usd: data[id]?.usd ?? null };
    });

    res.json({ source: "live", data: result });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to fetch prices", detail: e?.message });
  }
});

// e.g. /ma?symbol=BTC&days=7
app.get("/ma", async (req, res) => {
  try {
    const symbol = (req.query.symbol as string | undefined)?.toUpperCase();
    const days = Math.max(2, Math.min(90, Number(req.query.days ?? 7)));
    if (!symbol) return res.status(400).json({ error: "Provide symbol, e.g. /ma?symbol=BTC&days=7" });

    const id = toGeckoId(symbol);
    if (!id) return res.status(400).json({ error: "Symbol not supported" });

    const key = `${id}:${days}`;
    const cached = histCache.get(key);
    let prices: [number, number][];
    if (cached) {
      prices = cached;
    } else {
      prices = await fetchDailyHistory(id, days);
      histCache.set(key, prices);
    }

    const closes = prices.map(([, p]) => p);
    const sma = closes.reduce((a, b) => a + b, 0) / closes.length;

    res.json({ symbol, days, points: prices.length, sma: Number(sma.toFixed(4)) });
  } catch (e: any) {
    res.status(500).json({ error: "Failed to compute moving average", detail: e?.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
