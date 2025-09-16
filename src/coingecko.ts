import axios from "axios";
const BASE = "https://api.coingecko.com/api/v3";

export async function fetchSimplePrices(ids: string[]) {
  const params = new URLSearchParams({ ids: ids.join(","), vs_currencies: "usd" });
  const { data } = await axios.get(`${BASE}/simple/price?${params.toString()}`);
  return data as Record<string, { usd: number }>;
}

export async function fetchDailyHistory(id: string, days: number) {
  const { data } = await axios.get(`${BASE}/coins/${id}/market_chart`, {
    params: { vs_currency: "usd", days }
  });
  return (data?.prices ?? []) as [number, number][];
}

export function toGeckoId(symbol: string): string | null {
  const m: Record<string,string> = { BTC:"bitcoin", ETH:"ethereum", SOL:"solana",
    ADA:"cardano", AVAX:"avalanche-2", DOGE:"dogecoin", MATIC:"polygon-pos" };
  return m[symbol.trim().toUpperCase()] ?? null;
}
