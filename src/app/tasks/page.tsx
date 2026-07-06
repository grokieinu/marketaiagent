'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaCheck, FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '@/components/WalletButton'
import Link from 'next/link'

interface Task {
  id: string
  agentId: string
  agentName: string
  prompt: string
  response: string
  amount: number
  createdAt: string
  status: 'completed' | 'failed'
  specialization?: string
}

const ITEMS_PER_PAGE = 10

export default function MyTasksPage() {
  const { connected, publicKey } = useWallet()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!connected || !publicKey) return
    setLoading(true)
    fetch(`/api/tasks?wallet=${publicKey.toBase58()}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { tasks: [] })
      .then(d => {
        setTasks(d.tasks || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [connected, publicKey])

  if (!connected) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">📋</div>
          <h2 className="text-2xl font-bold text-white mb-3">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">Connect wallet to see your task history</p>
          <WalletButton className="!bg-gradient-to-r !from-primary-600 !to-primary-500 !rounded-xl !font-semibold !text-base !h-12 !px-8" />
        </div>
      </div>
    )
  }

  const totalPages = Math.ceil(tasks.length / ITEMS_PER_PAGE)
  const paginatedTasks = tasks.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  // Stats for charts
  const completedCount = tasks.filter(t => t.status === 'completed').length
  const failedCount = tasks.filter(t => t.status === 'failed').length
  const totalCost = tasks.reduce((s, t) => s + t.amount, 0)

  // Usage last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const dayStr = date.toLocaleDateString('en', { weekday: 'short' })
    const count = tasks.filter(t => {
      const d = new Date(t.createdAt)
      return d.toDateString() === date.toDateString()
    }).length
    return { day: dayStr, count }
  })
  const maxCount = Math.max(...last7Days.map(d => d.count), 1)

  // Category breakdown
  const catMap: Record<string, number> = {}
  tasks.forEach(t => {
    const cat = t.specialization || 'other'
    catMap[cat] = (catMap[cat] || 0) + 1
  })
  const categories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const catColors = ['text-blue-400', 'text-red-400', 'text-green-400', 'text-yellow-400', 'text-purple-400', 'text-gray-400']

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-white">My Tasks</h1>
        <p className="text-xs text-gray-500">Monitor all your AI agent requests and activities</p>
      </motion.div>

      {loading ? (
        <div className="text-center py-12"><div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto" /></div>
      ) : tasks.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-gray-500 mb-3">No tasks yet.</p>
          <Link href="/marketplace" className="text-sm text-primary-400">Browse agents to get started →</Link>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Usage Chart */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-white mb-4">Usage (Last 7 Days)</h3>
              <div className="flex items-end justify-between gap-1 h-32">
                {last7Days.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-400">{d.count}</span>
                    <div className="w-full bg-primary-500/20 rounded-t relative" style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? '8px' : '2px' }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-primary-600 to-primary-400 rounded-t" />
                    </div>
                    <span className="text-[9px] text-gray-500">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold text-white mb-4">Agent Categories</h3>
              <div className="flex items-center gap-4">
                {/* Donut placeholder */}
                <div className="w-24 h-24 rounded-full border-4 border-primary-500/30 flex items-center justify-center flex-shrink-0">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold text-white">{tasks.length}</p>
                  </div>
                </div>
                {/* Legend */}
                <div className="space-y-1.5 flex-1">
                  {categories.map(([cat, count], i) => (
                    <div key={cat} className="flex items-center justify-between text-xs">
                      <span className={`flex items-center gap-1.5 ${catColors[i]}`}>
                        <span className="w-2 h-2 rounded-full bg-current" />
                        <span className="capitalize">{cat}</span>
                      </span>
                      <span className="text-gray-400">{Math.round((count / tasks.length) * 100)}% ({count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="glass-card p-3 text-center">
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-xl font-bold text-green-400">{completedCount}</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-xs text-gray-500">Failed</p>
              <p className="text-xl font-bold text-red-400">{failedCount}</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-xs text-gray-500">Total Spent</p>
              <p className="text-xl font-bold text-white">{totalCost.toFixed(4)} SOL</p>
            </div>
          </div>

          {/* Table */}
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">All Requests (Max 100)</h3>
              <span className="text-[10px] text-gray-500">Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, tasks.length)} of {tasks.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400">
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Agent</th>
                    <th className="text-left px-4 py-3">Prompt</th>
                    <th className="text-right px-4 py-3">Cost (SOL)</th>
                    <th className="text-right px-4 py-3">Date</th>
                    <th className="text-right px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTasks.map((task) => (
                    <tr key={task.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs font-medium ${task.status === 'completed' ? 'text-green-400' : 'text-red-400'}`}>
                          {task.status === 'completed' ? <FaCheck className="text-[9px]" /> : <FaTimes className="text-[9px]" />}
                          {task.status === 'completed' ? 'Completed' : 'Failed'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/agent/${task.agentId}`} className="text-primary-400 hover:text-primary-300 font-medium">
                          {task.agentName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">{task.prompt}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{task.amount > 0 ? `${task.amount.toFixed(4)}` : '0'}</td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        <div>{new Date(task.createdAt).toLocaleDateString()}</div>
                        <div className="text-[9px]">{new Date(task.createdAt).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                          className="text-[10px] text-primary-400 hover:text-primary-300 whitespace-nowrap"
                        >
                          View Response ▾
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expanded Response */}
            {expandedId && (
              <div className="px-4 py-3 border-t border-white/5 bg-white/[0.02]">
                <p className="text-[10px] text-gray-500 mb-1">Response:</p>
                <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans max-h-[150px] overflow-y-auto">
                  {tasks.find(t => t.id === expandedId)?.response || 'No response'}
                </pre>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-gray-500">Showing {(page-1)*ITEMS_PER_PAGE+1} to {Math.min(page*ITEMS_PER_PAGE, tasks.length)} of {tasks.length} results</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(Math.max(1, page-1))} disabled={page===1} className="px-2 py-1 rounded bg-white/5 text-gray-400 text-xs disabled:opacity-30">
                    <FaChevronLeft className="text-[8px]" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)} className={`w-6 h-6 rounded text-xs ${p === page ? 'bg-primary-500 text-white' : 'bg-white/5 text-gray-400'}`}>{p}</button>
                  ))}
                  {totalPages > 5 && <span className="text-xs text-gray-500">...</span>}
                  {totalPages > 5 && (
                    <button onClick={() => setPage(totalPages)} className={`w-6 h-6 rounded text-xs ${page === totalPages ? 'bg-primary-500 text-white' : 'bg-white/5 text-gray-400'}`}>{totalPages}</button>
                  )}
                  <button onClick={() => setPage(Math.min(totalPages, page+1))} disabled={page===totalPages} className="px-2 py-1 rounded bg-white/5 text-gray-400 text-xs disabled:opacity-30">
                    <FaChevronRight className="text-[8px]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
