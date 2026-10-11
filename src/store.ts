import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Subscription } from "./types.js";

/** Tiny JSON-file store for subscriptions — enough for a single bot instance. */
export class SubscriptionStore {
  private subs: Subscription[] = [];

  constructor(private readonly file: string | null) {
    if (!file) return;
    try {
      this.subs = JSON.parse(readFileSync(file, "utf8")) as Subscription[];
    } catch {
      this.subs = [];
    }
  }

  all(): Subscription[] {
    return [...this.subs];
  }

  forChat(chatId: number): Subscription[] {
    return this.subs.filter((s) => s.chatId === chatId);
  }

  upsert(sub: Subscription) {
    this.subs = this.subs.filter((s) => !(s.chatId === sub.chatId && s.symbol === sub.symbol));
    this.subs.push(sub);
    this.save();
  }

  remove(chatId: number, symbol: string): boolean {
    const before = this.subs.length;
    this.subs = this.subs.filter((s) => !(s.chatId === chatId && s.symbol === symbol.toUpperCase()));
    this.save();
    return this.subs.length < before;
  }

  private save() {
    if (!this.file) return;
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(this.file, JSON.stringify(this.subs, null, 2));
  }
}
