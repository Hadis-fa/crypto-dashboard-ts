import { useEffect, useMemo, useState } from "react";

type PriceItem = { symbol: string; usd: number | null };
type PricesResponse = { source: "live" | "cache"; data: PriceItem[] };
type MaResponse = { symbol: string; days: number; points: number; sma: number };

const numberFmt = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export default function App() {
  const [symbols, setSymbols] = useState<string[]>(["BTC", "ETH", "SOL"]);
  const [newSymbol, setNewSymbol] = useState("");
  const [prices, setPrices] = useState<PriceItem[] | null>(null);
  const [source, setSource] = useState<"live" | "cache" | null>(null);
  const [days, setDays] = useState<number>(7);
  const [sma, setSma] = useState<Record<string, number>>({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [loadingSmaFor, setLoadingSmaFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queryParam = useMemo(() => symbols.join(","), [symbols]);

  async function fetchPrices() {
    if (!symbols.length) return;
    setLoadingPrices(true);
    setError(null);
    try {
      const res = await fetch(`/api/prices?symbols=${encodeURIComponent(queryParam)}`);
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as PricesResponse;
      setPrices(json.data);
      setSource(json.source);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load prices");
      setPrices(null);
      setSource(null);
    } finally {
      setLoadingPrices(false);
    }
  }

  async function fetchSma(symbol: string) {
    setLoadingSmaFor(symbol);
    setError(null);
    try {
      const res = await fetch(`/api/ma?symbol=${encodeURIComponent(symbol)}&days=${days}`);
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as MaResponse;
      setSma((prev) => ({ ...prev, [symbol]: json.sma }));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load SMA");
    } finally {
      setLoadingSmaFor(null);
    }
  }

  function addSymbol() {
    const s = newSymbol.trim().toUpperCase();
    if (s && !symbols.includes(s)) setSymbols((prev) => [...prev, s]);
    setNewSymbol("");
  }

  function removeSymbol(s: string) {
    setSymbols((prev) => prev.filter((x) => x !== s));
    setSma((prev) => {
      const copy = { ...prev };
      delete copy[s];
      return copy;
    });
  }

  useEffect(() => {
    fetchPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParam]);

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1rem", fontFamily: "Inter, system-ui, Arial" }}>
      <h1 style={{ marginBottom: 6 }}>Crypto Prices (TypeScript + React)</h1>
      <p style={{ marginTop: 0, color: "#666" }}>
        Backend endpoints: <code>/prices</code> & <code>/ma</code> (proxied via <code>/api</code>). Source:{" "}
        <strong>{source ?? "—"}</strong>
      </p>

      <section style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          placeholder="Add symbol (e.g., BTC)"
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ccc" }}
          onKeyDown={(e) => { if (e.key === "Enter") addSymbol(); }}
        />
        <button onClick={addSymbol} style={btnStyle}>Add</button>
        <button onClick={fetchPrices} style={btnStyle} disabled={loadingPrices}>
          {loadingPrices ? "Loading…" : "Refresh Prices"}
        </button>
        <div style={{ marginLeft: "auto" }}>
          <label style={{ marginRight: 8 }}>SMA days:</label>
          <input
            type="number"
            min={2}
            max={90}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{ width: 80, padding: "8px 10px", borderRadius: 8, border: "1px solid #ccc" }}
          />
        </div>
      </section>

      {error && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #f5c2c7", background: "#f8d7da", color: "#842029", borderRadius: 8 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        {symbols.map((sym) => {
          const usd = prices?.find(p => p.symbol === sym)?.usd ?? null;
          return (
            <div key={sym} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>{sym}</h3>
                <button onClick={() => removeSymbol(sym)} style={{ ...btnStyle, padding: "4px 10px" }}>×</button>
              </div>
              <div style={{ fontSize: 14, color: "#666", marginBottom: 6 }}>
                {usd != null ? "Spot Price" : "Not available"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
                {usd != null ? numberFmt.format(usd) : "—"}
              </div>

              <button
                onClick={() => fetchSma(sym)}
                style={btnStyle}
                disabled={loadingSmaFor === sym}
              >
                {loadingSmaFor === sym ? "Calculating…" : `Get ${days}-day SMA`}
              </button>

              <div style={{ marginTop: 8, color: "#444" }}>
                {sma[sym] != null && <div>SMA: <strong>{numberFmt.format(sma[sym])}</strong></div>}
              </div>
            </div>
          );
        })}
      </div>

      {(!symbols.length) && <p style={{ marginTop: 20, color: "#666" }}>Add a symbol to begin.</p>}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #ccc",
  background: "white",
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 14,
  padding: 14,
  width: 260,
  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
};
