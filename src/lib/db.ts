import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// ===== INTERFACES =====

export interface Agent {
  id: string
  name: string
  description: string
  specialization: string
  aiModel: string
  endpoint: string
  price: number
  priceSol: number
  ownerWallet: string
  rating: number
  ratingCount: number
  totalRequests: number
  totalEarnings: number
  isActive: boolean
  createdAt: string
}

export interface Review {
  id: string
  agentId: string
  userWallet: string
  userName: string
  rating: number
  comment: string
  createdAt: string
}

export interface UserCredits {
  wallet: string
  balance: number
  totalPurchased: number
  totalSpent: number
}

export interface Withdrawal {
  id: string
  creatorWallet: string
  credits: number
  solAmount: number
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  txSignature: string | null
  createdAt: string
  processedAt: string | null
}

// ===== CONSTANTS =====

export const CREDIT_PACKS = [
  { id: 'pack_10', credits: 10, price: 0.05, label: '10 Credits', popular: false },
  { id: 'pack_50', credits: 50, price: 0.2, label: '50 Credits', popular: true },
  { id: 'pack_100', credits: 100, price: 0.35, label: '100 Credits', popular: false },
  { id: 'pack_500', credits: 500, price: 1.5, label: '500 Credits', popular: false },
]

export const CREDIT_TO_SOL_RATE = 0.0035
export const MIN_WITHDRAWAL_CREDITS = 50

// ===== INIT DATABASE =====

export async function initDb() {
  await sql`CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    specialization TEXT NOT NULL,
    ai_model TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    price REAL DEFAULT 0,
    price_sol REAL DEFAULT 0,
    owner_wallet TEXT NOT NULL,
    rating REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    total_requests INTEGER DEFAULT 0,
    total_earnings INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
  )`
  await sql`CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT DEFAULT '',
    user_wallet TEXT,
    credits_cost INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
  )`
  await sql`CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    user_wallet TEXT NOT NULL,
    user_name TEXT DEFAULT 'Anonymous',
    rating INTEGER NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  )`
  await sql`CREATE TABLE IF NOT EXISTS user_credits (
    wallet TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0,
    total_purchased INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    last_purchase TIMESTAMP
  )`
  await sql`CREATE TABLE IF NOT EXISTS credit_purchases (
    id TEXT PRIMARY KEY,
    wallet TEXT NOT NULL,
    credits INTEGER NOT NULL,
    sol_paid REAL NOT NULL,
    tx_signature TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`
  await sql`CREATE TABLE IF NOT EXISTS withdrawals (
    id TEXT PRIMARY KEY,
    creator_wallet TEXT NOT NULL,
    credits INTEGER NOT NULL,
    sol_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    tx_signature TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
  )`
  // Migration: change price column from INTEGER to REAL (for decimal SOL values)
  try {
    await sql`ALTER TABLE agents ALTER COLUMN price TYPE REAL`
  } catch {}
}

// ===== AGENTS =====

export async function getAllAgents(): Promise<Agent[]> {
  await initDb()
  const rows = await sql`SELECT * FROM agents WHERE is_active = true ORDER BY total_requests DESC`
  return rows.map(mapAgent)
}

export async function getAgentById(id: string): Promise<Agent | null> {
  await initDb()
  const rows = await sql`SELECT * FROM agents WHERE id = ${id}`
  return rows.length > 0 ? mapAgent(rows[0]) : null
}

export async function getAgentsByOwner(wallet: string): Promise<Agent[]> {
  await initDb()
  const rows = await sql`SELECT * FROM agents WHERE owner_wallet = ${wallet}`
  return rows.map(mapAgent)
}

export async function createAgent(data: { name: string; description: string; specialization: string; aiModel: string; endpoint: string; price: number; priceSol: number; ownerWallet: string }): Promise<Agent> {
  await initDb()
  const id = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  await sql`INSERT INTO agents (id, name, description, specialization, ai_model, endpoint, price, price_sol, owner_wallet)
    VALUES (${id}, ${data.name}, ${data.description}, ${data.specialization}, ${data.aiModel}, ${data.endpoint}, ${data.price}, ${data.priceSol}, ${data.ownerWallet})`
  const rows = await sql`SELECT * FROM agents WHERE id = ${id}`
  return mapAgent(rows[0])
}

function mapAgent(row: any): Agent {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    specialization: row.specialization,
    aiModel: row.ai_model,
    endpoint: row.endpoint,
    price: row.price,
    priceSol: row.price_sol,
    ownerWallet: row.owner_wallet,
    rating: parseFloat(row.rating) || 0,
    ratingCount: row.rating_count,
    totalRequests: row.total_requests,
    totalEarnings: row.total_earnings,
    isActive: row.is_active,
    createdAt: row.created_at,
  }
}

// ===== REQUESTS =====

export async function createRequest(data: { agentId: string; prompt: string; response: string; userWallet: string | null; creditsCost: number }) {
  await initDb()
  const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  await sql`INSERT INTO requests (id, agent_id, prompt, response, user_wallet, credits_cost)
    VALUES (${id}, ${data.agentId}, ${data.prompt}, ${data.response}, ${data.userWallet}, ${data.creditsCost})`
  // Update agent stats
  await sql`UPDATE agents SET total_requests = total_requests + 1, total_earnings = total_earnings + ${data.creditsCost} WHERE id = ${data.agentId}`
}

export async function getRequestsByAgent(agentId: string) {
  await initDb()
  const rows = await sql`SELECT * FROM requests WHERE agent_id = ${agentId} ORDER BY created_at DESC LIMIT 20`
  return rows.map((r: any) => ({
    id: r.id, agentId: r.agent_id, prompt: r.prompt, response: r.response,
    userWallet: r.user_wallet, creditsCost: r.credits_cost, createdAt: r.created_at,
  }))
}

// ===== REVIEWS =====

export async function createReview(data: { agentId: string; userWallet: string; userName: string; rating: number; comment: string }): Promise<Review> {
  await initDb()
  const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  await sql`INSERT INTO reviews (id, agent_id, user_wallet, user_name, rating, comment)
    VALUES (${id}, ${data.agentId}, ${data.userWallet}, ${data.userName}, ${data.rating}, ${data.comment})`
  // Update agent rating
  const stats = await sql`SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE agent_id = ${data.agentId}`
  const avgRating = Math.round(parseFloat(stats[0].avg_rating) * 10) / 10
  const count = parseInt(stats[0].count)
  await sql`UPDATE agents SET rating = ${avgRating}, rating_count = ${count} WHERE id = ${data.agentId}`
  return { id, ...data, createdAt: new Date().toISOString() }
}

export async function getReviewsByAgent(agentId: string): Promise<Review[]> {
  await initDb()
  const rows = await sql`SELECT * FROM reviews WHERE agent_id = ${agentId} ORDER BY created_at DESC`
  return rows.map((r: any) => ({
    id: r.id, agentId: r.agent_id, userWallet: r.user_wallet,
    userName: r.user_name, rating: r.rating, comment: r.comment, createdAt: r.created_at,
  }))
}

// ===== CREDITS =====

export async function getUserCredits(wallet: string): Promise<UserCredits> {
  await initDb()
  const rows = await sql`SELECT * FROM user_credits WHERE wallet = ${wallet}`
  if (rows.length === 0) {
    await sql`INSERT INTO user_credits (wallet, balance, total_purchased, total_spent) VALUES (${wallet}, 0, 0, 0)`
    return { wallet, balance: 0, totalPurchased: 0, totalSpent: 0 }
  }
  return { wallet: rows[0].wallet, balance: rows[0].balance, totalPurchased: rows[0].total_purchased, totalSpent: rows[0].total_spent }
}

export async function addCredits(wallet: string, credits: number, solPaid: number, txSignature: string | null): Promise<UserCredits> {
  await initDb()
  const existing = await sql`SELECT * FROM user_credits WHERE wallet = ${wallet}`
  if (existing.length === 0) {
    await sql`INSERT INTO user_credits (wallet, balance, total_purchased, total_spent, last_purchase) VALUES (${wallet}, ${credits}, ${credits}, 0, NOW())`
  } else {
    await sql`UPDATE user_credits SET balance = balance + ${credits}, total_purchased = total_purchased + ${credits}, last_purchase = NOW() WHERE wallet = ${wallet}`
  }
  const purchaseId = `purchase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  await sql`INSERT INTO credit_purchases (id, wallet, credits, sol_paid, tx_signature) VALUES (${purchaseId}, ${wallet}, ${credits}, ${solPaid}, ${txSignature})`
  const rows = await sql`SELECT * FROM user_credits WHERE wallet = ${wallet}`
  return { wallet: rows[0].wallet, balance: rows[0].balance, totalPurchased: rows[0].total_purchased, totalSpent: rows[0].total_spent }
}

export async function spendCredits(wallet: string, amount: number): Promise<{ success: boolean; remaining: number }> {
  await initDb()
  const rows = await sql`SELECT balance FROM user_credits WHERE wallet = ${wallet}`
  if (rows.length === 0 || rows[0].balance < amount) {
    return { success: false, remaining: rows.length > 0 ? rows[0].balance : 0 }
  }
  await sql`UPDATE user_credits SET balance = balance - ${amount}, total_spent = total_spent + ${amount} WHERE wallet = ${wallet}`
  const updated = await sql`SELECT balance FROM user_credits WHERE wallet = ${wallet}`
  return { success: true, remaining: updated[0].balance }
}

// ===== WITHDRAWALS =====

export async function getCreatorEarnings(wallet: string): Promise<number> {
  await initDb()
  const rows = await sql`SELECT COALESCE(SUM(total_earnings), 0) as total FROM agents WHERE owner_wallet = ${wallet}`
  return parseInt(rows[0].total) || 0
}

export async function getCreatorWithdrawnTotal(wallet: string): Promise<number> {
  await initDb()
  const rows = await sql`SELECT COALESCE(SUM(credits), 0) as total FROM withdrawals WHERE creator_wallet = ${wallet} AND status IN ('approved', 'paid')`
  return parseInt(rows[0].total) || 0
}

export async function getCreatorAvailableCredits(wallet: string): Promise<number> {
  const earned = await getCreatorEarnings(wallet)
  const withdrawn = await getCreatorWithdrawnTotal(wallet)
  const pendingRows = await sql`SELECT COALESCE(SUM(credits), 0) as total FROM withdrawals WHERE creator_wallet = ${wallet} AND status = 'pending'`
  const pending = parseInt(pendingRows[0].total) || 0
  return earned - withdrawn - pending
}

export async function getCreatorWithdrawals(wallet: string): Promise<Withdrawal[]> {
  await initDb()
  const rows = await sql`SELECT * FROM withdrawals WHERE creator_wallet = ${wallet} ORDER BY created_at DESC`
  return rows.map(mapWithdrawal)
}

export async function createWithdrawal(wallet: string, credits: number): Promise<Withdrawal | { error: string }> {
  if (credits < MIN_WITHDRAWAL_CREDITS) {
    return { error: `Minimum withdrawal is ${MIN_WITHDRAWAL_CREDITS} credits` }
  }
  const available = await getCreatorAvailableCredits(wallet)
  if (credits > available) {
    return { error: `Insufficient balance. Available: ${available} credits` }
  }
  const id = `wd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const solAmount = Math.round(credits * CREDIT_TO_SOL_RATE * 10000) / 10000
  await sql`INSERT INTO withdrawals (id, creator_wallet, credits, sol_amount, status) VALUES (${id}, ${wallet}, ${credits}, ${solAmount}, 'pending')`
  const rows = await sql`SELECT * FROM withdrawals WHERE id = ${id}`
  return mapWithdrawal(rows[0])
}

export async function getAllPendingWithdrawals(): Promise<Withdrawal[]> {
  await initDb()
  const rows = await sql`SELECT * FROM withdrawals WHERE status = 'pending' ORDER BY created_at DESC`
  return rows.map(mapWithdrawal)
}

export async function approveWithdrawal(id: string, txSignature: string): Promise<Withdrawal | null> {
  await sql`UPDATE withdrawals SET status = 'paid', tx_signature = ${txSignature}, processed_at = NOW() WHERE id = ${id}`
  const rows = await sql`SELECT * FROM withdrawals WHERE id = ${id}`
  return rows.length > 0 ? mapWithdrawal(rows[0]) : null
}

export async function rejectWithdrawal(id: string): Promise<Withdrawal | null> {
  await sql`UPDATE withdrawals SET status = 'rejected', processed_at = NOW() WHERE id = ${id}`
  const rows = await sql`SELECT * FROM withdrawals WHERE id = ${id}`
  return rows.length > 0 ? mapWithdrawal(rows[0]) : null
}

function mapWithdrawal(row: any): Withdrawal {
  return {
    id: row.id, creatorWallet: row.creator_wallet, credits: row.credits,
    solAmount: row.sol_amount, status: row.status, txSignature: row.tx_signature,
    createdAt: row.created_at, processedAt: row.processed_at,
  }
}
