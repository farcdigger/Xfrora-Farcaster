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

      // Filter out posts with null or invalid created_at, and ensure proper sorting
      const validPosts = (data || [])
        .filter((post: any) => post.created_at != null)
        .sort((a: any, b: any) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA; // Newest first
        })
        .slice(0, POSTS_LIMIT);

      return NextResponse.json({
        posts: validPosts.map((post: any) => ({
          id: Number(post.id),
          nft_token_id: Number(post.nft_token_id) || 0,
          content: post.content || "",
          fav_count: Number(post.fav_count) || 0,
          created_at: post.created_at,
        })),
        total: validPosts.length,
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

    // Filter out posts with null or invalid created_at
    const validPosts = sortedPosts.filter((post: any) => post.created_at != null);

    return NextResponse.json({
      posts: validPosts.map((post: any) => ({
        id: Number(post.id),
        nft_token_id: Number(post.nft_token_id) || 0,
        content: post.content || "",
        fav_count: Number(post.fav_count) || 0,
        created_at: post.created_at,
      })),
      total: validPosts.length,
    });
  } catch (error: any) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

