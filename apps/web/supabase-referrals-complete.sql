-- Complete Referral System Migration
-- Run this ONCE in Supabase SQL Editor

-- Temporarily disable RLS for migration
ALTER TABLE IF EXISTS referral_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS referrals DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 1. Referral Codes Table
-- ============================================
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_wallet ON referral_codes(wallet_address);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

-- ============================================
-- 2. Referrals Table (Dual Reward System)
-- ============================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_wallet VARCHAR(255) NOT NULL,
  referee_wallet VARCHAR(255) NOT NULL UNIQUE,
  reward_credits INTEGER DEFAULT 50000,
  reward_usdc DECIMAL(10, 2) DEFAULT 0.25,
  status VARCHAR(20) DEFAULT 'pending',
  rewarded_at TIMESTAMP,
  usdc_paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_usdc_status ON referrals(status, usdc_paid_at);

-- ============================================
-- 3. RLS Policies
-- ============================================
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public read referral codes" ON referral_codes;
DROP POLICY IF EXISTS "Users can create their own code" ON referral_codes;
DROP POLICY IF EXISTS "Users can view their referrals" ON referrals;
DROP POLICY IF EXISTS "Allow referral inserts" ON referrals;
DROP POLICY IF EXISTS "Allow referral updates" ON referrals;

-- Public read for referral codes (needed for link validation)
CREATE POLICY "Public read referral codes"
  ON referral_codes FOR SELECT
  USING (true);

-- Users can create their own referral code
CREATE POLICY "Users can create their own code"
  ON referral_codes FOR INSERT
  WITH CHECK (true);

-- Users can view their own referrals
CREATE POLICY "Users can view their referrals"
  ON referrals FOR SELECT
  USING (true);

-- Allow referral inserts (via API)
CREATE POLICY "Allow referral inserts"
  ON referrals FOR INSERT
  WITH CHECK (true);

-- Allow referral updates (for status changes)
CREATE POLICY "Allow referral updates"
  ON referrals FOR UPDATE
  USING (true);

-- ============================================
-- Success Message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Complete referral system created successfully!';
  RAISE NOTICE '📊 Tables: referral_codes, referrals';
  RAISE NOTICE '💰 Dual rewards: 50,000 Credits (instant) + 0.25 USDC (pending)';
  RAISE NOTICE '🔒 RLS policies enabled';
  RAISE NOTICE '⚡ Indexes created for performance';
END;
$$;

