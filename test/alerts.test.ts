import { describe, expect, it } from "vitest";
import { AlertEngine } from "../src/alerts.js";
import { formatAlert, formatSnapshot, parseWatch } from "../src/format.js";
import { SubscriptionStore } from "../src/store.js";
import type { Snapshot, Subscription } from "../src/types.js";

const snap = (premiumBps: number | null, open = true, symbol = "NVDA"): Snapshot => ({
  symbol,
  source: "pyth",
  reference: { price: 100, ageSeconds: 2 },
  dex: premiumBps === null ? null : { label: "xNVDA/USDC", price: 100 * (1 + premiumBps / 10_000) },
  premiumBps,
  market: { open, session: "09:30–16:00" },
  updatedAt: "2026-10-08T15:00:00Z",
});
const subs: Subscription[] = [{ chatId: 1, symbol: "NVDA", thresholdBps: 50 }];

describe("AlertEngine", () => {
  it("fires once when the threshold is crossed, then waits", () => {
    const e = new AlertEngine({ cooldownMs: 60_000, rearm: 0.6 });
    expect(e.evaluate([snap(20)], subs, 0)).toHaveLength(0);
    expect(e.evaluate([snap(70)], subs, 1000)).toEqual([expect.objectContaining({ kind: "premium", chatId: 1 })]);
    expect(e.evaluate([snap(80)], subs, 2000)).toHaveLength(0); // still elevated, within cooldown
  });

  it("re-arms after falling back below threshold × rearm", () => {
    const e = new AlertEngine({ cooldownMs: 60 * 60_000, rearm: 0.6 });
    e.evaluate([snap(70)], subs, 0);
    e.evaluate([snap(20)], subs, 1000); // 20 < 30 → re-armed
    expect(e.evaluate([snap(-60)], subs, 2000)).toHaveLength(1); // discount counts too
  });

  it("re-alerts after the cooldown even without re-arming", () => {
    const e = new AlertEngine({ cooldownMs: 10_000, rearm: 0.6 });
    e.evaluate([snap(70)], subs, 0);
    expect(e.evaluate([snap(70)], subs, 11_000)).toHaveLength(1);
  });

  it("notifies watchers on market open/close transitions only", () => {
    const e = new AlertEngine();
    expect(e.evaluate([snap(null, true)], subs, 0)).toHaveLength(0); // first sighting
    expect(e.evaluate([snap(null, true)], subs, 1)).toHaveLength(0);
    expect(e.evaluate([snap(null, false)], subs, 2)).toEqual([expect.objectContaining({ kind: "market" })]);
  });

  it("ignores markets nobody watches", () => {
    expect(new AlertEngine().evaluate([snap(500, true, "TSLA")], subs, 0)).toHaveLength(0);
  });
});

describe("format", () => {
  it("parses /watch with and without a threshold", () => {
    expect(parseWatch("/watch nvda 75")).toEqual({ symbol: "NVDA", thresholdBps: 75 });
    expect(parseWatch("/watch TSLA")).toEqual({ symbol: "TSLA", thresholdBps: 50 });
    expect(parseWatch("/watch")).toHaveProperty("error");
    expect(parseWatch("/watch NVDA 1")).toHaveProperty("error");
  });

  it("formats alerts and flags demo data", () => {
    const text = formatAlert({ kind: "premium", chatId: 1, snapshot: { ...snap(120), source: "demo" }, thresholdBps: 50 });
    expect(text).toContain("+120 bps premium");
    expect(text).toContain("DEMO");
    expect(formatSnapshot(snap(-80))).toContain("-80 bps");
  });
});

describe("SubscriptionStore", () => {
  it("upserts per chat+symbol and removes", () => {
    const s = new SubscriptionStore(null);
    s.upsert({ chatId: 1, symbol: "NVDA", thresholdBps: 50 });
    s.upsert({ chatId: 1, symbol: "NVDA", thresholdBps: 90 });
    s.upsert({ chatId: 2, symbol: "NVDA", thresholdBps: 50 });
    expect(s.forChat(1)).toEqual([{ chatId: 1, symbol: "NVDA", thresholdBps: 90 }]);
    expect(s.remove(1, "nvda")).toBe(true);
    expect(s.all()).toHaveLength(1);
  });
});
