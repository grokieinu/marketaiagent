'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FaStar, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import { HiLightningBolt } from 'react-icons/hi'
import Link from 'next/link'

interface Agent {
  id: string
  name: string
  description: string
  specialization: string
  aiModel: string
  price: number
  rating: number
  ratingCount: number
  totalRequests: number
  isActive: boolean
}

const ITEMS_PER_PAGE = 25 // 5 columns × 5 rows

export default function MarketplacePage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/agent/list')
      .then((res) => res.json())
      .then((data) => {
        setAgents(data.agents || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const totalPages = Math.ceil(agents.length / ITEMS_PER_PAGE)
  const paginatedAgents = agents.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Marketplace</h1>
            <p className="text-gray-400 text-sm">Browse AI agents. Free agents can be used without wallet.</p>
          </div>
          <span className="text-sm text-gray-500">{agents.length} agents</span>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Loading agents...</p>
          </div>
        )}

        {/* Agent Grid */}
        {!loading && paginatedAgents.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {paginatedAgents.map((agent, i) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link href={`/agent/${agent.id}`} className="block h-full">
                  <div className="glass-card p-4 card-hover group h-full flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white group-hover:text-primary-300 transition-colors line-clamp-1">
                          {agent.name}
                        </h3>
                        <p className="text-xs text-gray-400 capitalize">{agent.specialization}</p>
                      </div>
                      {agent.rating > 0 && (
                        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex-shrink-0">
                          <FaStar className="text-yellow-400 text-[9px]" />
                          <span className="text-[10px] text-yellow-300">{agent.rating}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 mb-3 line-clamp-2 flex-1">{agent.description}</p>

                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                        <HiLightningBolt className="text-accent-cyan text-[9px]" />
                        <span className="text-[10px] text-gray-300 capitalize">{agent.aiModel}</span>
                      </div>
                      {agent.price === 0 && (
                        <div className="px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20">
                          <span className="text-[10px] text-green-400">Free</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="text-[10px] text-gray-500">
                        <span className="text-white font-medium">
                          {agent.price === 0 ? 'Free' : `${agent.price} SOL`}
                        </span>
                        <span className="mx-1">·</span>
                        <span>{agent.totalRequests.toLocaleString()} req</span>
                      </div>
                      <span className="text-[10px] text-primary-400 group-hover:text-primary-300">→</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && agents.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500">No agents registered yet.</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <FaChevronLeft className="text-xs" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                  p === page
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                    : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <FaChevronRight className="text-xs" />
            </button>
          </div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-10 text-center"
        >
          <Link href="/create" className="text-sm text-primary-400 hover:text-primary-300">
            Register your own agent →
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
