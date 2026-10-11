import type { Snapshot } from "./types.js";

export async function fetchMarkets(baseUrl: string, fetchFn: typeof fetch = fetch): Promise<Snapshot[]> {
  const res = await fetchFn(`${baseUrl.replace(/\/$/, "")}/markets`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`monitor ${res.status}`);
  const body = (await res.json()) as { markets: Snapshot[] };
  return body.markets;
}
