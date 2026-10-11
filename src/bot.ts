import { Bot } from "grammy";
import { formatSnapshot, parseWatch } from "./format.js";
import type { SubscriptionStore } from "./store.js";
import type { Snapshot } from "./types.js";

const HELP = [
  "*Open Oracle alerts*",
  "Get notified when a tokenized stock drifts from its real (Pyth) price.",
  "",
  "/markets — all tracked markets",
  "/price NVDA — one market",
  "/watch NVDA 75 — alert at ±75 bps (default 50)",
  "/unwatch NVDA",
  "/list — your alerts",
].join("\n");

export function createBot(token: string, store: SubscriptionStore, latest: () => Snapshot[]) {
  const bot = new Bot(token);
  const md = { parse_mode: "Markdown" as const };

  bot.command(["start", "help"], (ctx) => ctx.reply(HELP, md));

  bot.command("markets", (ctx) => {
    const all = latest();
    if (!all.length) return ctx.reply("No data yet — the monitor hasn't answered.");
    return ctx.reply(all.map(formatSnapshot).join("\n\n"), md);
  });

  bot.command("price", (ctx) => {
    const sym = ctx.match.trim().toUpperCase();
    const snap = latest().find((s) => s.symbol === sym);
    return ctx.reply(snap ? formatSnapshot(snap) : `Unknown market "${sym}". Try /markets.`, md);
  });

  bot.command("watch", (ctx) => {
    const parsed = parseWatch(`/watch ${ctx.match}`);
    if ("error" in parsed) return ctx.reply(parsed.error);
    if (latest().length && !latest().some((s) => s.symbol === parsed.symbol)) return ctx.reply(`Unknown market "${parsed.symbol}". Try /markets.`);
    store.upsert({ chatId: ctx.chat.id, ...parsed });
    return ctx.reply(`✅ Watching ${parsed.symbol} at ±${parsed.thresholdBps} bps (plus market open/close).`);
  });

  bot.command("unwatch", (ctx) => {
    const sym = ctx.match.trim().toUpperCase();
    return ctx.reply(store.remove(ctx.chat.id, sym) ? `Stopped watching ${sym}.` : `You weren't watching ${sym}.`);
  });

  bot.command("list", (ctx) => {
    const mine = store.forChat(ctx.chat.id);
    return ctx.reply(mine.length ? mine.map((s) => `• ${s.symbol} ±${s.thresholdBps} bps`).join("\n") : "No alerts yet. Try /watch NVDA 50");
  });

  return bot;
}
