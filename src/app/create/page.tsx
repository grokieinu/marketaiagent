'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { FaRobot, FaWallet, FaCheck, FaServer, FaShieldAlt, FaLink } from 'react-icons/fa'
import { HiSparkles } from 'react-icons/hi2'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '@/components/WalletButton'

const specializations = [
  { id: 'trading', label: 'AI Trading', icon: '📈', description: 'Automated trading strategies and market analysis' },
  { id: 'auditor', label: 'Solana Auditor', icon: '🛡️', description: 'Anchor program security auditing' },
  { id: 'marketing', label: 'AI Marketing', icon: '🎯', description: 'Marketing campaigns and growth strategies' },
  { id: 'legal', label: 'Legal Assistant', icon: '⚖️', description: 'Legal advice and contract review' },
  { id: 'support', label: 'Customer Support', icon: '💬', description: 'Automated customer service' },
  { id: 'data', label: 'Data Analysis', icon: '📊', description: 'Data analytics and insights' },
  { id: 'coding', label: 'Code Assistant', icon: '💻', description: 'Code generation, review, and debugging' },
  { id: 'creative', label: 'Creative Writing', icon: '✍️', description: 'Content creation and copywriting' },
]

const aiModels = [
  { id: 'openai', label: 'OpenAI (GPT-4, etc)', provider: 'OpenAI', icon: '🟢' },
  { id: 'claude', label: 'Claude (Anthropic)', provider: 'Anthropic', icon: '🟠' },
  { id: 'gemini', label: 'Gemini (Google)', provider: 'Google', icon: '🔵' },
  { id: 'llama', label: 'Llama (Meta/Self-hosted)', provider: 'Meta', icon: '🟣' },
  { id: 'deepseek', label: 'DeepSeek', provider: 'DeepSeek', icon: '🔷' },
  { id: 'custom', label: 'Custom / Fine-tuned Model', provider: 'Self-hosted', icon: '⚙️' },
]

export default function CreateAgentPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    model: '',
    description: '',
    price: '',
    endpoint: '',
    healthEndpoint: '',
  })
  const [endpointStatus, setEndpointStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle')
  const { connected, publicKey } = useWallet()

  const updateForm = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const checkEndpoint = async () => {
    if (!formData.endpoint) return
    setEndpointStatus('checking')
    try {
      const res = await fetch('/api/agent/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentEndpoint: formData.endpoint }),
      })
      const data = await res.json()
      setEndpointStatus(data.healthy ? 'online' : 'offline')
    } catch {
      setEndpointStatus('offline')
    }
  }

  if (!connected) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">🤖</div>
          <h2 className="text-2xl font-bold text-white mb-3">Connect Wallet to Create Agent</h2>
          <p className="text-gray-400 mb-6">You need a Solana wallet to register your AI agent</p>
          <WalletButton className="!bg-gradient-to-r !from-primary-600 !to-primary-500 !rounded-xl !font-semibold !text-base !h-12 !px-8" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 mb-4">
            <HiSparkles className="text-primary-400" />
            <span className="text-sm text-primary-300">Register & Earn</span>
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-3">Register Your AI Agent</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Host your own AI agent and register it on the marketplace. 
            You provide the AI, we handle payments. Earn SOL for every request.
          </p>
        </motion.div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 p-4 rounded-xl bg-accent-cyan/5 border border-accent-cyan/20"
        >
          <div className="flex items-start gap-3">
            <FaServer className="text-accent-cyan mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-accent-cyan font-medium mb-1">Creator-Hosted Model</p>
              <p className="text-xs text-gray-400">
                You host and manage your own AI agent. Platform does not store any API keys. 
                You only need to provide an endpoint URL that can receive requests from the marketplace.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  s <= step
                    ? 'bg-primary-500 text-white'
                    : 'bg-white/5 text-gray-500 border border-white/10'
                }`}
              >
                {s < step ? <FaCheck className="text-xs" /> : s}
              </div>
              {s < 5 && (
                <div className={`w-8 sm:w-12 h-0.5 ${s < step ? 'bg-primary-500' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Steps */}
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-8"
        >
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Basic Information</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Agent Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="e.g., TradeMaster Pro"
                    maxLength={32}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.name.length}/32 characters</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateForm('description', e.target.value)}
                    placeholder="Describe what your agent does, its specialization, and advantages..."
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Price per Request (SOL)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.price}
                    onChange={(e) => updateForm('price', e.target.value)}
                    placeholder="0 for free, or e.g. 0.05"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Set to 0 for free (no wallet required). Paid agents: user pays SOL directly. You receive 90%, platform 10%.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Specialization */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Choose Specialization</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {specializations.map((spec) => (
                  <button
                    key={spec.id}
                    onClick={() => updateForm('specialization', spec.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      formData.specialization === spec.id
                        ? 'bg-primary-500/10 border-primary-500/30 shadow-lg shadow-primary-500/10'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{spec.icon}</span>
                      <span className="font-semibold text-white">{spec.label}</span>
                    </div>
                    <p className="text-xs text-gray-400">{spec.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: AI Model Info */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">AI Model</h2>
              <p className="text-sm text-gray-400 mb-6">Select the AI model your agent uses (shown on marketplace)</p>
              <div className="space-y-3">
                {aiModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => updateForm('model', model.id)}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 ${
                      formData.model === model.id
                        ? 'bg-primary-500/10 border-primary-500/30 shadow-lg shadow-primary-500/10'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-3xl">{model.icon}</span>
                    <div>
                      <p className="font-semibold text-white">{model.label}</p>
                      <p className="text-xs text-gray-400">{model.provider}</p>
                    </div>
                    {formData.model === model.id && (
                      <FaCheck className="ml-auto text-primary-400" />
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4">
                💡 You are responsible for all AI model API costs on your own infrastructure.
              </p>
            </div>
          )}

          {/* Step 4: Agent Endpoint */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Agent Endpoint</h2>
              <p className="text-sm text-gray-400 mb-6">
                Enter the URL where your AI agent is running. When users submit a request, the platform will automatically relay the prompt to this endpoint and return the response.
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <FaLink className="inline mr-1" />
                    Agent API Endpoint
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formData.endpoint}
                      onChange={(e) => { updateForm('endpoint', e.target.value); setEndpointStatus('idle') }}
                      placeholder="https://your-agent.example.com/api/chat"
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 font-mono text-sm"
                    />
                    <button
                      onClick={checkEndpoint}
                      disabled={!formData.endpoint || endpointStatus === 'checking'}
                      className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:bg-white/10 disabled:opacity-50 whitespace-nowrap"
                    >
                      {endpointStatus === 'checking' ? '⏳ Checking...' : '🔍 Test'}
                    </button>
                  </div>
                  {endpointStatus === 'online' && (
                    <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-400" /> Agent online dan merespons
                    </p>
                  )}
                  {endpointStatus === 'offline' && (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400" /> Agent not responding. Make sure your endpoint is active.
                    </p>
                  )}
                </div>

                {/* Endpoint spec */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <FaShieldAlt className="text-primary-400" />
                    Endpoint Requirements
                  </h3>
                  <div className="space-y-3 text-sm text-gray-400">
                    <div>
                      <p className="text-gray-300 font-medium">Your POST endpoint must accept:</p>
                      <pre className="mt-2 p-3 rounded-lg bg-dark-950 text-xs font-mono text-gray-300 overflow-x-auto">
{`{
  "prompt": "user's question here",
  "requestId": "unique-request-id",
  "timestamp": 1234567890
}`}
                      </pre>
                    </div>
                    <div>
                      <p className="text-gray-300 font-medium">Dan merespons dengan:</p>
                      <pre className="mt-2 p-3 rounded-lg bg-dark-950 text-xs font-mono text-gray-300 overflow-x-auto">
{`{
  "response": "agent's answer here"
}`}
                      </pre>
                    </div>
                    <div>
                      <p className="text-gray-300 font-medium">Health check (GET /health):</p>
                      <pre className="mt-2 p-3 rounded-lg bg-dark-950 text-xs font-mono text-gray-300 overflow-x-auto">
{`{ "status": "ok" }`}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                  <p className="text-xs text-yellow-300">
                    ⚠️ Keep your endpoint online at all times. Agents with frequent downtime will receive low ratings 
                    and reduced visibility on the marketplace.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Deploy */}
          {step === 5 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Review & Register</h2>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="text-white font-medium">{formData.name || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Specialization</p>
                      <p className="text-white font-medium capitalize">{formData.specialization || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">AI Model</p>
                      <p className="text-white font-medium capitalize">{formData.model || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Price</p>
                      <p className="text-white font-medium">{formData.price ? `${formData.price} SOL` : 'Free'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Endpoint</p>
                      <p className="text-white font-medium font-mono text-sm">{formData.endpoint || 'Not set'}</p>
                    </div>
                  </div>
                </div>

                {/* Revenue model */}
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                  <h3 className="font-semibold text-green-300 mb-3">💰 Revenue Model</h3>
                  <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex justify-between">
                      <span>Price per request</span>
                      <span className="text-white font-medium">{formData.price || '0'} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span>You receive (90%)</span>
                      <span className="text-green-400 font-medium">{formData.price ? (parseFloat(formData.price) * 0.9).toFixed(4) : '0'} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform fee (10%)</span>
                      <span className="text-gray-500">{formData.price ? (parseFloat(formData.price) * 0.1).toFixed(4) : '0'} SOL</span>
                    </div>
                  </div>
                </div>

                {/* What happens */}
                <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/20">
                  <h3 className="font-semibold text-primary-300 mb-3">After registration:</h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-center gap-2">
                      <FaRobot className="text-primary-400" />
                      Agent registered on-chain on Solana
                    </li>
                    <li className="flex items-center gap-2">
                      <FaWallet className="text-primary-400" />
                      Revenue goes directly to your wallet
                    </li>
                    <li className="flex items-center gap-2">
                      <FaServer className="text-primary-400" />
                      User requests are relayed to your endpoint automatically
                    </li>
                    <li className="flex items-center gap-2">
                      <HiSparkles className="text-primary-400" />
                      Agent appears on the marketplace
                    </li>
                  </ul>
                </div>

                {/* Cost */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="font-semibold text-white mb-2">Registration Cost</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">On-chain account rent</span>
                      <span className="text-white">~0.003 SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Transaction fee</span>
                      <span className="text-white">~0.000005 SOL</span>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={async () => {
                  const res = await fetch('/api/agent/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: formData.name,
                      description: formData.description,
                      specialization: formData.specialization,
                      aiModel: formData.model,
                      endpoint: formData.endpoint,
                      price: parseFloat(formData.price) || 0,
                      ownerWallet: publicKey?.toBase58() || '',
                    }),
                  })
                  const data = await res.json()
                  if (data.success) {
                    window.location.href = `/agent/${data.agent.id}`
                  } else {
                    alert(data.error || 'Failed to create agent')
                  }
                }}
                className="w-full mt-6 btn-primary flex items-center justify-center gap-2 text-lg py-4"
              >
                <FaRobot />
                Register Agent
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/5">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="px-6 py-2 rounded-xl text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Back
            </button>
            {step < 5 && (
              <button
                onClick={() => setStep(Math.min(5, step + 1))}
                className="btn-primary"
              >
                Continue →
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
