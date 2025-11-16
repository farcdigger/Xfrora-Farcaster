import postgres from "postgres";
import { env } from "../env.mjs";

const connectionString = env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL not configured");
  process.exit(1);
}
const sql = postgres(connectionString);

async function runMigrations() {
  console.log("Running database migrations...");
  if (connectionString) {
    console.log("Database:", connectionString.replace(/:[^:@]+@/, ":****@"));
  }

  try {
    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        x_user_id VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(255) NOT NULL,
        profile_image_url TEXT,
        wallet_address VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✓ users table created");

    // Tokens table
    await sql`
      CREATE TABLE IF NOT EXISTS tokens (
        id SERIAL PRIMARY KEY,
        x_user_id VARCHAR(255) NOT NULL,
        token_id INTEGER NOT NULL UNIQUE,
        seed VARCHAR(64) NOT NULL,
        token_uri TEXT NOT NULL,
        metadata_uri TEXT NOT NULL,
        image_uri TEXT NOT NULL,
        traits JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✓ tokens table created");

    // Payments table
    await sql`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        x_user_id VARCHAR(255) NOT NULL,
        wallet_address VARCHAR(255) NOT NULL,
        amount VARCHAR(100) NOT NULL,
        transaction_hash VARCHAR(255),
        status VARCHAR(50) NOT NULL,
        x402_payment_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✓ payments table created");

    // KV Store table (Supabase alternative to Redis KV)
    await sql`
      CREATE TABLE IF NOT EXISTS kv_store (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✓ kv_store table created");

    // Chat tokens table
    await sql`
      CREATE TABLE IF NOT EXISTS chat_tokens (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(255) NOT NULL UNIQUE,
        balance BIGINT NOT NULL DEFAULT 0,
        points BIGINT NOT NULL DEFAULT 0,
        total_tokens_spent BIGINT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✓ chat_tokens table created");

    // Add columns if they don't exist (for existing tables)
    await sql`
      DO $$
       BEGIN
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'chat_tokens' AND column_name = 'points'
         ) THEN
           ALTER TABLE chat_tokens ADD COLUMN points BIGINT NOT NULL DEFAULT 0;
         END IF;
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.columns 
           WHERE table_name = 'chat_tokens' AND column_name = 'total_tokens_spent'
         ) THEN
           ALTER TABLE chat_tokens ADD COLUMN total_tokens_spent BIGINT NOT NULL DEFAULT 0;
         END IF;
       END $$;
    `;

    // Indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_x_user_id ON users(x_user_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_tokens_x_user_id ON tokens(x_user_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_payments_x_user_id ON payments(x_user_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_kv_store_expires_at ON kv_store(expires_at);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_chat_tokens_wallet_address ON chat_tokens(wallet_address);
    `;

    // Create posts table (social media posts/tweets)
    await sql`
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
    `;
    console.log("✓ posts table created");

    // Create post_favs table (favorites/likes)
    await sql`
      CREATE TABLE IF NOT EXISTS post_favs (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL,
        wallet_address VARCHAR(255) NOT NULL,
        nft_token_id INTEGER NOT NULL,
        tokens_burned BIGINT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(post_id, wallet_address)
      );
    `;
    console.log("✓ post_favs table created");

    // Create weekly_rewards table
    await sql`
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
    `;
    console.log("✓ weekly_rewards table created");

    // Create indexes for posts table
    await sql`
      CREATE INDEX IF NOT EXISTS idx_posts_wallet_address ON posts(wallet_address);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_posts_nft_token_id ON posts(nft_token_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_posts_fav_count ON posts(fav_count DESC);
    `;

    // Create indexes for post_favs table
    await sql`
      CREATE INDEX IF NOT EXISTS idx_post_favs_post_id ON post_favs(post_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_post_favs_wallet_address ON post_favs(wallet_address);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_post_favs_created_at ON post_favs(created_at);
    `;

    // Create indexes for weekly_rewards table
    await sql`
      CREATE INDEX IF NOT EXISTS idx_weekly_rewards_week_start_date ON weekly_rewards(week_start_date);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_weekly_rewards_reward_type ON weekly_rewards(reward_type);
    `;
    console.log("✓ indexes created");

    console.log("\n✅ All migrations completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();

