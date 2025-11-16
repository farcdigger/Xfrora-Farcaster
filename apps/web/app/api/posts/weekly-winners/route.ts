/**
 * GET /api/posts/weekly-winners
 * Get weekly reward winners
 * No NFT check required - everyone can view
 */

import { NextRequest, NextResponse } from "next/server";
import { db, weekly_rewards } from "@/lib/db";
import { supabaseClient } from "@/lib/db-supabase";

export async function GET(request: NextRequest) {
  try {
    // Get latest weekly rewards
    if (supabaseClient) {
      const { data, error } = await (supabaseClient as any)
        .from("weekly_rewards")
        .select("*")
        .order("week_start_date", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Supabase query error:", error);
        return NextResponse.json(
          { error: "Failed to fetch weekly winners", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        winners: (data || []).map((reward: any) => ({
          id: reward.id,
          week_start_date: reward.week_start_date,
          week_end_date: reward.week_end_date,
          reward_type: reward.reward_type,
          winner_nft_token_id: reward.winner_nft_token_id,
          winner_post_id: reward.winner_post_id,
          tokens_awarded: Number(reward.tokens_awarded) || 0,
          status: reward.status,
          created_at: reward.created_at,
        })),
      });
    }

    // Fallback to Drizzle (for mock mode)
    const allRewards = await db
      .select()
      .from(weekly_rewards)
      .limit(10);

    // Sort by week_start_date descending
    const sortedRewards = allRewards.sort((a: any, b: any) => {
      const dateA = new Date(a.week_start_date || 0).getTime();
      const dateB = new Date(b.week_start_date || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      winners: sortedRewards.map((reward: any) => ({
        id: reward.id,
        week_start_date: reward.week_start_date,
        week_end_date: reward.week_end_date,
        reward_type: reward.reward_type,
        winner_nft_token_id: reward.winner_nft_token_id,
        winner_post_id: reward.winner_post_id,
        tokens_awarded: Number(reward.tokens_awarded) || 0,
        status: reward.status,
        created_at: reward.created_at,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching weekly winners:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

