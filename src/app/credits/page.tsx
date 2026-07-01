'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaCoins, FaCheck } from 'react-icons/fa'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '@/components/WalletButton'

interface CreditPack {
  id: string
  credits: number
  price: number
  label: string
  popular: boolean
}

export default function CreditsPage() {
  const { connected, publicKey, sendTransaction } = useWallet()
  const [balance, setBalance] = useState(0)
  const [packs, setPacks] = useState<CreditPack[]>([])
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!connected || !publicKey) return
    fetch(`/api/credits?wallet=${publicKey.toBase58()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setBalance(data.credits.balance)
          setPacks(data.packs || [])
        }
      })
  }, [connected, publicKey])

  const handlePurchase = async (pack: CreditPack) => {
    if (!connected || !publicKey || !sendTransaction) return
    setPurchasing(pack.id)
    setMessage('')

    try {
      // Create SOL transfer to treasury
      const { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js')

      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
      )

      const treasuryWallet = new PublicKey('8McdPygGbvCiZSfkMjNrbumUs2aR8SEHZUYc2SNo5bFP')
      const lamports = Math.floor(pack.price * LAMPORTS_PER_SOL)

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasuryWallet,
          lamports,
        })
      )

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      const sig = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(sig, 'confirmed')

      // Record purchase in database
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          packId: pack.id,
          txSignature: sig,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setBalance(data.credits.balance)
        setMessage(`✅ Successfully purchased ${pack.credits} credits!`)
      }
    } catch (err: any) {
      setMessage(err.message || 'Purchase failed')
    } finally {
      setPurchasing(null)
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">🪙</div>
          <h2 className="text-2xl font-bold text-white mb-3">Connect Wallet to Buy Credits</h2>
          <p className="text-gray-400 mb-6">Credits are used to interact with paid AI agents</p>
          <WalletButton className="!bg-gradient-to-r !from-primary-600 !to-primary-500 !rounded-xl !font-semibold !text-base !h-12 !px-8" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl font-bold gradient-text mb-3">Buy Credits</h1>
          <p className="text-gray-400">Credits are used to interact with paid AI agents. Free agents don&apos;t require credits.</p>
        </motion.div>

        {/* Current Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-6 mb-8 text-center"
        >
          <p className="text-sm text-gray-400 mb-1">Your Balance</p>
          <div className="flex items-center justify-center gap-2">
            <FaCoins className="text-yellow-400 text-xl" />
            <span className="text-4xl font-bold text-white">{balance}</span>
            <span className="text-gray-400">credits</span>
          </div>
        </motion.div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl text-sm text-center ${message.startsWith('✅') ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            {message}
          </div>
        )}

        {/* Credit Packs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
        >
          {packs.map((pack) => (
            <div
              key={pack.id}
              className={`glass-card p-6 relative ${pack.popular ? 'border-primary-500/30 shadow-lg shadow-primary-500/10' : ''}`}
            >
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary-500 text-xs text-white font-medium">
                  Popular
                </div>
              )}
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-white">{pack.credits}</p>
                <p className="text-sm text-gray-400">credits</p>
              </div>
              <div className="text-center mb-4">
                <span className="text-2xl font-bold text-white">{pack.price}</span>
                <span className="text-gray-400 ml-1">SOL</span>
              </div>
              <p className="text-xs text-gray-500 text-center mb-4">
                {(pack.price / pack.credits * 1000).toFixed(1)} SOL per 1000 credits
              </p>
              <button
                onClick={() => handlePurchase(pack)}
                disabled={purchasing !== null}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {purchasing === pack.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaCoins className="text-sm" />
                    Buy {pack.label}
                  </>
                )}
              </button>
            </div>
          ))}
        </motion.div>

        {/* Info */}
        <div className="glass-card p-5">
          <h3 className="font-medium text-white mb-3">How Credits Work</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <FaCheck className="text-green-400 mt-0.5 flex-shrink-0 text-xs" />
              Buy credits once, use across all paid agents
            </li>
            <li className="flex items-start gap-2">
              <FaCheck className="text-green-400 mt-0.5 flex-shrink-0 text-xs" />
              Each agent shows its cost per request in credits
            </li>
            <li className="flex items-start gap-2">
              <FaCheck className="text-green-400 mt-0.5 flex-shrink-0 text-xs" />
              Credits never expire — use them anytime
            </li>
            <li className="flex items-start gap-2">
              <FaCheck className="text-green-400 mt-0.5 flex-shrink-0 text-xs" />
              Free agents don&apos;t require any credits
            </li>
            <li className="flex items-start gap-2">
              <FaCheck className="text-green-400 mt-0.5 flex-shrink-0 text-xs" />
              Credits are refunded if an agent fails to respond
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
