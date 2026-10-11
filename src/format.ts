import type { Alert } from "./alerts.js";
import type { Snapshot } from "./types.js";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const bps = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(0)} bps`;
const demoTag = (s: Snapshot) => (s.source === "demo" ? "\n⚠️ DEMO data — monitor has no Pyth API key" : "");

export function formatSnapshot(s: Snapshot): string {
  const lines = [`*${s.symbol}* · market ${s.market.open ? "🟢 open" : "🔴 closed"} (${s.market.session})`];
  if (s.reference) lines.push(`Reference (Pyth): ${usd(s.reference.price)} · ${s.reference.ageSeconds}s ago`);
  else lines.push("Reference: no price");
  if (s.dex) lines.push(`${s.dex.label}: ${usd(s.dex.price)}`);
  if (s.premiumBps !== null) lines.push(`Premium: ${bps(s.premiumBps)}`);
  return lines.join("\n") + demoTag(s);
}

export function formatAlert(a: Alert): string {
  const s = a.snapshot;
  if (a.kind === "market") {
    return `${s.market.open ? "🟢" : "🔴"} *${s.symbol}* market ${s.market.open ? "opened" : "closed"}${demoTag(s)}`;
  }
  const dir = (s.premiumBps ?? 0) >= 0 ? "premium" : "discount";
  return [
    `🚨 *${s.symbol}* tokenized price at a ${bps(s.premiumBps ?? 0)} ${dir} (threshold ${a.thresholdBps} bps)`,
    s.reference ? `Pyth: ${usd(s.reference.price)}` : "",
    s.dex ? `${s.dex.label}: ${usd(s.dex.price)}` : "",
    `Market: ${s.market.open ? "open" : "closed"}`,
  ]
    .filter(Boolean)
    .join("\n") + demoTag(s);
}

/** Parses "/watch NVDA 75" → { symbol, thresholdBps }. Threshold defaults to 50 bps. */
export function parseWatch(text: string): { symbol: string; thresholdBps: number } | { error: string } {
  const [, sym, th] = text.trim().split(/\s+/);
  if (!sym || !/^[A-Za-z.]{1,10}$/.test(sym)) return { error: "Usage: /watch SYMBOL [threshold_bps], e.g. /watch NVDA 75" };
  const thresholdBps = th === undefined ? 50 : Number(th);
  if (!Number.isFinite(thresholdBps) || thresholdBps < 5 || thresholdBps > 5000) return { error: "Threshold must be between 5 and 5000 bps" };
  return { symbol: sym.toUpperCase(), thresholdBps };
}
