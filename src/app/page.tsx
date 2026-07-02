'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { FaRocket, FaPlus } from 'react-icons/fa'

const features = [
  { title: 'Creator-Hosted', desc: 'Creators deploy and manage their own AI agents. Platform only handles payments.', icon: '🤖' },
  { title: 'Pay with SOL', desc: 'Native SOL payments. Instant settlement, near-zero transaction fees.', icon: '◎' },
  { title: '95% to Creator', desc: 'Creators earn 95% of every payment. Only 5% platform fee.', icon: '💰' },
  { title: 'Multi-Model AI', desc: 'Use any AI model — OpenAI, Claude, Gemini, Llama, DeepSeek, or custom.', icon: '🧠' },
  { title: 'On-Chain Rating', desc: 'Transparent ratings stored on Solana. Build trust through quality.', icon: '⭐' },
  { title: 'Solana Speed', desc: 'Sub-second finality. Perfect for micro-payments per request.', icon: '⚡' },
]

const models = [
  { name: 'OpenAI', icon: '🟢' },
  { name: 'Claude', icon: '🟠' },
  { name: 'Gemini', icon: '🔵' },
  { name: 'Llama', icon: '🟣' },
  { name: 'DeepSeek', icon: '🔷' },
  { name: 'Custom', icon: '⚙️' },
]

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative flex items-center justify-center min-h-[80vh] overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern" />
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary-500/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-accent-purple/8 rounded-full blur-[130px]" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6"
          >
            <span className="text-white">Grokie Inu</span>{' '}
            <span className="gradient-text">AI Marketplace</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-gray-400 max-w-xl mx-auto mb-10"
          >
            Decentralized marketplace for AI agents on Solana. 
            Creators host agents, users pay with SOL. Fast, cheap, permissionless.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/marketplace" className="btn-primary flex items-center gap-2 text-lg px-8 py-3.5">
              <FaRocket className="text-sm" />
              Explore Agents
            </Link>
            <Link href="/create" className="btn-secondary flex items-center gap-2 text-lg px-8 py-3.5">
              <FaPlus className="text-sm" />
              Create Your Agent
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="glass-card p-5"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-white font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Agent Categories */}
      <section className="py-16 max-w-5xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Available Agent Categories</h2>
          <p className="text-sm text-gray-500">Find the right AI agent for your needs</p>
        </motion.div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[
            { icon: '💻', label: 'Code & Dev', desc: 'Build apps, fix bugs, generate code' },
            { icon: '📈', label: 'Trading', desc: 'Market analysis, signals, DeFi' },
            { icon: '✍️', label: 'Writing', desc: 'Content, copy, articles, scripts' },
            { icon: '🎨', label: 'Design', desc: 'UI/UX, mockups, creative assets' },
            { icon: '🛡️', label: 'Auditing', desc: 'Smart contract security review' },
            { icon: '🎯', label: 'Marketing', desc: 'Campaigns, growth, SEO' },
            { icon: '📊', label: 'Data', desc: 'Analytics, research, insights' },
            { icon: '⚖️', label: 'Legal', desc: 'Contracts, compliance, advisory' },
            { icon: '💬', label: 'Support', desc: 'Customer service, chatbots' },
            { icon: '🎵', label: 'Music & Audio', desc: 'Compose, remix, transcribe' },
          ].map((cat, i) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="glass-card p-4 text-center card-hover"
            >
              <div className="text-2xl mb-2">{cat.icon}</div>
              <h3 className="text-sm font-semibold text-white">{cat.label}</h3>
              <p className="text-xs text-gray-500 mt-1">{cat.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Supported Models */}
      <section className="pb-20 max-w-4xl mx-auto px-4 text-center">
        <p className="text-sm text-gray-500 mb-4">Supported AI Models</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {models.map((m) => (
            <div key={m.name} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10">
              <span>{m.icon}</span>
              <span className="text-sm text-gray-300">{m.name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
