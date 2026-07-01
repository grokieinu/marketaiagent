'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { FaStar, FaPaperPlane } from 'react-icons/fa'
import { HiLightningBolt, HiSparkles } from 'react-icons/hi'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '@/components/WalletButton'

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
  const { publicKey, connected } = useWallet()

  const [agent, setAgent] = useState<Agent | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [prompt, setPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [response, setResponse] = useState('')
  const [error, setError] = useState('')

  // Review form
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewName, setReviewName] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    fetch(`/api/agent/${agentId}`)
      .then((res) => res.json())
      .then((data) => {
        setAgent(data.agent)
        setReviews(data.reviews || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [agentId])

  const isFree = agent?.price === 0
  // Free agents: anyone can use. Paid agents: need wallet connected
  const canUse = isFree || connected

  const handleSubmit = async () => {
    if (!prompt.trim() || !canUse || !agent) return
    setIsProcessing(true)
    setResponse('')
    setError('')

    try {
      const res = await fetch('/api/agent/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          agentId: agent.id,
          userWallet: publicKey?.toBase58() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.needCredits) {
          setError(`Insufficient credits. Need ${data.required}, have ${data.available}. `)
        } else {
          setError(data.error || 'Something went wrong')
        }
      } else {
        setResponse(data.response)
        setAgent((prev) => prev ? { ...prev, totalRequests: prev.totalRequests + 1 } : prev)
      }
    } catch {
      setError('Failed to reach server')
    } finally {
      setIsProcessing(false)
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
        // Update agent rating display
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

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Agent Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 sm:p-8 mb-8"
        >
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{agent.name}</h1>
            <p className="text-gray-400 mt-1 capitalize">{agent.specialization}</p>

            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10">
                <HiLightningBolt className="text-accent-cyan text-xs" />
                <span className="text-xs text-gray-300 capitalize">{agent.aiModel}</span>
              </div>
              {agent.rating > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                  <FaStar className="text-yellow-400 text-xs" />
                  <span className="text-xs text-yellow-300">{agent.rating} ({agent.ratingCount})</span>
                </div>
              )}
              {isFree && (
                <div className="px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20">
                  <span className="text-xs text-green-400">Free — No wallet needed</span>
                </div>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-400 mt-5 leading-relaxed">{agent.description}</p>

          <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/5">
            <div>
              <p className="text-xs text-gray-500">Price</p>
              <p className="text-lg font-bold text-green-400">{isFree ? 'Free' : `${agent.price} SOL`}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Requests</p>
              <p className="text-lg font-bold text-white">{agent.totalRequests.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Earned</p>
              <p className="text-lg font-bold text-white">{agent.totalEarnings.toFixed(2)} SOL</p>
            </div>
          </div>
        </motion.div>

        {/* Chat Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 sm:p-8 mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
            <HiSparkles className="text-primary-400" />
            Send Request
          </h2>

          {/* Paid agent: need wallet */}
          {!isFree && !connected && (
            <div className="mb-5 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
              <p className="text-sm text-yellow-300 mb-3">This is a paid agent ({agent.price} SOL per request). Connect wallet to use.</p>
              <WalletButton className="!bg-gradient-to-r !from-primary-600 !to-primary-500 !rounded-xl !font-semibold !text-sm !h-10" />
            </div>
          )}

          {response && (
            <div className="mb-5 p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-gray-500 mb-3">Response from {agent.name}</p>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{response}</pre>
            </div>
          )}

          {error && (
            <div className="mb-5 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Ask ${agent.name} anything...`}
              rows={4}
              disabled={!canUse}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/50 resize-y disabled:opacity-50"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {isFree ? 'Free — no credits needed' : `Cost: ${agent.price} credits per request`}
              </span>
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
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Reviews Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 sm:p-8"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <FaStar className="text-yellow-400" />
            Reviews ({reviews.length})
          </h2>

          {/* Write Review Form */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-6">
            <h3 className="text-sm font-medium text-white mb-3">Write a Review</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary-500/50"
                />
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="p-1"
                    >
                      <FaStar className={`text-lg ${star <= reviewRating ? 'text-yellow-400' : 'text-gray-600'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience with this agent..."
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
          </div>

          {/* Review List */}
          {reviews.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No reviews yet. Be the first to review!</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{review.userName}</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FaStar
                            key={star}
                            className={`text-xs ${star <= review.rating ? 'text-yellow-400' : 'text-gray-700'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
