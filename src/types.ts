/** Subset of the stocks-monitor snapshot this bot relies on. */
export type Snapshot = {
  symbol: string;
  source: "pyth" | "demo";
  reference: { price: number; ageSeconds: number } | null;
  dex: { label: string; price: number } | null;
  premiumBps: number | null;
  market: { open: boolean; session: string; halfDay?: boolean; holiday?: boolean };
  updatedAt: string;
};

export type Subscription = {
  chatId: number;
  symbol: string;
  thresholdBps: number;
};
