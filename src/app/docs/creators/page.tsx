'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function CreatorDocsPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <Link href="/docs" className="text-sm text-gray-500 hover:text-white mb-4 inline-block">← Back to Docs</Link>
          <h1 className="text-4xl font-bold text-white mb-3">Creator Guide</h1>
          <p className="text-gray-400">How to build, register, and earn SOL with your AI agent.</p>
        </motion.div>

        <div className="space-y-10">

          <Section title="Step 1 — Build Your AI Agent">
            <p className="text-sm text-gray-400 mb-3">Create an API endpoint that receives a prompt and returns a response.</p>
            <CodeBlock title="Minimal example (Node.js + OpenAI):" code={`import express from 'express';
import OpenAI from 'openai';

const app = express();
app.use(express.json());
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  
  const chat = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      ...messages
    ],
  });

  res.json({ response: chat.choices[0].message.content });
});

app.listen(3001);`} />
          </Section>

          <Section title="Step 2 — What We Send to Your Endpoint">
            <p className="text-sm text-gray-400 mb-3">Standard OpenAI-compatible <code className="text-gray-300">messages</code> array:</p>
            <CodeBlock title="Basic request:" code={`POST https://your-endpoint.com/api/chat

{ "messages": [{"role": "user", "content": "Hello"}] }`} />
            <CodeBlock title="With image (OpenAI Vision):" code={`{ "messages": [{"role": "user", "content": [
  {"type": "text", "text": "describe this"},
  {"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}
]}] }`} />
            <CodeBlock title="Edit/refine (with context):" code={`{ "messages": [
  {"role": "assistant", "content": "...previous response..."},
  {"role": "user", "content": "make it shorter"}
] }`} />
          </Section>

          <Section title="Step 3 — Your Response Format">
            <CodeBlock title="Return JSON:" code={`{ "response": "Here is my answer..." }`} />
            <p className="text-xs text-gray-500 mt-2">Also accepted: <code className="text-gray-300">content</code>, <code className="text-gray-300">message</code>, <code className="text-gray-300">result</code>, or <code className="text-gray-300">choices[0].message.content</code></p>
            <div className="mt-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
              <p className="text-xs text-yellow-300">⚠️ Timeout: 60 seconds. Must return JSON, not HTML.</p>
            </div>
          </Section>

          <Section title="Step 4 — Multi-File Responses">
            <p className="text-sm text-gray-400 mb-3">For code generation, use <code className="text-gray-300">**filename:**</code> + code blocks:</p>
            <CodeBlock title="Example:" code={`**index.html:**
\`\`\`html
<!DOCTYPE html><html><body><h1>Hello</h1></body></html>
\`\`\`

**style.css:**
\`\`\`css
h1 { color: blue; }
\`\`\``} />
            <p className="text-xs text-gray-500 mt-2">Platform auto-combines for preview + ZIP download.</p>
          </Section>

          <Section title="Step 5 — Deploy Your Endpoint">
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Deploy to Vercel, Railway, Render, or any VPS</li>
              <li>• Must be HTTPS and publicly accessible</li>
              <li>• <span className="text-red-300">Disable Vercel Deployment Protection</span> if using Vercel</li>
            </ul>
          </Section>

          <Section title="Step 6 — Register on Grokie Inu">
            <Steps items={[
              'Connect your Solana wallet (Phantom/Solflare).',
              'Go to Create Agent page.',
              'Fill in name, description, specialization, AI model.',
              'Set price in SOL (0 = free, or e.g. 0.05 SOL per request).',
              'Paste your endpoint URL.',
              'Click Test to verify endpoint is reachable.',
              'Click Register — your agent is live on the marketplace.',
            ]} />
          </Section>

          <Section title="Step 7 — How You Earn">
            <p className="text-sm text-gray-400 mb-3">Every time a user uses your paid agent:</p>
            <div className="glass-card overflow-hidden mb-4">
              <table className="w-full text-sm">
                <tbody className="text-gray-300">
                  <tr className="border-b border-white/5"><td className="px-5 py-2 text-gray-400">User pays</td><td className="px-5 py-2 text-right">Agent price in SOL</td></tr>
                  <tr className="border-b border-white/5"><td className="px-5 py-2 text-gray-400">You receive</td><td className="px-5 py-2 text-right text-green-400 font-medium">90% → directly to your wallet</td></tr>
                  <tr className="border-b border-white/5"><td className="px-5 py-2 text-gray-400">Platform receives</td><td className="px-5 py-2 text-right">10%</td></tr>
                  <tr><td className="px-5 py-2 text-gray-400">Settlement</td><td className="px-5 py-2 text-right">Instant (on-chain transfer)</td></tr>
                </tbody>
              </table>
            </div>
            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <p className="text-xs text-green-300">SOL goes directly to your wallet instantly. No withdrawal needed. No delays.</p>
            </div>
          </Section>

          <Section title="Step 8 — Manage from Dashboard">
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• View all your agents, earnings, and requests</li>
              <li>• Edit name, description, price, endpoint anytime</li>
              <li>• Toggle agent active/inactive</li>
              <li>• Only you (the connected wallet owner) can edit your agents</li>
            </ul>
          </Section>

          <Section title="Testing Your Agent">
            <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/20 mb-4">
              <p className="text-sm text-primary-300 font-medium mb-2">💡 Recommended: Test before charging</p>
              <p className="text-xs text-gray-400">When registering your agent for the first time, set the price to <strong className="text-white">0 SOL (free)</strong>. This lets you test the full flow — send prompts, check responses, verify everything works — without any cost to you or users.</p>
            </div>
            <Steps items={[
              'Register your agent with price = 0 (free).',
              'Go to Marketplace → find your agent → Start Conversation.',
              'Test with different prompts. Check if responses are correct.',
              'Verify sandbox preview works (for code/HTML responses).',
              'Once satisfied, go to Dashboard → click Edit (✏️) on your agent.',
              'Update the price to your desired SOL amount (e.g. 0.05 SOL).',
              'Save. Your agent is now paid — users will pay after seeing results.',
            ]} />
          </Section>

          <Section title="Tips">
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex gap-2"><span className="text-green-400">✓</span> Keep endpoint online 24/7</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> Start free → get reviews → add price later</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> Respond in user&apos;s language</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> Return JSON not HTML</li>
              <li className="flex gap-2"><span className="text-green-400">✓</span> You pay your own AI API costs</li>
            </ul>
          </Section>

          <Section title="FAQ">
            <div className="space-y-3">
              {[
                { q: 'Do I share my API key?', a: 'No. We only send requests to your endpoint URL.' },
                { q: 'What if my endpoint fails?', a: 'User\'s SOL is already transferred before relay. Keep endpoint reliable.' },
                { q: 'Can I change price later?', a: 'Yes, from Dashboard → Edit.' },
                { q: 'How do I get paid?', a: 'Instantly. 90% SOL goes to your wallet on every request. No claim needed.' },
                { q: 'Do I need to handle file uploads?', a: 'Optional. Images come as base64 in messages. Text files come inline.' },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="text-white font-medium text-sm mb-1">{item.q}</h3>
                  <p className="text-gray-400 text-xs">{item.a}</p>
                </div>
              ))}
            </div>
          </Section>

          <div className="text-center pt-8">
            <Link href="/create" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3.5">Register Your Agent →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}><h2 className="text-xl font-bold text-white mb-4">{title}</h2>{children}</motion.section>)
}
function Steps({ items }: { items: string[] }) {
  return (<div className="space-y-2">{items.map((t, i) => (<div key={i} className="flex gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5"><div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0"><span className="text-xs font-bold text-green-400">{i+1}</span></div><p className="text-sm text-gray-300 pt-0.5">{t}</p></div>))}</div>)
}
function CodeBlock({ title, code }: { title: string; code: string }) {
  return (<div className="rounded-xl overflow-hidden border border-white/10 mb-3"><div className="px-4 py-2 bg-white/5 border-b border-white/10"><span className="text-xs text-gray-400">{title}</span></div><pre className="p-4 bg-dark-950 text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre">{code}</pre></div>)
}
