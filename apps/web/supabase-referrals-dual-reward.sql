-- Referral System: Dual Reward (Credits + USDC)
-- Users earn BOTH 50,000 credits (instant) AND 0.25 USDC (pending manual payment)

-- 1. Add reward_usdc column (tracks pending USDC payment)
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS reward_usdc DECIMAL(10, 2) DEFAULT 0.25;

-- 2. Add usdc_paid_at timestamp (tracks when USDC was manually paid)
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS usdc_paid_at TIMESTAMP;

-- 3. Update status column logic
-- Status now tracks: pending → completed (credits given) → paid (USDC sent)
COMMENT ON COLUMN referrals.status IS 'pending: awaiting mint, completed: credits awarded, paid: USDC sent manually';

-- 4. Create index for USDC payment tracking
CREATE INDEX IF NOT EXISTS idx_referrals_usdc_status ON referrals(status, usdc_paid_at);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Dual reward system enabled!';
  RAISE NOTICE '💰 Per referral: 50,000 Credits (instant) + 0.25 USDC (pending)';
  RAISE NOTICE '📊 New columns: reward_usdc, usdc_paid_at';
  RAISE NOTICE '🔄 Status flow: pending → completed → paid';
END;
$$;

