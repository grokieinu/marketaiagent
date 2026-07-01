-- Grokie Inu AI Agent Marketplace - Database Schema

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  specialization TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  price INTEGER DEFAULT 0,
  price_sol REAL DEFAULT 0,
  owner_wallet TEXT NOT NULL,
  rating REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  total_requests INTEGER DEFAULT 0,
  total_earnings INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  prompt TEXT NOT NULL,
  response TEXT DEFAULT '',
  user_wallet TEXT,
  credits_cost INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  user_wallet TEXT NOT NULL,
  user_name TEXT DEFAULT 'Anonymous',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_credits (
  wallet TEXT PRIMARY KEY,
  balance INTEGER DEFAULT 0,
  total_purchased INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  last_purchase TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credit_purchases (
  id TEXT PRIMARY KEY,
  wallet TEXT NOT NULL,
  credits INTEGER NOT NULL,
  sol_paid REAL NOT NULL,
  tx_signature TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY,
  creator_wallet TEXT NOT NULL,
  credits INTEGER NOT NULL,
  sol_amount REAL NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  tx_signature TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_owner ON agents(owner_wallet);
CREATE INDEX IF NOT EXISTS idx_agents_active ON agents(is_active);
CREATE INDEX IF NOT EXISTS idx_requests_agent ON requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_requests_wallet ON requests(user_wallet);
CREATE INDEX IF NOT EXISTS idx_reviews_agent ON reviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_wallet ON withdrawals(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
