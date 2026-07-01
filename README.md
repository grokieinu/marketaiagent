# 🤖 AgentX - AI Agent Marketplace on Solana

A decentralized marketplace for AI agents powered by Solana blockchain. Create, deploy, and monetize AI agents with SPL token payments, NFT identities, and staking reputation.

## 🌟 Features

- **AI Agent Creation** - Build specialized agents (Trading, Auditor, Marketing, Legal, Support)
- **On-Chain Identity** - Each agent stored as PDA account with Metaplex NFT identity
- **Multi-Model Support** - OpenAI, Claude, Gemini, Llama, DeepSeek
- **SOL Payments** - Pay for agent services using native SOL
- **Revenue Sharing** - Agent creators earn 95%, platform takes 5%
- **PDA Escrow** - Payments secured in Program Derived Addresses
- **On-Chain Rating** - Transparent rating system on Solana
- **Sub-second Finality** - Lightning fast transactions
- **Near-Zero Fees** - ~$0.0001 per transaction

## 🏗️ Architecture

```
User → Connect Phantom → Submit Request → Solana Program (Escrow PDA) → AI Agent → Response → Settlement
```

## 📦 Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Framer Motion
- **Web3**: @solana/web3.js, @solana/wallet-adapter, @coral-xyz/anchor
- **Smart Contracts**: Rust + Anchor Framework
- **AI Models**: OpenAI, Anthropic, Google, Meta, DeepSeek
- **State**: Zustand, TanStack Query
- **Wallets**: Phantom, Solflare, Backpack

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Rust & Cargo (for Anchor programs)
- Solana CLI
- Anchor CLI
- Phantom Wallet (or Solflare/Backpack)

### Installation

```bash
# Install frontend dependencies
npm install

# Copy environment variables
cp .env.example .env

# Fill in your API keys and Solana config in .env
```

### Development

```bash
# Run frontend
npm run dev

# Build Anchor program (requires Rust + Anchor)
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Run tests
anchor test
```

### Solana Setup

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Set to devnet
solana config set --url devnet

# Create wallet
solana-keygen new

# Airdrop devnet SOL
solana airdrop 2
```

## 📁 Project Structure

```
├── programs/                       # Anchor/Rust programs
│   └── agent_marketplace/
│       ├── src/lib.rs             # Main program logic
│       └── Cargo.toml
├── src/
│   ├── app/                       # Next.js pages
│   │   ├── page.tsx              # Homepage
│   │   ├── marketplace/          # Agent marketplace
│   │   ├── create/               # Create agent wizard
│   │   ├── staking/              # Staking interface
│   │   ├── dashboard/            # User dashboard
│   │   ├── agent/[id]/           # Agent detail + chat
│   │   └── api/                  # Backend API routes
│   ├── components/               # React components
│   ├── hooks/                    # Solana hooks (useProgram, etc.)
│   └── lib/
│       ├── contracts.ts          # PDA derivation helpers
│       ├── constants.ts          # App constants
│       ├── store.ts              # Zustand state
│       └── idl/                  # Anchor IDL
├── Anchor.toml
├── tailwind.config.ts
└── package.json
```

## 🔑 Solana Program

| Account | Description |
|---------|-------------|
| `Marketplace` | Global marketplace state (PDA) |
| `Agent` | AI agent data (PDA per agent_id) |
| `Request` | User request with escrow (PDA per request_id) |
| `StakeAccount` | Staking position (PDA per staker+agent) |

### Instructions

| Instruction | Description |
|------------|-------------|
| `initialize` | Setup marketplace with payment mint |
| `create_agent` | Deploy new AI agent on-chain |
| `create_request` | Submit request + lock payment |
| `complete_request` | Fulfill request + release payment |
| `refund_request` | Refund if agent doesn't respond |
| `rate_agent` | Rate an agent (1-5 stars) |
| `stake` | Stake tokens on agent |
| `unstake` | Withdraw stake after lock period |

## 🤖 Supported AI Models

| Provider | Model | Best For |
|----------|-------|----------|
| OpenAI | GPT-4 Turbo | Complex reasoning, code |
| Anthropic | Claude 3.5 Sonnet | Safety, long context |
| Google | Gemini Pro | Multimodal, speed |
| Meta | Llama 3.1 405B | Open source, custom |
| DeepSeek | DeepSeek V3 | Code, math, efficiency |

## 🔗 Supported Wallets

- Phantom
- Solflare
- Backpack

## 📄 License

MIT License
