-- Gift 30,000 Credits to All Wallets in chat_tokens Table
-- This script adds 30,000 credits to ALL wallets in the chat_tokens table
-- (Both generated and minted NFT owners will receive credits)

-- Step 1: Show current state (before update)
SELECT 
  'Before Update: Current chat_tokens' AS info,
  COUNT(*) AS total_wallets,
  SUM(balance) AS total_balance
FROM chat_tokens;

-- Step 2: Update ALL wallets in chat_tokens table (add 30,000 credits to each)
UPDATE chat_tokens
SET 
  balance = COALESCE(balance, 0) + 30000,
  updated_at = NOW();

-- Step 3: Show updated state (after update)
SELECT 
  'After Update: Updated chat_tokens' AS info,
  COUNT(*) AS total_wallets,
  SUM(balance) AS total_balance,
  AVG(balance) AS avg_balance
FROM chat_tokens;

-- Step 4: Verification - Show all updated balances
SELECT 
  wallet_address,
  balance,
  points,
  total_tokens_spent,
  created_at,
  updated_at
FROM chat_tokens
ORDER BY updated_at DESC;

