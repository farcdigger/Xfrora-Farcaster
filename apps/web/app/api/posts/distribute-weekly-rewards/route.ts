/**
 * POST /api/posts/distribute-weekly-rewards
 * Distribute weekly rewards and clean up old data
 * Admin/cron endpoint - should be protected in production
 */

import { NextRequest, NextResponse } from "next/server";
import { db, posts, post_favs, weekly_rewards, chat_tokens } from "@/lib/db";
import { eq } from "drizzle-orm";
import { addTokens } from "@/lib/chat-tokens-mock";
import { supabaseClient } from "@/lib/db-supabase";

const REWARD_AMOUNT = 1000000; // 1,000,000 tokens
const CLEANUP_DAYS = 14; // Delete posts older than 2 weeks

/**
 * Get start and end dates for current week (Monday to Sunday)
 */
function getCurrentWeekDates(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

export async function POST(request: NextRequest) {
  try {
    const weekDates = getCurrentWeekDates();

    // Find post with most favs (all posts, not just last 200)
    let mostFavdPost: any = null;
    let mostFavsCount = 0;

    if (supabaseClient) {
      const { data, error } = await (supabaseClient as any)
        .from("posts")
        .select("*")
        .order("fav_count", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        mostFavdPost = data[0];
        mostFavsCount = Number(mostFavdPost.fav_count) || 0;
      }
    } else {
      // Fallback to Drizzle
      const allPosts = await db
        .select()
        .from(posts)
        .limit(10000); // Get all posts

      if (allPosts.length > 0) {
        mostFavdPost = allPosts.reduce((max: any, post: any) => {
          const favCount = Number(post.fav_count) || 0;
          return favCount > (Number(max.fav_count) || 0) ? post : max;
        });
        mostFavsCount = Number(mostFavdPost.fav_count) || 0;
      }
    }

    // Find user who gave most favs
    let mostFavsGiver: any = null;
    let mostFavsGiven = 0;

    if (supabaseClient) {
      const { data, error } = await (supabaseClient as any)
        .from("post_favs")
        .select("wallet_address, nft_token_id")
        .limit(100000); // Get all favs

      if (!error && data) {
        // Count favs per wallet
        const favCounts: Record<string, { count: number; nftTokenId: number | null }> = {};
        data.forEach((fav: any) => {
          const wallet = fav.wallet_address.toLowerCase();
          if (!favCounts[wallet]) {
            favCounts[wallet] = { count: 0, nftTokenId: fav.nft_token_id };
          }
          favCounts[wallet].count++;
        });

        // Find wallet with most favs
        Object.entries(favCounts).forEach(([wallet, info]) => {
          if (info.count > mostFavsGiven) {
            mostFavsGiven = info.count;
            mostFavsGiver = {
              wallet_address: wallet,
              nft_token_id: info.nftTokenId,
            };
          }
        });
      }
    } else {
      // Fallback to Drizzle
      const allFavs = await db
        .select()
        .from(post_favs)
        .limit(100000);

      const favCounts: Record<string, { count: number; nftTokenId: number | null }> = {};
      allFavs.forEach((fav: any) => {
        const wallet = fav.wallet_address.toLowerCase();
        if (!favCounts[wallet]) {
          favCounts[wallet] = { count: 0, nftTokenId: fav.nft_token_id };
        }
        favCounts[wallet].count++;
      });

      Object.entries(favCounts).forEach(([wallet, info]) => {
        if (info.count > mostFavsGiven) {
          mostFavsGiven = info.count;
          mostFavsGiver = {
            wallet_address: wallet,
            nft_token_id: info.nftTokenId,
          };
        }
      });
    }

    const rewards = [];

    // Award to most favd post owner
    if (mostFavdPost && mostFavsCount > 0) {
      const winnerWallet = mostFavdPost.wallet_address.toLowerCase();
      await addTokens(winnerWallet, REWARD_AMOUNT);

      await db.insert(weekly_rewards).values({
        week_start_date: weekDates.start,
        week_end_date: weekDates.end,
        reward_type: "most_favd_post",
        winner_wallet_address: winnerWallet,
        winner_nft_token_id: mostFavdPost.nft_token_id,
        winner_post_id: mostFavdPost.id,
        tokens_awarded: REWARD_AMOUNT,
        status: "completed",
      });

      rewards.push({
        type: "most_favd_post",
        winner_nft_token_id: mostFavdPost.nft_token_id,
        winner_post_id: mostFavdPost.id,
        tokens_awarded: REWARD_AMOUNT,
        fav_count: mostFavsCount,
      });
    }

    // Award to most favs giver
    if (mostFavsGiver && mostFavsGiven > 0) {
      await addTokens(mostFavsGiver.wallet_address, REWARD_AMOUNT);

      await db.insert(weekly_rewards).values({
        week_start_date: weekDates.start,
        week_end_date: weekDates.end,
        reward_type: "most_favs_given",
        winner_wallet_address: mostFavsGiver.wallet_address,
        winner_nft_token_id: mostFavsGiver.nft_token_id,
        winner_post_id: null,
        tokens_awarded: REWARD_AMOUNT,
        status: "completed",
      });

      rewards.push({
        type: "most_favs_given",
        winner_nft_token_id: mostFavsGiver.nft_token_id,
        tokens_awarded: REWARD_AMOUNT,
        favs_given: mostFavsGiven,
      });
    }

    // Clean up old posts (older than 2 weeks)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_DAYS);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    if (supabaseClient) {
      // Get old post IDs
      const { data: oldPosts } = await (supabaseClient as any)
        .from("posts")
        .select("id")
        .lt("created_at", cutoffDateStr);

      if (oldPosts && oldPosts.length > 0) {
        const oldPostIds = oldPosts.map((p: any) => p.id);

        // Delete old favs
        for (const postId of oldPostIds) {
          await (supabaseClient as any)
            .from("post_favs")
            .delete()
            .eq("post_id", postId);
        }

        // Delete old posts
        for (const postId of oldPostIds) {
          await (supabaseClient as any)
            .from("posts")
            .delete()
            .eq("id", postId);
        }
      }
    } else {
      // Fallback: Manual cleanup (would need to implement)
      console.log(`⚠️ Cleanup not implemented for mock mode. Would delete posts older than ${cutoffDateStr}`);
    }

    return NextResponse.json({
      success: true,
      week: weekDates,
      rewards,
      cleanup: {
        cutoff_date: cutoffDateStr,
        message: "Old posts and favs cleaned up",
      },
    });
  } catch (error: any) {
    console.error("Error distributing weekly rewards:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

