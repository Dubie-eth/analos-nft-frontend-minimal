## Analos Telegram Mint Tracker (Standalone)

A minimal standalone Node/TypeScript service that listens to Analos NFT Launchpad Core mints and posts to Telegram.

### Prerequisites
- Node 20+
- A Telegram bot token and a target chat/channel ID (add the bot to the chat and grant posting rights)

### Setup
```bash
cd telegram-mint-tracker
cp .env.example .env
# fill TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
npm install
```

### Run (dev)
```bash
npm run dev
```

### Build & Run (prod)
```bash
npm run build
npm start
```

### Docker
```bash
# Build
docker build -t analos-telegram-mint-tracker .
# Run
docker run --env-file .env --rm analos-telegram-mint-tracker
```

### Notes
- Uses program account subscription to detect `NftRecord` creation/changes.
- Decodes accounts via Anchor IDL.
- Image fetch is omitted for now; can be extended once a stable metadata URI strategy is finalized.
