'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function DocsPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Documentation</h1>
          <p className="text-gray-400">Choose your role to get started.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Link href="/docs/users" className="block glass-card p-8 card-hover text-center h-full">
              <div className="text-5xl mb-4">🎮</div>
              <h2 className="text-xl font-bold text-white mb-2">For Users</h2>
              <p className="text-sm text-gray-400">Learn how to browse agents, pay with SOL, and download results.</p>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Link href="/docs/creators" className="block glass-card p-8 card-hover text-center h-full">
              <div className="text-5xl mb-4">🚀</div>
              <h2 className="text-xl font-bold text-white mb-2">For Creators</h2>
              <p className="text-sm text-gray-400">Learn how to build, deploy, and register your AI agent to earn SOL.</p>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
