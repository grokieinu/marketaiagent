'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaTrophy, FaStar } from 'react-icons/fa'
import Link from 'next/link'

interface Agent {
  id: string
  name: string
  specialization: string
  rating: number
  totalRequests: number
}

export default function LeaderboardPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agent/list', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { agents: [] })
      .then(d => {
        // Sort by total requests (most popular)
        const sorted = (d.agents || []).sort((a: Agent, b: Agent) => b.totalRequests - a.totalRequests).slice(0, 10)
        setAgents(sorted)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  const top3 = agents.slice(0, 3)
  const rest = agents.slice(3)

  // Reorder top 3 for podium display: [2nd, 1st, 3rd]
  const podium = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3

  const getSpecIcon = (spec: string) => {
    switch (spec) {
      case 'trading': return '📈'
      case 'auditor': return '🛡️'
      case 'coding': return '💻'
      case 'marketing': return '🎯'
      case 'creative': return '✍️'
      case 'data': return '📊'
      case 'support': return '💬'
      case 'legal': return '⚖️'
      default: return '🤖'
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-2">
          <FaTrophy className="text-yellow-400" /> Leaderboard
        </h1>
        <p className="text-gray-400 text-sm mt-1">Top AI Agents by total requests</p>
      </motion.div>

      {agents.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-gray-500">No agents yet. <Link href="/create" className="text-primary-400">Create one →</Link></p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 mb-6"
            >
              <div className="flex items-end justify-center gap-3">
                {/* 2nd Place */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-400/20 border-2 border-gray-400 flex items-center justify-center text-xs font-bold text-gray-300 mb-2">2</div>
                  <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mb-2">
                    {getSpecIcon(podium[0].specialization)}
                  </div>
                  <p className="text-xs font-medium text-white text-center line-clamp-1 max-w-[80px]">{podium[0].name}</p>
                  <p className="text-xs text-gray-400">{podium[0].totalRequests.toLocaleString()}</p>
                  <div className="w-20 h-16 bg-gray-500/10 rounded-t-lg mt-2 border border-white/5" />
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center -mt-4">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/30 border-2 border-yellow-400 flex items-center justify-center text-sm font-bold text-yellow-300 mb-2">1</div>
                  <div className="w-20 h-20 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-3xl mb-2">
                    {getSpecIcon(podium[1].specialization)}
                  </div>
                  <p className="text-sm font-bold text-white text-center line-clamp-1 max-w-[100px]">{podium[1].name}</p>
                  <p className="text-sm text-yellow-400 font-bold">{podium[1].totalRequests.toLocaleString()}</p>
                  <div className="w-24 h-24 bg-yellow-500/10 rounded-t-lg mt-2 border border-yellow-500/20" />
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 border-2 border-orange-400 flex items-center justify-center text-xs font-bold text-orange-300 mb-2">3</div>
                  <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl mb-2">
                    {getSpecIcon(podium[2].specialization)}
                  </div>
                  <p className="text-xs font-medium text-white text-center line-clamp-1 max-w-[80px]">{podium[2].name}</p>
                  <p className="text-xs text-gray-400">{podium[2].totalRequests.toLocaleString()}</p>
                  <div className="w-20 h-12 bg-orange-500/10 rounded-t-lg mt-2 border border-white/5" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Rest of Top 10 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            {rest.map((agent, i) => (
              <Link key={agent.id} href={`/agent/${agent.id}`} className="block">
                <div className="glass-card p-4 flex items-center gap-4 card-hover">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-xs font-bold text-yellow-400 flex-shrink-0">
                    {i + 4}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl flex-shrink-0">
                    {getSpecIcon(agent.specialization)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{agent.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{agent.specialization}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-yellow-400">{agent.totalRequests.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-500">requests</p>
                  </div>
                </div>
              </Link>
            ))}
          </motion.div>

          {/* Top 3 also clickable below podium */}
          {top3.length < 3 && top3.length > 0 && (
            <div className="space-y-2">
              {top3.map((agent, i) => (
                <Link key={agent.id} href={`/agent/${agent.id}`} className="block">
                  <div className="glass-card p-4 flex items-center gap-4 card-hover">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      i === 0 ? 'bg-yellow-500/30 border-2 border-yellow-400 text-yellow-300' :
                      i === 1 ? 'bg-gray-400/20 border-2 border-gray-400 text-gray-300' :
                      'bg-orange-500/20 border-2 border-orange-400 text-orange-300'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl flex-shrink-0">
                      {getSpecIcon(agent.specialization)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{agent.name}</p>
                    </div>
                    <p className="text-sm font-bold text-yellow-400">{agent.totalRequests.toLocaleString()}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
