import { MongoClient, Db } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI!
const DB_NAME = 'grokie'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb
  
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  cachedClient = client
  cachedDb = client.db(DB_NAME)
  return cachedDb
}

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

// ===== AGENTS =====

export async function initDb() {
  // MongoDB doesn't need explicit table creation
  await getDb()
}

export async function getAllAgents(): Promise<Agent[]> {
  const db = await getDb()
  const agents = await db.collection('agents').find({ isActive: true }).sort({ totalRequests: -1 }).toArray()
  return agents.map(mapAgent)
}

export async function getAgentById(id: string): Promise<Agent | null> {
  const db = await getDb()
  const agent = await db.collection('agents').findOne({ id })
  return agent ? mapAgent(agent) : null
}

export async function getAgentsByOwner(wallet: string): Promise<Agent[]> {
  const db = await getDb()
  const agents = await db.collection('agents').find({ ownerWallet: wallet }).toArray()
  return agents.map(mapAgent)
}

export async function createAgent(data: { name: string; description: string; specialization: string; aiModel: string; endpoint: string; price: number; priceSol: number; ownerWallet: string }): Promise<Agent> {
  const db = await getDb()
  const agent = {
    id: `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...data,
    rating: 0,
    ratingCount: 0,
    totalRequests: 0,
    totalEarnings: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
  }
  await db.collection('agents').insertOne(agent)
  return agent as Agent
}

function mapAgent(doc: any): Agent {
  return {
    id: doc.id,
    name: doc.name,
    description: doc.description || '',
    specialization: doc.specialization,
    aiModel: doc.aiModel,
    endpoint: doc.endpoint,
    price: parseFloat(doc.price) || 0,
    priceSol: parseFloat(doc.priceSol) || 0,
    ownerWallet: doc.ownerWallet,
    rating: parseFloat(doc.rating) || 0,
    ratingCount: doc.ratingCount || 0,
    totalRequests: doc.totalRequests || 0,
    totalEarnings: doc.totalEarnings || 0,
    isActive: doc.isActive !== false,
    createdAt: doc.createdAt,
  }
}

// ===== REQUESTS =====

export async function createRequest(data: { agentId: string; prompt: string; response: string; userWallet: string | null; creditsCost: number }) {
  const db = await getDb()
  const req = {
    id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...data,
    createdAt: new Date().toISOString(),
  }
  await db.collection('requests').insertOne(req)
  // Update agent stats
  await db.collection('agents').updateOne(
    { id: data.agentId },
    { $inc: { totalRequests: 1, totalEarnings: data.creditsCost } }
  )
}

export async function getRequestsByAgent(agentId: string) {
  const db = await getDb()
  const rows = await db.collection('requests').find({ agentId }).sort({ createdAt: -1 }).limit(20).toArray()
  return rows.map((r: any) => ({
    id: r.id, agentId: r.agentId, prompt: r.prompt, response: r.response,
    userWallet: r.userWallet, creditsCost: r.creditsCost, createdAt: r.createdAt,
  }))
}

// ===== REVIEWS =====

export async function createReview(data: { agentId: string; userWallet: string; userName: string; rating: number; comment: string }): Promise<Review> {
  const db = await getDb()
  const review = {
    id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...data,
    createdAt: new Date().toISOString(),
  }
  await db.collection('reviews').insertOne(review)
  
  // Update agent rating (average)
  const reviews = await db.collection('reviews').find({ agentId: data.agentId }).toArray()
  const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
  await db.collection('agents').updateOne(
    { id: data.agentId },
    { $set: { rating: Math.round(avgRating * 10) / 10, ratingCount: reviews.length } }
  )
  
  return review as Review
}

export async function getReviewsByAgent(agentId: string): Promise<Review[]> {
  const db = await getDb()
  const rows = await db.collection('reviews').find({ agentId }).sort({ createdAt: -1 }).toArray()
  return rows.map((r: any) => ({
    id: r.id, agentId: r.agentId, userWallet: r.userWallet,
    userName: r.userName, rating: r.rating, comment: r.comment, createdAt: r.createdAt,
  }))
}
