import { create } from 'zustand'

interface Agent {
  id: number
  name: string
  specialization: string
  aiModel: string
  agentWallet: string
  rating: number
  ratingCount: number
  totalRequests: number
  totalEarnings: string
  isActive: boolean
  price: string
  staked: string
}

interface Request {
  id: number
  agentId: number
  requester: string
  amount: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded'
  prompt: string
  responseHash: string
  createdAt: number
  completedAt: number
}

interface AppState {
  // Agents
  agents: Agent[]
  selectedAgent: Agent | null
  setAgents: (agents: Agent[]) => void
  setSelectedAgent: (agent: Agent | null) => void

  // Requests
  requests: Request[]
  setRequests: (requests: Request[]) => void
  addRequest: (request: Request) => void

  // UI State
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // User
  userBalance: string
  setUserBalance: (balance: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Agents
  agents: [],
  selectedAgent: null,
  setAgents: (agents) => set({ agents }),
  setSelectedAgent: (selectedAgent) => set({ selectedAgent }),

  // Requests
  requests: [],
  setRequests: (requests) => set({ requests }),
  addRequest: (request) =>
    set((state) => ({ requests: [request, ...state.requests] })),

  // UI State
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),

  // User
  userBalance: '0',
  setUserBalance: (userBalance) => set({ userBalance }),
}))
