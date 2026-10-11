import type { Snapshot, Subscription } from "./types.js";

export type Alert =
  | { kind: "premium"; chatId: number; snapshot: Snapshot; thresholdBps: number }
  | { kind: "market"; chatId: number; snapshot: Snapshot };

/**
 * Decides which chats to notify.
 * - premium: fires when |premium| crosses the chat's threshold, then stays quiet until it
 *   falls back below threshold × rearm (hysteresis) or the cooldown expires.
 * - market: fires once when a watched market opens or closes.
 */
export class AlertEngine {
  private readonly firedAt = new Map<string, number>(); // `${chat}:${symbol}` → ms
  private readonly armed = new Map<string, boolean>();
  private readonly lastOpen = new Map<string, boolean>();

  constructor(private readonly opts: { cooldownMs: number; rearm: number } = { cooldownMs: 30 * 60_000, rearm: 0.6 }) {}

  evaluate(snapshots: Snapshot[], subs: Subscription[], now = Date.now()): Alert[] {
    const out: Alert[] = [];
    const bySymbol = new Map(snapshots.map((s) => [s.symbol.toUpperCase(), s]));

    // market open/close transitions (once per symbol, fan out to watchers)
    const transitions = new Set<string>();
    for (const s of snapshots) {
      const sym = s.symbol.toUpperCase();
      const prev = this.lastOpen.get(sym);
      if (prev !== undefined && prev !== s.market.open) transitions.add(sym);
      this.lastOpen.set(sym, s.market.open);
    }

    for (const sub of subs) {
      const sym = sub.symbol.toUpperCase();
      const snap = bySymbol.get(sym);
      if (!snap) continue;
      if (transitions.has(sym)) out.push({ kind: "market", chatId: sub.chatId, snapshot: snap });

      if (snap.premiumBps === null) continue;
      const key = `${sub.chatId}:${sym}`;
      const abs = Math.abs(snap.premiumBps);
      const isArmed = this.armed.get(key) ?? true;
      const last = this.firedAt.get(key) ?? -Infinity;

      if (abs < sub.thresholdBps * this.opts.rearm) this.armed.set(key, true);
      if (abs >= sub.thresholdBps && (isArmed || now - last >= this.opts.cooldownMs)) {
        out.push({ kind: "premium", chatId: sub.chatId, snapshot: snap, thresholdBps: sub.thresholdBps });
        this.firedAt.set(key, now);
        this.armed.set(key, false);
      }
    }
    return out;
  }
}
