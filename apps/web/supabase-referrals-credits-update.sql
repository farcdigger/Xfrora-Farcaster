-- Referral System Update: USDC to Credits Migration
-- This migration updates the referral system to award credits instead of USDC

-- 1. Drop the old reward_amount column (DECIMAL for USDC)
ALTER TABLE referrals DROP COLUMN IF EXISTS reward_amount;

-- 2. Add new reward_credits column (INTEGER for credits)
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reward_credits INTEGER DEFAULT 50000;

-- 3. Add rewarded_at timestamp (to track when the reward was given)
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS rewarded_at TIMESTAMP;

-- 4. Update status column comment
COMMENT ON COLUMN referrals.status IS 'pending: waiting for mint completion, completed: credits awarded';

-- 5. Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_wallet);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Referral credits system updated successfully!';
  RAISE NOTICE '💰 Reward changed: 0.50 USDC → 50,000 Credits';
  RAISE NOTICE '📊 New columns: reward_credits, rewarded_at';
END;
$$;

