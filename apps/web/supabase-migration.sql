-- Supabase Migration SQL for Posts, Post Favs, and Weekly Rewards
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- Create posts table (social media posts/tweets)
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

-- Create post_favs table (favorites/likes)
CREATE TABLE IF NOT EXISTS post_favs (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  wallet_address VARCHAR(255) NOT NULL,
  nft_token_id INTEGER NOT NULL,
  tokens_burned BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, wallet_address)
);

-- Create weekly_rewards table
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

-- Create indexes for posts table
CREATE INDEX IF NOT EXISTS idx_posts_wallet_address ON posts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_posts_nft_token_id ON posts(nft_token_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_fav_count ON posts(fav_count DESC);

-- Create indexes for post_favs table
CREATE INDEX IF NOT EXISTS idx_post_favs_post_id ON post_favs(post_id);
CREATE INDEX IF NOT EXISTS idx_post_favs_wallet_address ON post_favs(wallet_address);
CREATE INDEX IF NOT EXISTS idx_post_favs_created_at ON post_favs(created_at);

-- Create indexes for weekly_rewards table
CREATE INDEX IF NOT EXISTS idx_weekly_rewards_week_start_date ON weekly_rewards(week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_rewards_reward_type ON weekly_rewards(reward_type);

-- Add foreign key constraints (optional, for data integrity)
-- ALTER TABLE post_favs ADD CONSTRAINT fk_post_favs_post_id FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

