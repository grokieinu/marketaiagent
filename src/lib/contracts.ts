import { PublicKey } from '@solana/web3.js'

// Program address
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || 'AGTx1111111111111111111111111111111111111111'
)

// Platform treasury wallet - receives 5% fee from every transaction
export const TREASURY_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_TREASURY_WALLET || '8McdPygGbvCiZSfkMjNrbumUs2aR8SEHZUYc2SNo5bFP'
)

// Platform fee: 5% (500 basis points)
export const PLATFORM_FEE_BPS = 500

// PDA Seeds
export const MARKETPLACE_SEED = 'marketplace'
export const AGENT_SEED = 'agent'
export const REQUEST_SEED = 'request'

// Derive PDAs
export function getMarketplacePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(MARKETPLACE_SEED)],
    PROGRAM_ID
  )
}

export function getAgentPDA(agentId: number): [PublicKey, number] {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(BigInt(agentId))
  return PublicKey.findProgramAddressSync(
    [Buffer.from(AGENT_SEED), buf],
    PROGRAM_ID
  )
}

export function getRequestPDA(requestId: number): [PublicKey, number] {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(BigInt(requestId))
  return PublicKey.findProgramAddressSync(
    [Buffer.from(REQUEST_SEED), buf],
    PROGRAM_ID
  )
}

// Helper: SOL lamports to SOL display
export function lamportsToSol(lamports: number): string {
  return (lamports / 1_000_000_000).toFixed(4)
}

// Helper: SOL display to lamports
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000)
}

// Solana explorer URL helper
export function getExplorerUrl(signature: string, network: 'mainnet-beta' | 'devnet' = 'devnet') {
  return `https://explorer.solana.com/tx/${signature}?cluster=${network}`
}

export function getAccountExplorerUrl(address: string, network: 'mainnet-beta' | 'devnet' = 'devnet') {
  return `https://explorer.solana.com/address/${address}?cluster=${network}`
}
