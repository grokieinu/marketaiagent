'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaRobot, FaHistory, FaStar, FaCoins, FaEdit, FaSave, FaTimes, FaToggleOn, FaToggleOff } from 'react-icons/fa'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '@/components/WalletButton'
import Link from 'next/link'

interface Agent {
  id: string
  name: string
  description: string
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
  agentName: string
  prompt: string
  amount: number
  createdAt: string
}

export default function DashboardPage() {
  const { connected, publicKey } = useWallet()
  const [activeTab, setActiveTab] = useState('my agents')
  const [myAgents, setMyAgents] = useState<Agent[]>([])
  const [receivedRequests, setReceivedRequests] = useState<RequestItem[]>([])
  const [sentRequests, setSentRequests] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Agent>>({})
  const [saveMsg, setSaveMsg] = useState('')

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
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [connected, publicKey])

  const startEdit = (agent: Agent) => {
    setEditingId(agent.id)
    setEditForm({ name: agent.name, description: agent.description, price: agent.price, endpoint: agent.endpoint })
    setSaveMsg('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
    setSaveMsg('')
  }

  const saveEdit = async (agentId: string) => {
    if (!publicKey) return
    setSaveMsg('')
    const res = await fetch('/api/agent/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, wallet: publicKey.toBase58(), updates: editForm }),
    })
    const data = await res.json()
    if (data.success) {
      setMyAgents((prev) => prev.map((a) => a.id === agentId ? { ...a, ...data.agent } : a))
      setEditingId(null)
      setSaveMsg('Saved!')
      setTimeout(() => setSaveMsg(''), 2000)
    } else {
      setSaveMsg(data.error || 'Failed to save')
    }
  }

  const toggleActive = async (agent: Agent) => {
    if (!publicKey) return
    const res = await fetch('/api/agent/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: agent.id, wallet: publicKey.toBase58(), updates: { isActive: !agent.isActive } }),
    })
    const data = await res.json()
    if (data.success) {
      setMyAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, isActive: !a.isActive } : a))
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">Connect your Solana wallet to manage your agents</p>
          <WalletButton className="!bg-gradient-to-r !from-primary-600 !to-primary-500 !rounded-xl !font-semibold !text-base !h-12 !px-8" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-1">Dashboard</h1>
            <p className="text-sm text-gray-500 font-mono">{publicKey?.toBase58().slice(0, 6)}...{publicKey?.toBase58().slice(-4)}</p>
          </div>
          <Link href="/create" className="btn-primary text-sm px-4 py-2">+ New Agent</Link>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500">My Agents</p>
            <p className="text-2xl font-bold text-white">{myAgents.length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500">Total Earnings</p>
            <p className="text-2xl font-bold text-green-400">{myAgents.reduce((s, a) => s + a.totalEarnings, 0).toFixed(4)} SOL</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500">Requests Received</p>
            <p className="text-2xl font-bold text-white">{myAgents.reduce((s, a) => s + a.totalRequests, 0)}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-gray-500">Requests Sent</p>
            <p className="text-2xl font-bold text-white">{sentRequests.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-white/5 rounded-xl w-fit">
          {['my agents', 'wallet', 'received', 'sent'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-primary-500/20 text-primary-300' : 'text-gray-400 hover:text-white'}`}
            >{tab}</button>
          ))}
        </div>

        {loading && <div className="text-center py-12"><div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" /></div>}

        {!loading && (
          <>
            {/* My Agents — Edit */}
            {activeTab === 'my agents' && (
              <div className="space-y-4">
                {saveMsg && <p className={`text-sm ${saveMsg === 'Saved!' ? 'text-green-400' : 'text-red-400'}`}>{saveMsg}</p>}
                {myAgents.length === 0 ? (
                  <div className="glass-card p-8 text-center">
                    <p className="text-gray-500 mb-3">No agents yet.</p>
                    <Link href="/create" className="text-sm text-primary-400">Create your first agent →</Link>
                  </div>
                ) : (
                  myAgents.map((agent) => (
                    <div key={agent.id} className="glass-card p-5">
                      {editingId === agent.id ? (
                        // EDIT MODE
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-white">Editing: {agent.name}</h3>
                            <div className="flex gap-2">
                              <button onClick={() => saveEdit(agent.id)} className="px-3 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs flex items-center gap-1"><FaSave /> Save</button>
                              <button onClick={cancelEdit} className="px-3 py-1 rounded-lg bg-white/5 text-gray-400 text-xs flex items-center gap-1"><FaTimes /> Cancel</button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-gray-500">Name</label>
                              <input value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} maxLength={32}
                                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500/50" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Price (SOL, 0 = free)</label>
                              <input type="number" step="any" min="0" value={editForm.price ?? ''} onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                                className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500/50" />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Endpoint URL</label>
                            <input value={editForm.endpoint || ''} onChange={(e) => setEditForm({ ...editForm, endpoint: e.target.value })}
                              className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-primary-500/50" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Description</label>
                            <textarea value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2}
                              className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500/50 resize-y" />
                          </div>
                        </div>
                      ) : (
                        // VIEW MODE
                        <div>
                          <div className="flex items-center justify-between">
                            <div>
                              <Link href={`/agent/${agent.id}`} className="font-bold text-white hover:text-primary-300">{agent.name}</Link>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-gray-400 capitalize">{agent.specialization}</span>
                                <span className="text-xs text-gray-500">{agent.price === 0 ? 'Free' : `${agent.price} SOL`}</span>
                                {agent.rating > 0 && <span className="text-xs text-yellow-400 flex items-center gap-1"><FaStar className="text-[10px]" /> {agent.rating}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleActive(agent)} title={agent.isActive ? 'Deactivate' : 'Activate'}
                                className={`p-1.5 rounded-lg ${agent.isActive ? 'text-green-400 hover:bg-green-500/10' : 'text-gray-500 hover:bg-white/5'}`}>
                                {agent.isActive ? <FaToggleOn className="text-lg" /> : <FaToggleOff className="text-lg" />}
                              </button>
                              <button onClick={() => startEdit(agent)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5">
                                <FaEdit />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5 text-xs text-gray-500">
                            <span>{agent.totalRequests} requests</span>
                            <span className="text-green-400">{agent.totalEarnings.toFixed(4)} SOL earned</span>
                            <span className={agent.isActive ? 'text-green-400' : 'text-red-400'}>{agent.isActive ? '● Active' : '● Inactive'}</span>
                            <span className="font-mono truncate max-w-[150px]">{agent.endpoint}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Wallet - Deposit & Withdraw */}
            {activeTab === 'wallet' && (
              <WalletSection wallet={publicKey?.toBase58() || ''} />
            )}

            {/* Received */}
            {activeTab === 'received' && (
              <div>
                {receivedRequests.length === 0 ? (
                  <div className="glass-card p-6 text-center text-gray-500 text-sm">No requests received yet.</div>
                ) : (
                  <div className="glass-card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-white/5">
                        <th className="text-left px-4 py-3 text-xs text-gray-400">Agent</th>
                        <th className="text-left px-4 py-3 text-xs text-gray-400">Prompt</th>
                        <th className="text-right px-4 py-3 text-xs text-gray-400">Earned</th>
                        <th className="text-right px-4 py-3 text-xs text-gray-400">Date</th>
                      </tr></thead>
                      <tbody>
                        {receivedRequests.map((req) => (
                          <tr key={req.id} className="border-b border-white/5">
                            <td className="px-4 py-3 text-white">{req.agentName}</td>
                            <td className="px-4 py-3 text-gray-400 truncate max-w-[200px]">{req.prompt}</td>
                            <td className="px-4 py-3 text-right text-green-400">{req.amount > 0 ? `+${(req.amount * 0.9).toFixed(4)} SOL` : 'Free'}</td>
                            <td className="px-4 py-3 text-right text-gray-500 text-xs">{new Date(req.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sent */}
            {activeTab === 'sent' && (
              <div>
                {sentRequests.length === 0 ? (
                  <div className="glass-card p-6 text-center text-gray-500 text-sm">No requests sent yet. <Link href="/marketplace" className="text-primary-400">Browse agents →</Link></div>
                ) : (
                  <div className="glass-card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-white/5">
                        <th className="text-left px-4 py-3 text-xs text-gray-400">Agent</th>
                        <th className="text-left px-4 py-3 text-xs text-gray-400">Prompt</th>
                        <th className="text-right px-4 py-3 text-xs text-gray-400">Cost</th>
                        <th className="text-right px-4 py-3 text-xs text-gray-400">Date</th>
                      </tr></thead>
                      <tbody>
                        {sentRequests.map((req) => (
                          <tr key={req.id} className="border-b border-white/5">
                            <td className="px-4 py-3 text-white">{req.agentName}</td>
                            <td className="px-4 py-3 text-gray-400 truncate max-w-[200px]">{req.prompt}</td>
                            <td className="px-4 py-3 text-right text-gray-300">{req.amount > 0 ? `${req.amount} SOL` : 'Free'}</td>
                            <td className="px-4 py-3 text-right text-gray-500 text-xs">{new Date(req.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ===== Wallet Section: Deposit & Withdraw =====
function WalletSection({ wallet }: { wallet: string }) {
  const { publicKey, sendTransaction } = useWallet()
  const [balance, setBalance] = useState(0)
  const [earnings, setEarnings] = useState(0)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!wallet) return
    // Fetch balance from database
    fetch(`/api/wallet?wallet=${wallet}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setBalance(d.balance || 0)
          setEarnings(d.earnings || 0)
        }
      })
      .catch(() => {})
  }, [wallet])

  const handleDeposit = async () => {
    if (!publicKey || !sendTransaction) return
    const amount = parseFloat(depositAmount)
    if (!amount || amount <= 0) return
    setProcessing(true)
    setMessage('')

    try {
      const { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js')
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com')
      const treasuryWallet = new PublicKey('8McdPygGbvCiZSfkMjNrbumUs2aR8SEHZUYc2SNo5bFP')
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL)

      const transaction = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: treasuryWallet, lamports })
      )
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      const sig = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(sig, 'confirmed')

      // Record deposit in database
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, action: 'deposit', amount, txSignature: sig }),
      })
      const data = await res.json()
      if (data.success) {
        setBalance(data.balance)
        setDepositAmount('')
        setMessage(`✅ Deposited ${amount} SOL successfully!`)
      }
    } catch (err: any) {
      setMessage(err.message || 'Deposit failed')
    }
    setProcessing(false)
  }

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount <= 0 || amount > balance) return
    setProcessing(true)
    setMessage('')

    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, action: 'withdraw', amount }),
      })
      const data = await res.json()
      if (data.success) {
        setBalance(data.balance)
        setWithdrawAmount('')
        setMessage(`✅ Withdrawal of ${amount} SOL processed!`)
      } else {
        setMessage(data.error || 'Withdrawal failed')
      }
    } catch {
      setMessage('Withdrawal failed')
    }
    setProcessing(false)
  }

  const handleCreatorWithdraw = async () => {
    if (earnings < 0.5) {
      setMessage('Minimum withdrawal is 0.5 SOL')
      return
    }
    setProcessing(true)
    setMessage('')

    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, action: 'creator_withdraw' }),
      })
      const data = await res.json()
      if (data.success) {
        setEarnings(0)
        setMessage(`✅ Withdrawn ${data.amount} SOL to your wallet!`)
      } else {
        setMessage(data.error || 'Withdrawal failed')
      }
    } catch {
      setMessage('Withdrawal failed')
    }
    setProcessing(false)
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.startsWith('✅') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {message}
        </div>
      )}

      {/* Balances */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card p-5 text-center">
          <p className="text-xs text-gray-500 mb-1">User Balance</p>
          <p className="text-3xl font-bold text-white">{balance.toFixed(4)}</p>
          <p className="text-xs text-gray-500">SOL available for agents</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-xs text-gray-500 mb-1">Creator Earnings</p>
          <p className="text-3xl font-bold text-green-400">{earnings.toFixed(4)}</p>
          <p className="text-xs text-gray-500">SOL (min 0.5 to withdraw)</p>
        </div>
      </div>

      {/* Deposit */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-white mb-3">💰 Deposit SOL</h3>
        <p className="text-xs text-gray-500 mb-3">Deposit SOL to use paid AI agents. No wallet popup per request after deposit.</p>
        <div className="flex gap-2">
          <input type="number" step="any" min="0" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="Amount in SOL (e.g. 0.5)"
            className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500/50" />
          <button onClick={handleDeposit} disabled={processing || !depositAmount}
            className="px-5 py-2.5 btn-primary text-sm disabled:opacity-50">
            {processing ? '...' : 'Deposit'}
          </button>
        </div>
        <div className="flex gap-2 mt-2">
          {[0.1, 0.5, 1, 2].map((amt) => (
            <button key={amt} onClick={() => setDepositAmount(String(amt))}
              className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10">
              {amt} SOL
            </button>
          ))}
        </div>
      </div>

      {/* User Withdraw */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-white mb-3">📤 Withdraw Balance</h3>
        <p className="text-xs text-gray-500 mb-3">Withdraw unused SOL back to your wallet. Gas fee paid by you.</p>
        <div className="flex gap-2">
          <input type="number" step="any" min="0" max={balance} value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder={`Max: ${balance.toFixed(4)} SOL`}
            className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500/50" />
          <button onClick={handleWithdraw} disabled={processing || !withdrawAmount || parseFloat(withdrawAmount) > balance}
            className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 disabled:opacity-50">
            Withdraw
          </button>
        </div>
      </div>

      {/* Creator Withdraw Earnings */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-bold text-white mb-3">🏦 Withdraw Creator Earnings</h3>
        <p className="text-xs text-gray-500 mb-3">Withdraw accumulated earnings to your wallet. Min: 0.5 SOL. Gas fee paid by you.</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-green-400">{earnings.toFixed(4)} SOL</p>
            <p className="text-xs text-gray-500">{earnings >= 0.5 ? '✅ Ready to withdraw' : `⏳ Need ${(0.5 - earnings).toFixed(4)} more SOL`}</p>
          </div>
          <button onClick={handleCreatorWithdraw} disabled={processing || earnings < 0.5}
            className="px-5 py-2.5 btn-primary text-sm disabled:opacity-50">
            Withdraw All
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 rounded-lg bg-white/5 border border-white/10">
        <h4 className="text-xs font-medium text-white mb-2">How it works:</h4>
        <ul className="space-y-1 text-xs text-gray-500">
          <li>• Deposit SOL once → use agents without wallet popup each time</li>
          <li>• Each request deducts from your balance automatically</li>
          <li>• Withdraw unused balance anytime (self-service)</li>
          <li>• Creators earn 90% of each request, platform takes 10%</li>
          <li>• Creators can withdraw when earnings ≥ 0.5 SOL</li>
          <li>• All gas fees paid by the person initiating the transaction</li>
        </ul>
      </div>
    </div>
  )
}
