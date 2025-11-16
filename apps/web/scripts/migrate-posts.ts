/**
 * Migration script for posts, post_favs, and weekly_rewards tables
 * Run this script to create the new tables in Supabase
 * 
 * Usage:
 *   npm run migrate:posts
 *   or
 *   tsx scripts/migrate-posts.ts
 */

import { runMigrations } from "../lib/migrations";

async function main() {
  console.log("🚀 Starting posts migration...");
  
  try {
    await runMigrations();
    console.log("✅ Migration completed successfully!");
    console.log("\n📋 Created tables:");
    console.log("   - posts");
    console.log("   - post_favs");
    console.log("   - weekly_rewards");
    console.log("\n✨ All done! Your social media features are ready.");
  } catch (error: any) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();

