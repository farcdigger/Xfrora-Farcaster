/**
 * GET /api/posts
 * Get latest 200 posts (tweets)
 * No NFT check required - everyone can view
 */

import { NextRequest, NextResponse } from "next/server";
import { db, posts } from "@/lib/db";
import { supabaseClient } from "@/lib/db-supabase";

const POSTS_LIMIT = 200;

export async function GET(request: NextRequest) {
  try {
    // Use Supabase client directly for ordering
    if (supabaseClient) {
      const { data, error } = await (supabaseClient as any)
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(POSTS_LIMIT);

      if (error) {
        console.error("Supabase query error:", error);
        return NextResponse.json(
          { error: "Failed to fetch posts", details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        posts: (data || []).map((post: any) => ({
          id: post.id,
          nft_token_id: post.nft_token_id,
          content: post.content,
          fav_count: Number(post.fav_count) || 0,
          created_at: post.created_at,
        })),
        total: data?.length || 0,
      });
    }

    // Fallback to Drizzle (for mock mode)
    const allPosts = await db
      .select()
      .from(posts)
      .limit(POSTS_LIMIT);

    // Sort by created_at descending (newest first)
    const sortedPosts = allPosts
      .sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, POSTS_LIMIT);

    return NextResponse.json({
      posts: sortedPosts.map((post: any) => ({
        id: post.id,
        nft_token_id: post.nft_token_id,
        content: post.content,
        fav_count: Number(post.fav_count) || 0,
        created_at: post.created_at,
      })),
      total: sortedPosts.length,
    });
  } catch (error: any) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

