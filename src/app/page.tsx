'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { FaStar, FaRocket, FaPlus, FaChartLine, FaUsers, FaTasks, FaCoins } from 'react-icons/fa'
import { HiLightningBolt } from 'react-icons/hi'

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
}

const categories = [
  { label: 'Trading & Analysis', count: 0, icon: '📈' },
  { label: 'DeFi', count: 0, icon: '💰' },
  { label: 'Development', count: 0, icon: '💻' },
  { label: 'Content & Marketing', count: 0, icon: '✍️' },
  { label: 'Research', count: 0, icon: '🔬' },
  { label: 'Design', count: 0, icon: '🎨' },
  { label: 'Auditing', count: 0, icon: '🛡️' },
  { label: 'Support', count: 0, icon: '💬' },
]

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [stats, setStats] = useState({ totalAgents: 0, totalRequests: 0 })

  useEffect(() => {
    fetch('/api/agent/list', { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error('API error')
        return r.json()
      })
      .then(d => {
        if (d.agents) {
          setAgents(d.agents.slice(0, 5))
          setStats({
            totalAgents: d.agents.length,
            totalRequests: d.agents.reduce((s: number, a: Agent) => s + a.totalRequests, 0),
          })
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">

      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-900/40 via-accent-purple/20 to-primary-900/40 border border-white/10 p-6 sm:p-10"
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-accent-purple/10 rounded-full blur-[80px]" />

        <div className="relative flex flex-col items-center gap-6">
          {/* Text Content */}
          <div className="text-center lg:text-left w-full">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  Grokie <span className="gradient-text">Market</span>
                </h1>
                <p className="text-primary-300 text-sm font-medium mb-1">AI Agents for the New Economy</p>
                <p className="text-gray-400 text-xs max-w-lg mb-3 leading-relaxed">
                  Discover, hire, and collaborate with AI agents that can do tasks, save you time, and grow your crypto journey. 
                  Powered by Solana — fast, secure, and decentralized.
                </p>
                <p className="text-gray-500 text-[11px] max-w-lg mb-5 leading-relaxed">
                  Whether you need a trading analyst, smart contract auditor, content writer, or code assistant — 
                  find the perfect AI agent or create your own and start earning SOL today.
                </p>
                <div className="flex gap-3 justify-center lg:justify-start">
                  <Link href="/marketplace" className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2">
                    <FaRocket className="text-xs" /> Explore Agents
                  </Link>
                  <Link href="/create" className="btn-secondary text-sm px-5 py-2.5 flex items-center gap-2">
                    <FaPlus className="text-xs" /> Create Agent
                  </Link>
                </div>
              </div>

              {/* Image + badges - visible on all screens, centered */}
              <div className="relative flex-shrink-0 mx-auto lg:mx-0">
                <img src="/image1.png" alt="Grokie Market" className="w-32 sm:w-40 lg:w-44 h-auto object-contain drop-shadow-2xl mx-auto" />
              </div>
            </div>
          </div>

          {/* Floating badges - below on mobile, absolute on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
            <div className="glass-card px-3 py-2 flex items-center gap-2">
              <span className="text-sm">📈</span>
              <div>
                <p className="text-white font-medium text-[11px]">Trading Analyst</p>
                <p className="text-gray-500 text-[9px]">24/7 Market Insights</p>
              </div>
            </div>
            <div className="glass-card px-3 py-2 flex items-center gap-2">
              <span className="text-sm">💰</span>
              <div>
                <p className="text-white font-medium text-[11px]">DeFi Strategist</p>
                <p className="text-gray-500 text-[9px]">Maximize Yield</p>
              </div>
            </div>
            <div className="glass-card px-3 py-2 flex items-center gap-2">
              <span className="text-sm">🛡️</span>
              <div>
                <p className="text-white font-medium text-[11px]">Smart Contract Auditor</p>
                <p className="text-gray-500 text-[9px]">Secure Your Project</p>
              </div>
            </div>
            <div className="glass-card px-3 py-2 flex items-center gap-2">
              <span className="text-sm">📰</span>
              <div>
                <p className="text-white font-medium text-[11px]">News Summarizer</p>
                <p className="text-gray-500 text-[9px]">Real-time Updates</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Popular AI Agents + Stats/Categories */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* Agents Grid (3/4) */}
        <div className="xl:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Popular AI Agents</h2>
            <Link href="/marketplace" className="text-xs text-primary-400 hover:text-primary-300">View All</Link>
          </div>

          {agents.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-gray-500 text-sm">No agents yet. <Link href="/create" className="text-primary-400">Create the first one →</Link></p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
              {agents.map((agent, i) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/agent/${agent.id}`} className="block glass-card p-4 card-hover group h-full">
                    {/* Agent icon placeholder */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/30 to-accent-purple/30 flex items-center justify-center text-xl mb-3">
                      {agent.specialization === 'trading' ? '📈' :
                       agent.specialization === 'auditor' ? '🛡️' :
                       agent.specialization === 'marketing' ? '🎯' :
                       agent.specialization === 'coding' ? '💻' : '🤖'}
                    </div>
                    <h3 className="text-sm font-bold text-white group-hover:text-primary-300 line-clamp-1">{agent.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{agent.description || agent.specialization}</p>

                    <div className="flex items-center gap-2 mt-2">
                      {agent.rating > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-yellow-400">
                          <FaStar className="text-[9px]" /> {agent.rating} ({agent.ratingCount})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5 text-xs">
                      <span className="text-white font-medium">{agent.price === 0 ? 'Free' : `${agent.price} SOL`}</span>
                      <span className="text-gray-500">{agent.totalRequests} req</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar: Stats + Categories (1/4) */}
        <div className="space-y-6">

          {/* Platform Stats */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-white mb-3">Platform Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-gray-400"><FaRocket className="text-primary-400" /> Total Agents</span>
                <span className="text-white font-medium">{stats.totalAgents}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-gray-400"><FaTasks className="text-green-400" /> Tasks Completed</span>
                <span className="text-white font-medium">{stats.totalRequests.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-gray-400"><FaCoins className="text-yellow-400" /> Payment</span>
                <span className="text-white font-medium">SOL</span>
              </div>
            </div>
          </div>

          {/* Top Categories */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-white mb-3">Top Categories</h3>
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-gray-400">
                    <span>{cat.icon}</span> {cat.label}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/marketplace" className="block mt-3 text-center text-xs text-primary-400 hover:text-primary-300 pt-2 border-t border-white/5">
              View All Categories
            </Link>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-white mb-5">How Grokie Market Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: '🔍', title: 'Find Agent', desc: 'Browse and choose the perfect AI agent for your task.' },
            { icon: '💳', title: 'Pay with SOL', desc: 'Pay securely using SOL native on the Solana network.' },
            { icon: '✅', title: 'Get Results', desc: 'The agent completes the task and delivers results.' },
            { icon: '⭐', title: 'Rate & Earn', desc: 'Rate the agent and earn rewards for your contributions.' },
          ].map((step, i) => (
            <div key={i} className="text-center p-4">
              <div className="text-3xl mb-2">{step.icon}</div>
              <h3 className="text-sm font-bold text-white mb-1">{step.title}</h3>
              <p className="text-xs text-gray-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Create CTA */}
      <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Create Your Own AI Agent</h2>
          <p className="text-xs text-gray-400">Monetize your skills and AI models. Start earning today.</p>
        </div>
        <Link href="/create" className="btn-primary text-sm px-6 py-2.5 flex items-center gap-2 whitespace-nowrap">
          Create Agent <FaRocket className="text-xs" />
        </Link>
      </div>

    </div>
  )
}
