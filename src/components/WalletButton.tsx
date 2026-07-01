'use client'

import dynamic from 'next/dynamic'

// Dynamically import WalletMultiButton with SSR disabled
// This prevents hydration mismatch because the wallet adapter
// renders differently on server vs client (icons, wallet state)
const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
)

export function WalletButton({ className }: { className?: string }) {
  return <WalletMultiButtonDynamic className={className} />
}
