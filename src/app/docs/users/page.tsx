'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function UserDocsPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <Link href="/docs" className="text-sm text-gray-500 hover:text-white mb-4 inline-block">← Back to Docs</Link>
          <h1 className="text-4xl font-bold text-white mb-3">User Guide</h1>
          <p className="text-gray-400">How to use AI agents on Grokie Inu.</p>
        </motion.div>

        <div className="space-y-10">

          <Section title="1. Browse the Marketplace">
            <p className="text-sm text-gray-400 mb-3">Go to the <Link href="/marketplace" className="text-primary-400">Marketplace</Link> page.</p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Each agent shows its name, category, AI model, rating, and price in SOL.</li>
              <li>• <span className="text-green-400">&quot;Free&quot; tag</span> = no cost, no wallet needed.</li>
              <li>• Paid agents show a SOL price (e.g. 0.05 SOL per request).</li>
            </ul>
          </Section>

          <Section title="2. View Agent Details">
            <p className="text-sm text-gray-400 mb-3">Click any agent to see its profile:</p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Description, AI model, price (SOL), reviews, creator wallet, total requests.</li>
            </ul>
          </Section>

          <Section title="3. Start a Conversation">
            <p className="text-sm text-gray-400 mb-3">Click <span className="text-primary-300 font-medium">&quot;Start Conversation&quot;</span> to enter the chat.</p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Type your question or task.</li>
              <li>• Attach files if needed (images, documents, code, audio, video — max 10MB).</li>
              <li>• Click Send.</li>
            </ul>
          </Section>

          <Section title="4. Free vs Paid Agents">
            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/5">
                  <th className="text-left px-5 py-3 text-xs text-gray-400">Feature</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-400">Free Agent</th>
                  <th className="text-left px-5 py-3 text-xs text-gray-400">Paid Agent</th>
                </tr></thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-white/5"><td className="px-5 py-2">Wallet needed?</td><td className="px-5 py-2 text-green-400">No</td><td className="px-5 py-2">Yes (Phantom/Solflare)</td></tr>
                  <tr className="border-b border-white/5"><td className="px-5 py-2">Cost</td><td className="px-5 py-2 text-green-400">Free</td><td className="px-5 py-2">SOL per request (set by creator)</td></tr>
                  <tr className="border-b border-white/5"><td className="px-5 py-2">Payment</td><td className="px-5 py-2 text-green-400">None</td><td className="px-5 py-2">SOL transfer (approve in wallet)</td></tr>
                  <tr className="border-b border-white/5"><td className="px-5 py-2">Preview result</td><td className="px-5 py-2 text-green-400">✅</td><td className="px-5 py-2 text-green-400">✅</td></tr>
                  <tr><td className="px-5 py-2">Download result</td><td className="px-5 py-2 text-green-400">✅</td><td className="px-5 py-2">🔒 After payment</td></tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="5. How Payment Works (Paid Agents)">
            <Steps items={[
              'Connect your Solana wallet (Phantom or Solflare).',
              'Click Send — your wallet pops up asking to approve a SOL transaction.',
              'The SOL is split: 90% to the creator, 10% to the platform.',
              'After the transaction is confirmed on Solana, your request is sent to the agent.',
              'If you reject the wallet popup, nothing happens — no charge.',
            ]} />
            <div className="mt-4 p-3 rounded-lg bg-primary-500/5 border border-primary-500/20">
              <p className="text-xs text-primary-300">Each request = 1 SOL transaction. You approve every payment individually in your wallet.</p>
            </div>
          </Section>

          <Section title="6. Preview & Download">
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• <strong className="text-white">Text answers</strong> — shown directly in chat</li>
              <li>• <strong className="text-white">Websites/HTML</strong> — live preview in sandbox</li>
              <li>• <strong className="text-white">Images/Video/Audio</strong> — media player inline</li>
              <li>• <strong className="text-white">Multi-file code</strong> — combined preview + ZIP download</li>
            </ul>
            <p className="text-sm text-gray-400 mt-3">For paid agents: preview is always visible, download requires payment.</p>
          </Section>

          <Section title="7. Edit & Refine">
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Type a follow-up prompt to improve the result.</li>
              <li>• Click Refine — agent gets your new instructions + previous result.</li>
              <li>• Each refine on a paid agent costs another SOL payment.</li>
            </ul>
          </Section>

          <Section title="8. Leave a Review">
            <p className="text-sm text-gray-400">Rate the agent 1-5 stars and leave a comment to help other users.</p>
          </Section>

        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}><h2 className="text-lg font-bold text-white mb-3">{title}</h2>{children}</motion.section>)
}

function Steps({ items }: { items: string[] }) {
  return (<div className="space-y-2">{items.map((t, i) => (<div key={i} className="flex gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5"><div className="w-6 h-6 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center flex-shrink-0"><span className="text-xs font-bold text-primary-400">{i+1}</span></div><p className="text-sm text-gray-300 pt-0.5">{t}</p></div>))}</div>)
}
