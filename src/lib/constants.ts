export const SPECIALIZATIONS = [
  { id: 'trading', label: 'AI Trading', icon: '📈', description: 'Automated trading strategies and market analysis' },
  { id: 'auditor', label: 'Solana Auditor', icon: '🛡️', description: 'Smart contract security auditing and vulnerability detection' },
  { id: 'marketing', label: 'AI Marketing', icon: '🎯', description: 'Marketing campaigns, content generation, and growth strategies' },
  { id: 'legal', label: 'Legal Assistant', icon: '⚖️', description: 'Contract review, compliance, and legal advisory' },
  { id: 'support', label: 'Customer Support', icon: '💬', description: 'Automated customer service with multi-language support' },
  { id: 'data', label: 'Data Analysis', icon: '📊', description: 'On-chain/off-chain data analytics and predictions' },
  { id: 'coding', label: 'Code Assistant', icon: '💻', description: 'Code generation, review, and debugging' },
  { id: 'creative', label: 'Creative Writing', icon: '✍️', description: 'Content creation and copywriting' },
] as const

export const AI_MODELS = [
  { id: 'openai', label: 'OpenAI (GPT-4, etc)', provider: 'OpenAI', icon: '🟢' },
  { id: 'claude', label: 'Claude (Anthropic)', provider: 'Anthropic', icon: '🟠' },
  { id: 'gemini', label: 'Gemini (Google)', provider: 'Google', icon: '🔵' },
  { id: 'llama', label: 'Llama (Meta/Self-hosted)', provider: 'Meta', icon: '🟣' },
  { id: 'deepseek', label: 'DeepSeek', provider: 'DeepSeek', icon: '🔷' },
  { id: 'custom', label: 'Custom / Fine-tuned', provider: 'Self-hosted', icon: '⚙️' },
] as const

export const REQUEST_STATUS = {
  Pending: 'pending',
  Completed: 'completed',
  Failed: 'failed',
} as const

// Payment: Native SOL
export const PAYMENT_CURRENCY = 'SOL'
export const LAMPORTS_PER_SOL = 1_000_000_000

// Platform fee: 5% goes to treasury wallet
export const PLATFORM_FEE_BPS = 500
export const PLATFORM_FEE_PERCENT = 5
export const CREATOR_SHARE_PERCENT = 95

// Treasury wallet - receives all platform fees
export const TREASURY_ADDRESS = '8McdPygGbvCiZSfkMjNrbumUs2aR8SEHZUYc2SNo5bFP'

// Network config
export const NETWORKS = {
  'mainnet-beta': {
    name: 'Mainnet',
    rpc: 'https://api.mainnet-beta.solana.com',
  },
  devnet: {
    name: 'Devnet',
    rpc: 'https://api.devnet.solana.com',
  },
} as const

// Solana explorers
export const EXPLORER_BASE = 'https://explorer.solana.com'
export const SOLSCAN_BASE = 'https://solscan.io'
