# oracle-alerts

**Open Oracle** · Telegram bot that alerts you when a tokenized stock drifts from its real price.

Reads [`stocks-monitor`](https://github.com/openoracle-evm/stocks-monitor) and sends:

- 🚨 **Premium / discount alerts** when |token price − Pyth price| crosses your threshold (with cooldown + hysteresis, no spam)
- 🟢🔴 **Market open / close** notices for the stocks you watch

## Commands

| Command | |
|---|---|
| `/markets` | all tracked markets |
| `/price NVDA` | one market |
| `/watch NVDA 75` | alert at ±75 bps (default 50) |
| `/unwatch NVDA` | stop |
| `/list` | your alerts |

## Run

1. Create a bot with **@BotFather** on Telegram, copy the token.
2. Start [`stocks-monitor`](https://github.com/openoracle-evm/stocks-monitor).
3. Then:

```bash
npm install
cp .env.example .env   # paste TELEGRAM_BOT_TOKEN
npm run dev
```

Subscriptions are stored in `data/subscriptions.json`.

## Docker

```bash
docker build -t oracle-alerts .
docker run --env-file .env -v $(pwd)/data:/app/data oracle-alerts
```

## License

MIT
