-- ============================================
-- COMPLETE SUPABASE MIGRATION FOR FARCASTER PROJECT
-- ============================================
-- Run this in your NEW Supabase project SQL Editor
-- This creates ALL tables needed for the Farcaster Mini App
--
-- Tables:
-- 1. users - User profiles (Farcaster users)
-- 2. tokens - Generated NFTs
-- 3. payments - Payment records (x402 USDC payments)
-- 4. chat_tokens - Credits and points for chatbot
-- 5. posts - Social media posts
-- 6. post_favs - Post favorites/likes
-- 7. weekly_rewards - Weekly reward winners
-- 8. kv_store - Key-value store for rate limiting
-- 9. referral_codes - Referral codes
-- 10. referrals - Referral relationships
-- 11. pending_referrals - Pending referral rewards
-- 12. conversations - Chat conversations
-- 13. messages - Chat messages
-- 14. message_rate_limits - Message rate limiting
-- 15. graph_reports - Yama Agent reports
-- ============================================

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  x_user_id VARCHAR(255) UNIQUE NOT NULL,  -- Farcaster FID stored here
  username VARCHAR(255) NOT NULL,           -- Farcaster username
  profile_image_url TEXT,                   -- Farcaster profile picture
  wallet_address VARCHAR(255),              -- User's wallet address
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_x_user_id ON users(x_user_id);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ============================================
-- 2. TOKENS TABLE (Generated NFTs)
-- ============================================
CREATE TABLE IF NOT EXISTS tokens (
  id SERIAL PRIMARY KEY,
  x_user_id VARCHAR(255) NOT NULL,          -- Farcaster FID
  token_id INTEGER,                         -- NFT token ID (NULL until minted)
  seed VARCHAR(255) NOT NULL,
  token_uri TEXT NOT NULL,
  metadata_uri TEXT NOT NULL,
  image_uri TEXT NOT NULL,
  wallet_address VARCHAR(255),              -- Minter's wallet address
  image_id TEXT,
  traits JSONB,                             -- NFT traits (JSON object)
  status VARCHAR(50) DEFAULT 'generated',   -- 'generated', 'paid', 'minted'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tokens_x_user_id ON tokens(x_user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_token_id ON tokens(token_id);
CREATE INDEX IF NOT EXISTS idx_tokens_wallet_address ON tokens(wallet_address);
CREATE INDEX IF NOT EXISTS idx_tokens_status ON tokens(status);
CREATE INDEX IF NOT EXISTS idx_tokens_x_user_status ON tokens(x_user_id, status);
CREATE INDEX IF NOT EXISTS idx_tokens_created_at ON tokens(created_at DESC);

-- ============================================
-- 3. PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  x_user_id VARCHAR(255) NOT NULL,          -- Farcaster FID
  wallet_address VARCHAR(255) NOT NULL,
  amount VARCHAR(255) NOT NULL,             -- Amount in USDC (string to preserve precision)
  transaction_hash VARCHAR(255) UNIQUE,     -- Blockchain transaction hash
  status VARCHAR(50) DEFAULT 'pending',     -- 'pending', 'completed', 'failed'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_x_user_id ON payments(x_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_wallet_address ON payments(wallet_address);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_hash ON payments(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================
-- 4. CHAT_TOKENS TABLE (Credits & Points)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_tokens (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(255) UNIQUE NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0,        -- Chat credits
  points BIGINT NOT NULL DEFAULT 0,         -- Loyalty points
  total_tokens_spent BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_tokens_wallet_address ON chat_tokens(wallet_address);

-- ============================================
-- 5. POSTS TABLE (Social Media)
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(255) NOT NULL,
  nft_token_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  fav_count BIGINT NOT NULL DEFAULT 0,
  points_earned BIGINT NOT NULL DEFAULT 0,
  tokens_burned BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_wallet_address ON posts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_posts_nft_token_id ON posts(nft_token_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_fav_count ON posts(fav_count DESC);

-- ============================================
-- 6. POST_FAVS TABLE (Likes/Favorites)
-- ============================================
CREATE TABLE IF NOT EXISTS post_favs (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  nft_token_id INTEGER NOT NULL,
  tokens_burned BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_post_favs_post_id ON post_favs(post_id);
CREATE INDEX IF NOT EXISTS idx_post_favs_wallet_address ON post_favs(wallet_address);
CREATE INDEX IF NOT EXISTS idx_post_favs_created_at ON post_favs(created_at);

-- ============================================
-- 7. WEEKLY_REWARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_rewards (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  reward_type VARCHAR(50) NOT NULL,
  winner_wallet_address VARCHAR(255) NOT NULL,
  winner_nft_token_id INTEGER,
  winner_post_id INTEGER,
  tokens_awarded BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_rewards_week_start_date ON weekly_rewards(week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_rewards_reward_type ON weekly_rewards(reward_type);

-- ============================================
-- 8. KV_STORE TABLE (Rate Limiting)
-- ============================================
CREATE TABLE IF NOT EXISTS kv_store (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kv_store_expires_at ON kv_store(expires_at);

-- ============================================
-- 9. REFERRAL_CODES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS referral_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) UNIQUE NOT NULL,
  referrer_x_user_id VARCHAR(255) NOT NULL, -- Farcaster FID of referrer
  referrer_wallet_address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_referrer_x_user_id ON referral_codes(referrer_x_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_referrer_wallet ON referral_codes(referrer_wallet_address);

-- ============================================
-- 10. REFERRALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referral_code VARCHAR(255) NOT NULL,
  referrer_x_user_id VARCHAR(255) NOT NULL, -- Farcaster FID of referrer
  referrer_wallet_address VARCHAR(255) NOT NULL,
  referee_x_user_id VARCHAR(255) NOT NULL,  -- Farcaster FID of referee
  referee_wallet_address VARCHAR(255) NOT NULL,
  credits_awarded BIGINT NOT NULL DEFAULT 0,
  points_awarded BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_x_user_id ON referrals(referrer_x_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee_x_user_id ON referrals(referee_x_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON referrals(referral_code);

-- ============================================
-- 11. PENDING_REFERRALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS pending_referrals (
  id SERIAL PRIMARY KEY,
  referral_code VARCHAR(255) NOT NULL,
  referee_x_user_id VARCHAR(255) UNIQUE NOT NULL, -- Farcaster FID
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_referrals_code ON pending_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_pending_referrals_referee ON pending_referrals(referee_x_user_id);

-- ============================================
-- 12. CONVERSATIONS TABLE (Chatbot)
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(255) NOT NULL,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_wallet_address ON conversations(wallet_address);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- ============================================
-- 13. MESSAGES TABLE (Chatbot)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL,
  role VARCHAR(50) NOT NULL,              -- 'user' or 'assistant'
  content TEXT NOT NULL,
  tokens_used BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- ============================================
-- 14. MESSAGE_RATE_LIMITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS message_rate_limits (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(255) NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(wallet_address, window_start)
);

CREATE INDEX IF NOT EXISTS idx_message_rate_limits_wallet ON message_rate_limits(wallet_address);
CREATE INDEX IF NOT EXISTS idx_message_rate_limits_window ON message_rate_limits(window_start);

-- ============================================
-- 15. GRAPH_REPORTS TABLE (Yama Agent)
-- ============================================
CREATE TABLE IF NOT EXISTS graph_reports (
  report_date DATE PRIMARY KEY,
  report_content JSONB,
  generated_at TIMESTAMP DEFAULT NOW(),
  model_used VARCHAR(255),
  tokens_used BIGINT
);

CREATE INDEX IF NOT EXISTS idx_graph_reports_generated_at ON graph_reports(generated_at DESC);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
-- Note: Service Role Key bypasses RLS, so API access will still work
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_favs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kv_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ANALYZE TABLES (Optimize Query Planner)
-- ============================================
ANALYZE users;
ANALYZE tokens;
ANALYZE payments;
ANALYZE chat_tokens;
ANALYZE posts;
ANALYZE post_favs;
ANALYZE weekly_rewards;
ANALYZE kv_store;
ANALYZE referral_codes;
ANALYZE referrals;
ANALYZE pending_referrals;
ANALYZE conversations;
ANALYZE messages;
ANALYZE message_rate_limits;
ANALYZE graph_reports;

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
-- Next steps:
-- 1. Copy your new Supabase URL and keys
-- 2. Update Vercel environment variables:
--    - NEXT_PUBLIC_SUPABASE_URL
--    - SUPABASE_SERVICE_ROLE_KEY
-- 3. Redeploy your app
-- ============================================

