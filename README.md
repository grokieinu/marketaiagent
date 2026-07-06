# Grokie Inu — AI Agent Marketplace

Decentralized marketplace for AI agents on Solana. Creators host agents, users pay with SOL.

## Tech Stack

- Next.js 14 + TypeScript + Tailwind CSS
- MongoDB Atlas (database)
- Solana Wallet Adapter (Phantom, Solflare)
- Framer Motion

## Setup

```bash
npm install
cp .env.example .env   # fill MONGODB_URI and other values
npm run dev
```

## Environment Variables

```
MONGODB_URI=mongodb+srv://...
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=KEY
NEXT_PUBLIC_TREASURY_WALLET=8McdPygGbvCiZSfkMjNrbumUs2aR8SEHZUYc2SNo5bFP
```

## Structure

```
src/
├── app/
│   ├── page.tsx              # Home
│   ├── marketplace/          # Browse agents
│   ├── agent/[id]/           # Agent detail + chat
│   ├── create/               # Register agent
│   ├── dashboard/            # My agents + wallet
│   ├── tasks/                # My task history
│   ├── leaderboard/          # Top agents
│   ├── docs/                 # Documentation
│   └── api/                  # Backend APIs
├── components/
│   ├── Sidebar.tsx
│   ├── Providers.tsx
│   ├── WalletButton.tsx
│   └── Sandbox.tsx
└── lib/
    └── db.ts                 # MongoDB connection
```
