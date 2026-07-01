'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaRobot, FaWallet, FaHistory, FaStar, FaCoins } from 'react-icons/fa'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '@/components/WalletButton'
import Link from 'next/link'

interface Agent {
  id: string
  name: string
  specialization: string
  price: number
  endpoint: string
  rating: number
  totalRequests: number
  totalEarnings: number
  isActive: boolean
}

interface RequestItem {
  id: string
  agentId: string
  agentName: string
  prompt: string
  amount: number
  createdAt: string
}

interface Stats {
  totalAgents: number
  totalEarnings: number
  totalRequests: number
  totalSent: number
}

export default function DashboardPage() {
  const { connected, publicKey } = useWallet()
  const [activeTab, setActiveTab] = useState('overview')
  const [myAgents, setMyAgents] = useState<Agent[]>([])
  const [receivedRequests, setReceivedRequests] = useState<RequestItem[]>([])
  const [sentRequests, setSentRequests] = useState<RequestItem[]>([])
  const [stats, setStats] = useState<Stats>({ totalAgents: 0, totalEarnings: 0, totalRequests: 0, totalSent: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!connected || !publicKey) return
    setLoading(true)
    fetch(`/api/dashboard?wallet=${publicKey.toBase58()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMyAgents(data.myAgents || [])
          setReceivedRequests(data.receivedRequests || [])
          setSentRequests(data.sentRequests || [])
          setStats(data.stats || { totalAgents: 0, totalEarnings: 0, totalRequests: 0, totalSent: 0 })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [connected, publicKey])

  if (!connected) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">Connect your Solana wallet to see your dashboard</p>
          <WalletButton className="!bg-gradient-to-r !from-primary-600 !to-primary-500 !rounded-xl !font-semibold !text-base !h-12 !px-8" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-1">Dashboard</h1>
            <p className="text-sm text-gray-500 font-mono">
              {publicKey?.toBase58().slice(0, 6)}...{publicKey?.toBase58().slice(-4)}
            </p>
          </div>
          <Link href="/create" className="btn-primary text-sm px-4 py-2">
            + New Agent
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
        >
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500">My Agents</p>
            <p className="text-2xl font-bold text-white">{stats.totalAgents}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500">Total Earnings</p>
            <p className="text-2xl font-bold text-green-400">{stats.totalEarnings} SOL</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500">Requests Received</p>
            <p className="text-2xl font-bold text-white">{stats.totalRequests}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500">Requests Sent</p>
            <p className="text-2xl font-bold text-white">{stats.totalSent}</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-white/5 rounded-xl w-fit">
          {['overview', 'my agents', 'withdraw', 'received', 'sent'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? 'bg-primary-500/20 text-primary-300'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!loading && (
          <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* My Agents */}
            {(activeTab === 'overview' || activeTab === 'my agents') && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <FaRobot className="text-primary-400" />
                  My Agents
                </h2>
                {myAgents.length === 0 ? (
                  <div className="glass-card p-8 text-center">
                    <p className="text-gray-500 mb-3">You haven&apos;t created any agents yet.</p>
                    <Link href="/create" className="text-sm text-primary-400 hover:text-primary-300">
                      Create your first agent →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myAgents.map((agent) => (
                      <div key={agent.id} className="glass-card p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <Link href={`/agent/${agent.id}`} className="font-bold text-white hover:text-primary-300 transition-colors">
                              {agent.name}
                            </Link>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-400 capitalize">{agent.specialization}</span>
                              <span className="text-xs text-gray-500">
                                {agent.price === 0 ? 'Free' : `${agent.price} SOL`}
                              </span>
                              {agent.rating > 0 && (
                                <span className="text-xs text-yellow-400 flex items-center gap-1">
                                  <FaStar className="text-[10px]" /> {agent.rating}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-white">{agent.totalRequests} requests</p>
                            <p className="text-xs text-green-400">{agent.totalEarnings.toFixed(4)} SOL earned</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Withdraw Credits */}
            {activeTab === 'withdraw' && (
              <WithdrawSection wallet={publicKey?.toBase58() || ''} />
            )}

            {/* Received Requests */}
            {(activeTab === 'overview' || activeTab === 'received') && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <FaCoins className="text-green-400" />
                  Requests Received
                </h2>
                {receivedRequests.length === 0 ? (
                  <div className="glass-card p-6 text-center">
                    <p className="text-gray-500 text-sm">No requests received yet.</p>
                  </div>
                ) : (
                  <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="text-left px-4 py-3 text-xs text-gray-400">Agent</th>
                            <th className="text-left px-4 py-3 text-xs text-gray-400">Prompt</th>
                            <th className="text-right px-4 py-3 text-xs text-gray-400">Amount</th>
                            <th className="text-right px-4 py-3 text-xs text-gray-400">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receivedRequests.map((req) => (
                            <tr key={req.id} className="border-b border-white/5">
                              <td className="px-4 py-3 text-white font-medium">{req.agentName}</td>
                              <td className="px-4 py-3 text-gray-400 truncate max-w-[200px]">{req.prompt}</td>
                              <td className="px-4 py-3 text-right text-green-400">
                                {req.amount > 0 ? `+${(req.amount * 0.95).toFixed(4)} SOL` : 'Free'}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-500 text-xs">
                                {new Date(req.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sent Requests */}
            {(activeTab === 'overview' || activeTab === 'sent') && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <FaHistory className="text-primary-400" />
                  Requests Sent
                </h2>
                {sentRequests.length === 0 ? (
                  <div className="glass-card p-6 text-center">
                    <p className="text-gray-500 text-sm">You haven&apos;t sent any requests yet.</p>
                    <Link href="/marketplace" className="text-sm text-primary-400 hover:text-primary-300 mt-2 inline-block">
                      Browse agents →
                    </Link>
                  </div>
                ) : (
                  <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="text-left px-4 py-3 text-xs text-gray-400">Agent</th>
                            <th className="text-left px-4 py-3 text-xs text-gray-400">Prompt</th>
                            <th className="text-right px-4 py-3 text-xs text-gray-400">Cost</th>
                            <th className="text-right px-4 py-3 text-xs text-gray-400">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sentRequests.map((req) => (
                            <tr key={req.id} className="border-b border-white/5">
                              <td className="px-4 py-3 text-white font-medium">{req.agentName}</td>
                              <td className="px-4 py-3 text-gray-400 truncate max-w-[200px]">{req.prompt}</td>
                              <td className="px-4 py-3 text-right text-gray-300">
                                {req.amount > 0 ? `${req.amount} SOL` : 'Free'}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-500 text-xs">
                                {new Date(req.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        )}
      </div>
    </div>
  )
}

// Withdraw Section Component
function WithdrawSection({ wallet }: { wallet: string }) {
  const [earnings, setEarnings] = useState<any>(null)
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!wallet) return
    fetch(`/api/withdraw?wallet=${wallet}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setEarnings(data.earnings)
          setWithdrawals(data.withdrawals || [])
        }
      })
  }, [wallet])

  const handleWithdraw = async () => {
    const credits = parseInt(withdrawAmount)
    if (!credits || credits < 1) return
    setSubmitting(true)
    setMessage('')

    const res = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, credits }),
    })
    const data = await res.json()

    if (data.success) {
      setMessage('✅ Withdrawal request submitted! Waiting for admin approval.')
      setWithdrawAmount('')
      // Refresh
      const refreshRes = await fetch(`/api/withdraw?wallet=${wallet}`)
      const refreshData = await refreshRes.json()
      if (refreshData.success) {
        setEarnings(refreshData.earnings)
        setWithdrawals(refreshData.withdrawals || [])
      }
    } else {
      setMessage(data.error || 'Failed to submit withdrawal')
    }
    setSubmitting(false)
  }

  if (!earnings) {
    return <div className="glass-card p-6 text-center text-gray-500 text-sm">Loading...</div>
  }

  return (
    <div className="mb-8 space-y-6">
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <FaWallet className="text-primary-400" />
        Withdraw Credits
      </h2>

      {/* Balance */}
      <div className="glass-card p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Total Earned</p>
            <p className="text-xl font-bold text-white">{earnings.totalEarned}</p>
            <p className="text-xs text-gray-500">credits</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Withdrawn</p>
            <p className="text-xl font-bold text-gray-400">{earnings.totalWithdrawn}</p>
            <p className="text-xs text-gray-500">credits</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Available</p>
            <p className="text-xl font-bold text-green-400">{earnings.available}</p>
            <p className="text-xs text-gray-500">credits</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">SOL Value</p>
            <p className="text-xl font-bold text-accent-cyan">{earnings.availableSol}</p>
            <p className="text-xs text-gray-500">SOL</p>
          </div>
        </div>
      </div>

      {/* Withdraw Form */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-medium text-white mb-3">Request Withdrawal</h3>
        <p className="text-xs text-gray-500 mb-4">
          Minimum: {earnings.minWithdrawal} credits. Rate: 1 credit = {earnings.rate} SOL.
          Admin will review and send SOL to your wallet.
        </p>

        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.startsWith('✅') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {message}
          </div>
        )}

        <div className="flex gap-3">
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder={`Min ${earnings.minWithdrawal} credits`}
            min={earnings.minWithdrawal}
            max={earnings.available}
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
          />
          <button
            onClick={handleWithdraw}
            disabled={submitting || !withdrawAmount || parseInt(withdrawAmount) < earnings.minWithdrawal}
            className="px-5 py-2.5 bg-primary-600/20 border border-primary-500/30 rounded-xl text-sm text-primary-300 font-medium hover:bg-primary-600/30 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Submitting...' : 'Withdraw'}
          </button>
        </div>
        {withdrawAmount && parseInt(withdrawAmount) >= earnings.minWithdrawal && (
          <p className="text-xs text-gray-400 mt-2">
            You will receive: ~{(parseInt(withdrawAmount) * earnings.rate).toFixed(4)} SOL
          </p>
        )}
      </div>

      {/* Withdrawal History */}
      {withdrawals.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-white mb-3">Withdrawal History</h3>
          <div className="space-y-2">
            {withdrawals.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div>
                  <p className="text-sm text-white">{w.credits} credits → {w.solAmount} SOL</p>
                  <p className="text-xs text-gray-500">{new Date(w.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  w.status === 'paid' ? 'bg-green-500/10 text-green-400' :
                  w.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                  w.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                  'bg-gray-500/10 text-gray-400'
                }`}>
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
