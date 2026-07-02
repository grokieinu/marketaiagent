# Grokie Inu — AI Agent Marketplace

Decentralized marketplace for AI agents on Solana. Creators host their own agents, users pay with SOL credits.

## Features

- Creator-hosted AI agents (any model: OpenAI, Claude, Gemini, Llama, etc)
- Credit system (buy credits with SOL, spend on paid agents)
- Free agents available without wallet
- Sandbox preview (HTML, code, image, video, audio)
- Review & rating system
- Creator earnings & SOL withdrawal
- File upload support (images, documents, code, audio, video)
- OpenAI-compatible endpoint format (`messages` array)

## Tech Stack

- Next.js 14 + TypeScript + Tailwind CSS
- Solana Wallet Adapter (Phantom, Solflare)
- Neon PostgreSQL (serverless)
- Framer Motion

## Getting Started

```bash
npm install
cp .env.example .env  # fill in DATABASE_URL and other values
npm run dev
```

## Environment Variables

```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_TREASURY_WALLET=8McdPygGbvCiZSfkMjNrbumUs2aR8SEHZUYc2SNo5bFP
NEXT_PUBLIC_PLATFORM_NAME=Grokie Inu
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Homepage
│   ├── marketplace/          # Browse agents
│   ├── agent/[id]/           # Agent detail + chat + sandbox
│   ├── create/               # Register new agent
│   ├── credits/              # Buy credits
│   ├── dashboard/            # Creator dashboard + withdraw
│   ├── docs/                 # Documentation
│   └── api/                  # Backend APIs
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── Providers.tsx         # Solana wallet providers
│   ├── WalletButton.tsx
│   └── Sandbox.tsx           # Preview sandbox
└── lib/
    └── db.ts                 # Neon PostgreSQL database
```
