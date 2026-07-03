'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { FaStar, FaPaperPlane, FaUser } from 'react-icons/fa'
import { HiLightningBolt, HiSparkles } from 'react-icons/hi'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '@/components/WalletButton'
import Sandbox from '@/components/Sandbox'

interface Agent {
  id: string
  name: string
  description: string
  specialization: string
  aiModel: string
  price: number
  ownerWallet: string
  rating: number
  ratingCount: number
  totalRequests: number
  totalEarnings: number
  isActive: boolean
  createdAt: string
}

interface Review {
  id: string
  userName: string
  rating: number
  comment: string
  createdAt: string
}

export default function AgentDetailPage() {
  const params = useParams()
  const agentId = params.id as string
  const { publicKey, connected, sendTransaction } = useWallet()

  const [agent, setAgent] = useState<Agent | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)

  // Chat state
  const [prompt, setPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])

  // Review form
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewName, setReviewName] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    fetch(`/api/agent/${agentId}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        setAgent(data.agent)
        setReviews(data.reviews || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [agentId])

  const isFree = agent?.price === 0
  const canUse = isFree || connected

  const [hasPaid, setHasPaid] = useState(false)

  const handleSubmit = async () => {
    if (!prompt.trim() || !canUse || !agent) return
    setIsProcessing(true)
    setResponse('')
    setError('')
    setHasPaid(false)

    try {
      // Convert attachments to base64
      const fileData: { name: string; type: string; data: string }[] = []
      for (const file of attachments) {
        const buffer = await file.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        fileData.push({ name: file.name, type: file.type, data: base64 })
      }

      // Step 1: Relay to agent FIRST (user sees result before paying)
      const res = await fetch('/api/agent/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          agentId: agent.id,
          userWallet: publicKey?.toBase58() || null,
          txSignature: agent.price === 0 ? 'free' : 'preview',
          attachments: fileData.length > 0 ? fileData : undefined,
          previousResponse: response || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
      } else {
        setResponse(data.response)
        setAttachments([])
        if (agent.price === 0) setHasPaid(true)
        // Instant local update
        setAgent((prev) => prev ? { ...prev, totalRequests: prev.totalRequests + 1 } : prev)
        // Also refresh from database (bypass cache)
        fetch(`/api/agent/${agentId}?t=${Date.now()}`, { cache: 'no-store' })
          .then(r => r.json())
          .then(d => { if (d.agent) setAgent(d.agent) })
      }
    } catch {
      setError('Failed to reach server')
    } finally {
      setIsProcessing(false)
    }
  }

  // Step 2: Pay SOL AFTER seeing result (unlock download)
  const handlePay = async () => {
    if (!agent || !publicKey || !sendTransaction) return
    setError('')

    try {
      const { Connection, Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js')

      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com')
      // Ensure price is a valid number (handle comma separator from some locales)
      const priceNum = typeof agent.price === 'string' ? parseFloat(String(agent.price).replace(',', '.')) : Number(agent.price)
      if (isNaN(priceNum) || priceNum <= 0) {
        setError('Invalid agent price')
        setIsProcessing(false)
        return
      }
      const totalLamports = Math.floor(priceNum * LAMPORTS_PER_SOL)
      const creatorLamports = Math.floor(totalLamports * 0.9)  // 90% to creator
      const treasuryLamports = totalLamports - creatorLamports  // 10% to platform

      const creatorWallet = new PublicKey(agent.ownerWallet)
      const treasuryWallet = new PublicKey('8McdPygGbvCiZSfkMjNrbumUs2aR8SEHZUYc2SNo5bFP')

      const transaction = new Transaction()
      transaction.add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: creatorWallet, lamports: creatorLamports }))
      transaction.add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: treasuryWallet, lamports: treasuryLamports }))

      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = publicKey

      const sig = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      setHasPaid(true)
    } catch (err: any) {
      setError(err.message || 'Payment rejected.')
    }
  }

  const handleReviewSubmit = async () => {
    if (!reviewComment.trim() || !agent) return
    setSubmittingReview(true)
    try {
      const res = await fetch('/api/agent/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          userWallet: publicKey?.toBase58() || 'anonymous',
          userName: reviewName || 'Anonymous',
          rating: reviewRating,
          comment: reviewComment,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setReviews((prev) => [data.review, ...prev])
        setReviewComment('')
        setReviewName('')
        setReviewRating(5)
        setAgent((prev) => {
          if (!prev) return prev
          const newCount = prev.ratingCount + 1
          const newRating = ((prev.rating * prev.ratingCount) + reviewRating) / newCount
          return { ...prev, rating: Math.round(newRating * 10) / 10, ratingCount: newCount }
        })
      }
    } catch {}
    setSubmittingReview(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <p className="text-gray-500">Agent not found</p>
      </div>
    )
  }

  // ============ VIEW 1: Agent Info (before Start) ============
  if (!started) {
    return (
      <div className="min-h-screen py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Agent Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 sm:p-8 mb-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{agent.name}</h1>
                <p className="text-gray-400 capitalize mt-1">{agent.specialization}</p>
              </div>
              {agent.rating > 0 && (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                  <FaStar className="text-yellow-400" />
                  <span className="text-yellow-300 font-medium">{agent.rating}</span>
                  <span className="text-xs text-gray-500">({agent.ratingCount})</span>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-400 leading-relaxed mb-6">{agent.description}</p>

            {/* Agent Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-gray-500">Price</p>
                <p className="text-lg font-bold text-green-400">{isFree ? 'Free' : `${agent.price} SOL`}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-gray-500">Model</p>
                <div className="flex items-center gap-1 mt-1">
                  <HiLightningBolt className="text-accent-cyan text-sm" />
                  <span className="text-sm text-white capitalize">{agent.aiModel}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-gray-500">Requests</p>
                <p className="text-lg font-bold text-white">{agent.totalRequests.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-sm text-white mt-1">{new Date(agent.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Creator info */}
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
              <FaUser className="text-gray-600" />
              <span>Creator: {agent.ownerWallet.slice(0, 6)}...{agent.ownerWallet.slice(-4)}</span>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              {isFree && (
                <span className="px-3 py-1 rounded-full text-xs bg-green-500/10 border border-green-500/20 text-green-400">
                  Free — No wallet needed
                </span>
              )}
              {!isFree && (
                <span className="px-3 py-1 rounded-full text-xs bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                  {agent.price} SOL per request
                </span>
              )}
              <span className="px-3 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-gray-400 capitalize">
                {agent.specialization}
              </span>
            </div>
          </motion.div>

          {/* Wallet requirement for paid agents */}
          {!isFree && !connected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass-card p-5 mb-6"
            >
              <p className="text-sm text-yellow-300 mb-3">This agent costs {agent.price} SOL per request. Connect wallet to use.</p>
              <WalletButton className="!bg-gradient-to-r !from-primary-600 !to-primary-500 !rounded-xl !font-semibold !text-sm !h-10" />
            </motion.div>
          )}

          {/* Start Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <button
              onClick={() => setStarted(true)}
              disabled={!canUse}
              className="w-full btn-primary text-lg py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <HiSparkles />
              Start Conversation
            </button>
          </motion.div>

          {/* Reviews Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-6 sm:p-8"
          >
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FaStar className="text-yellow-400" />
              Reviews ({reviews.length})
            </h2>

            {reviews.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No reviews yet.</p>
            ) : (
              <div className="space-y-3">
                {reviews.slice(0, 10).map((review) => (
                  <div key={review.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{review.userName}</span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <FaStar key={s} className={`text-[10px] ${s <= review.rating ? 'text-yellow-400' : 'text-gray-700'}`} />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-gray-400">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    )
  }

  // ============ VIEW 2: Chat Interface (after Start) ============
  return (
    <div className="min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mini Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <button onClick={() => setStarted(false)} className="text-sm text-gray-400 hover:text-white">← Back</button>
            <div>
              <h1 className="text-lg font-bold text-white">{agent.name}</h1>
              <p className="text-xs text-gray-500 capitalize">{agent.specialization} • {isFree ? 'Free' : `${agent.price} credits/req`}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
            <span className="text-xs text-green-400">● Online</span>
          </div>
        </motion.div>

        {/* Chat */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 sm:p-8 mb-6"
        >
          {/* Response + Sandbox */}
          {response && (
            <div className="mb-5">
              {(() => {
                const trimmed = response.trim()
                const hasHtml = trimmed.includes('<!DOCTYPE') || trimmed.includes('<html') ||
                  (trimmed.includes('<div') && trimmed.includes('</div>') && trimmed.includes('<')) ||
                  (trimmed.includes('<body') && trimmed.includes('</body>')) ||
                  (trimmed.startsWith('```html') || (trimmed.startsWith('```') && trimmed.includes('<div')))

                if (hasHtml) {
                  // HTML/Code response: only show sandbox preview + download. No raw text, no source.
                  return <Sandbox content={response} isFree={isFree} hasPaid={hasPaid} hideSource onRequestDownload={handlePay} />
                }

                // Normal text response: show text + optional sandbox for media
                return (
                  <>
                    <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-gray-500">Response from {agent.name}</p>
                        <button
                          onClick={() => { setPrompt(`Refine: ${response.slice(0, 80)}...\n\nChanges: `); }}
                          className="text-xs text-primary-400 hover:text-primary-300 px-2 py-1 rounded bg-primary-500/10"
                        >
                          ✏️ Refine
                        </button>
                      </div>
                      <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{response}</pre>
                    </div>
                    <Sandbox content={response} isFree={isFree} hasPaid={hasPaid} onRequestDownload={handlePay} />
                  </>
                )
              })()}

              {/* Pay button for paid agents after seeing result */}
              {!isFree && response && !hasPaid && connected && (
                <div className="mt-4 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-300 font-medium">Satisfied with the result?</p>
                    <p className="text-xs text-gray-400">Pay {agent.price} SOL to unlock download (90% to creator, 10% platform)</p>
                  </div>
                  <button onClick={handlePay} className="btn-primary text-sm px-4 py-2">
                    Pay {agent.price} SOL
                  </button>
                </div>
              )}
              {!isFree && hasPaid && (
                <p className="mt-3 text-xs text-green-400">✅ Paid — download unlocked</p>
              )}
            </div>
          )}

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* File Attachments */}
          {attachments.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-xs">
                    {file.type.startsWith('image/') ? '🖼️' : 
                     file.type.startsWith('video/') ? '🎥' : 
                     file.type.startsWith('audio/') ? '🎵' : '📄'}
                  </span>
                  <span className="text-xs text-gray-300 max-w-[120px] truncate">{file.name}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="text-xs text-gray-500 hover:text-red-400">✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="space-y-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={response ? `Edit or refine the result... (e.g. "make it darker", "change the title")` : `Ask ${agent.name} anything...`}
              rows={4}
              disabled={!canUse}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 resize-y disabled:opacity-50"
            />

            {/* Actions Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Upload Button */}
                <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors">
                  <span>📎</span>
                  <span>Attach</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.json,.html,.css,.js,.ts,.py"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      const maxSize = 10 * 1024 * 1024 // 10MB
                      const valid: File[] = []
                      const rejected: string[] = []
                      files.forEach((f) => {
                        if (f.size > maxSize) {
                          rejected.push(f.name)
                        } else {
                          valid.push(f)
                        }
                      })
                      if (rejected.length > 0) {
                        setError(`File too large (max 10MB): ${rejected.join(', ')}`)
                      }
                      setAttachments(prev => [...prev, ...valid])
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-gray-600">
                  {isFree ? 'Free' : `${agent.price} credits`} • Max 10MB/file
                </span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isProcessing || !prompt.trim() || !canUse}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaPaperPlane className="text-sm" />
                    {response ? 'Refine' : 'Send'}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Write Review */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h3 className="text-sm font-medium text-white mb-3">Rate this agent</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setReviewRating(star)} className="p-1">
                  <FaStar className={`text-xl ${star <= reviewRating ? 'text-yellow-400' : 'text-gray-600'}`} />
                </button>
              ))}
            </div>
            <input
              type="text"
              value={reviewName}
              onChange={(e) => setReviewName(e.target.value)}
              placeholder="Name (optional)"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
            />
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your experience..."
              rows={2}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-500/50 resize-y"
            />
            <button
              onClick={handleReviewSubmit}
              disabled={submittingReview || !reviewComment.trim()}
              className="px-4 py-2 bg-primary-600/20 border border-primary-500/30 rounded-lg text-sm text-primary-300 font-medium hover:bg-primary-600/30 disabled:opacity-50 transition-colors"
            >
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
