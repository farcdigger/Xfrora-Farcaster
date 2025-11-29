-- Optimize Supabase for high traffic
-- Run this SQL in Supabase SQL Editor

-- 1. Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_users_x_user_id ON users(x_user_id);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_tokens_x_user_id ON tokens(x_user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_token_id ON tokens(token_id);
CREATE INDEX IF NOT EXISTS idx_tokens_status ON tokens(status);
CREATE INDEX IF NOT EXISTS idx_payments_x_user_id ON payments(x_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_hash ON payments(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_chat_tokens_wallet_address ON chat_tokens(wallet_address);

-- 2. Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tokens_x_user_status ON tokens(x_user_id, status);
CREATE INDEX IF NOT EXISTS idx_tokens_status_created ON tokens(status, created_at DESC);

-- 3. Analyze tables for query planner
ANALYZE users;
ANALYZE tokens;
ANALYZE payments;
ANALYZE chat_tokens;

-- 4. Check current connections (to see if we're hitting limits)
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';

-- 5. Show table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

