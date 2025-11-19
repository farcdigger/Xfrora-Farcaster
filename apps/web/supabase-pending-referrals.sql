-- Pending Referrals Table
-- Stores referral codes when users connect their X account
-- This ensures we don't lose referral tracking during the auth flow

CREATE TABLE IF NOT EXISTS pending_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  x_user_id VARCHAR(255) NOT NULL UNIQUE,
  referral_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookup by x_user_id
CREATE INDEX IF NOT EXISTS idx_pending_referrals_x_user_id ON pending_referrals(x_user_id);

-- Index for fast lookup by referral_code
CREATE INDEX IF NOT EXISTS idx_pending_referrals_code ON pending_referrals(referral_code);

-- RLS Policies
ALTER TABLE pending_referrals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read" ON pending_referrals;
DROP POLICY IF EXISTS "Allow public insert" ON pending_referrals;
DROP POLICY IF EXISTS "Allow public delete" ON pending_referrals;

-- Allow public operations (API will handle business logic)
CREATE POLICY "Allow public read"
  ON pending_referrals FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert"
  ON pending_referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public delete"
  ON pending_referrals FOR DELETE
  USING (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ pending_referrals table created successfully!';
  RAISE NOTICE '📊 This table stores referral codes during X auth flow';
  RAISE NOTICE '🔒 Referral tracking is now bulletproof!';
END;
$$;

