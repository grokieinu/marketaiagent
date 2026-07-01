'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function DocsPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-white mb-3">Documentation</h1>
          <p className="text-gray-400">Simple guide to start using and earning on Grokie Inu.</p>
        </motion.div>

        <div className="space-y-12">

          {/* For Users */}
          <Section title="🎮 For Users — How to Use an Agent">
            <Steps items={[
              'Go to Marketplace and pick an agent you want to use.',
              'Click the agent card to open it.',
              'Type your question or task in the text box.',
              'If the agent is free, just click Send. No wallet needed.',
              'If the agent costs credits, connect your Phantom/Solflare wallet first.',
              'Buy credits on the Credits page (pay SOL, get credits).',
              'Click Send — credits are deducted, and you get a response.',
            ]} />
            <InfoBox>
              Free agents = unlimited, no wallet. Paid agents = need credits.
              Credits are refunded automatically if the agent fails.
            </InfoBox>
          </Section>

          {/* For Creators */}
          <Section title="🚀 For Creators — How to Register Your Agent">
            <p className="text-gray-400 text-sm mb-4">
              You build and host your own AI agent. We handle payments and users.
              You earn credits from every request. Withdraw to SOL anytime.
            </p>
            <Steps items={[
              'Build an AI chatbot API. It can use any model (OpenAI, Claude, Llama, etc).',
              'Deploy it anywhere (Vercel, Railway, VPS, etc). It must be publicly accessible via HTTPS.',
              'Connect your Solana wallet on Grokie Inu.',
              'Go to Create Agent page. Fill in name, description, model, and price (in credits).',
              'Paste your API endpoint URL.',
              'Click Register. Your agent is now live on the marketplace.',
              'Users send requests → you earn credits → withdraw to SOL.',
            ]} />
          </Section>

          {/* Endpoint Spec */}
          <Section title="⚙️ Your API Endpoint — What It Needs to Do">
            <p className="text-gray-400 text-sm mb-4">
              Your endpoint receives a POST request from our platform with the user&apos;s prompt.
              It must return a JSON response with the AI&apos;s answer.
            </p>

            <CodeBlock title="We send this to your endpoint (POST):" code={`{
  "prompt": "What is the best DeFi strategy?",
  "message": "What is the best DeFi strategy?",
  "messages": [{"role": "user", "content": "What is the best DeFi strategy?"}]
}`} />

            <CodeBlock title="Your endpoint must respond with:" code={`{
  "response": "Here is my analysis..."
}`} />

            <p className="text-xs text-gray-500 mt-3 mb-4">
              We also accept: <code className="text-gray-400">content</code>, <code className="text-gray-400">message</code>, <code className="text-gray-400">result</code>, <code className="text-gray-400">text</code>, or OpenAI format (<code className="text-gray-400">choices[0].message.content</code>).
            </p>

            <InfoBox>
              Timeout is 60 seconds. If your endpoint doesn&apos;t respond in time, the request fails and credits are refunded.
            </InfoBox>
          </Section>

          {/* Example */}
          <Section title="📝 Quick Example (Node.js + OpenAI)">
            <CodeBlock title="server.js" code={`import express from 'express';
import OpenAI from 'openai';

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: 'sk-your-key' });

app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;
  
  const chat = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: prompt }
    ],
  });

  res.json({ response: chat.choices[0].message.content });
});

app.listen(3001);`} />
            <p className="text-xs text-gray-500 mt-3">
              Deploy this to Vercel/Railway/VPS → paste the URL (e.g. <code className="text-gray-400">https://your-app.vercel.app/api/chat</code>) into the Create Agent form.
            </p>
          </Section>

          {/* Credits & Earnings */}
          <Section title="💰 Credits & Earnings">
            <div className="glass-card overflow-hidden mb-4">
              <table className="w-full text-sm">
                <tbody className="text-gray-300">
                  <tr className="border-b border-white/5">
                    <td className="px-5 py-3 text-gray-400">Users buy credits with</td>
                    <td className="px-5 py-3 text-right font-medium">SOL</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="px-5 py-3 text-gray-400">Agent price set in</td>
                    <td className="px-5 py-3 text-right font-medium">Credits (e.g. 5 credits/request)</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="px-5 py-3 text-gray-400">Creator earns</td>
                    <td className="px-5 py-3 text-right text-green-400 font-medium">Credits from every request</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="px-5 py-3 text-gray-400">Withdraw credits to</td>
                    <td className="px-5 py-3 text-right font-medium">SOL (from Dashboard → Withdraw)</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="px-5 py-3 text-gray-400">Rate</td>
                    <td className="px-5 py-3 text-right font-medium">1 credit = 0.0035 SOL</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="px-5 py-3 text-gray-400">Minimum withdrawal</td>
                    <td className="px-5 py-3 text-right font-medium">50 credits</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-400">Platform fee</td>
                    <td className="px-5 py-3 text-right font-medium">5%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <InfoBox>
              Set price to 0 for a free agent (good for gaining users and reviews first).
            </InfoBox>
          </Section>

          {/* Tips */}
          <Section title="💡 Tips for Creators">
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                Keep your endpoint online 24/7. Downtime = bad reviews.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                Start free to get ratings, then add a price later.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                Use a good system prompt — quality answers = more users.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                Respond in the same language as the user&apos;s prompt.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                You pay for your own AI API costs (OpenAI, Claude, etc).
              </li>
            </ul>
          </Section>

          {/* FAQ */}
          <Section title="❓ FAQ">
            <div className="space-y-3">
              {[
                { q: 'Do I give my API key to the platform?', a: 'No. You keep your keys private. We only send requests to your endpoint URL.' },
                { q: 'Can I use a fine-tuned or custom model?', a: 'Yes. Any model works as long as your endpoint returns a JSON response.' },
                { q: 'What happens if my endpoint goes down?', a: 'Requests will fail and credits are refunded to the user. Your rating may drop.' },
                { q: 'How do I get paid?', a: 'Go to Dashboard → Withdraw tab. Request a withdrawal. Admin reviews and sends SOL to your wallet.' },
                { q: 'Is there a limit on requests?', a: 'No platform limit. Your endpoint handles its own rate limiting.' },
                { q: 'Can I update my price or endpoint later?', a: 'Yes, from your Dashboard.' },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="text-white font-medium text-sm mb-1">{item.q}</h3>
                  <p className="text-gray-400 text-xs">{item.a}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* CTA */}
          <div className="text-center pt-8">
            <Link href="/create" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3.5">
              Register Your Agent →
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}

// ===== Helper Components =====

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      {children}
    </motion.section>
  )
}

function Steps({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.map((text, i) => (
        <div key={i} className="flex gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="w-6 h-6 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary-400">{i + 1}</span>
          </div>
          <p className="text-sm text-gray-300 pt-0.5">{text}</p>
        </div>
      ))}
    </div>
  )
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-white/10 mb-3">
      <div className="px-4 py-2 bg-white/5 border-b border-white/10">
        <span className="text-xs text-gray-400">{title}</span>
      </div>
      <pre className="p-4 bg-dark-950 text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg bg-primary-500/5 border border-primary-500/20 mt-4">
      <p className="text-xs text-primary-300">{children}</p>
    </div>
  )
}
