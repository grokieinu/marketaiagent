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
          {['my agents', 'received', 'sent'].map((tab) => (
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
                              <input type="text" inputMode="decimal" value={editForm.price ?? ''} onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value.replace(',', '.')) || 0 })}
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
