-- Fix Referrals Table - Add Missing Columns
-- Run this in Supabase SQL Editor

-- Add missing columns to existing referrals table
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reward_credits INTEGER DEFAULT 50000;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reward_usdc DECIMAL(10, 2) DEFAULT 0.25;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS rewarded_at TIMESTAMP;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS usdc_paid_at TIMESTAMP;

-- Update existing records to have default values
UPDATE referrals SET reward_credits = 50000 WHERE reward_credits IS NULL;
UPDATE referrals SET reward_usdc = 0.25 WHERE reward_usdc IS NULL;

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_wallet);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_usdc_status ON referrals(status, usdc_paid_at);

-- Ensure RLS is enabled
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view their referrals" ON referrals;
DROP POLICY IF EXISTS "Allow referral inserts" ON referrals;
DROP POLICY IF EXISTS "Allow referral updates" ON referrals;

CREATE POLICY "Users can view their referrals"
  ON referrals FOR SELECT
  USING (true);

CREATE POLICY "Allow referral inserts"
  ON referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow referral updates"
  ON referrals FOR UPDATE
  USING (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Referrals table updated successfully!';
  RAISE NOTICE '📊 Added columns: reward_credits, reward_usdc, rewarded_at, usdc_paid_at';
  RAISE NOTICE '💰 Dual rewards: 50,000 Credits + 0.25 USDC';
END;
$$;

