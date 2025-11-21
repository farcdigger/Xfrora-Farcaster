/**
 * Leaderboard endpoint for chatbot points
 * Returns top users by points
 */

import { NextRequest, NextResponse } from "next/server";
import { db, chat_tokens } from "@/lib/db";
import { isMockMode } from "@/env.mjs";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    if (isMockMode) {
      // Mock mode: return empty leaderboard or mock data
      const { getMockTokenBalances } = await import("@/lib/chat-tokens-mock");
      const mockTokenBalances = getMockTokenBalances();
      
      // Convert Map to array and sort by points
      const users = Array.from(mockTokenBalances.entries())
        .map(([wallet, data]) => ({
          wallet_address: wallet,
          points: data.points || 0,
          total_tokens_spent: data.totalTokensSpent || 0,
          balance: data.balance || 0,
        }))
        .sort((a, b) => b.points - a.points)
        .slice(offset, offset + limit)
        .map((user, index) => ({
          rank: offset + index + 1,
          wallet_address: user.wallet_address,
          points: user.points,
          total_tokens_spent: user.total_tokens_spent,
          balance: user.balance,
        }));

      return NextResponse.json({
        leaderboard: users,
        total: mockTokenBalances.size,
        limit,
        offset,
      });
    }

    // Database mode: query from Supabase
    try {
      // Use raw SQL for ordering and limiting (Supabase REST API doesn't support ORDER BY easily)
      // We'll use Supabase client directly for this query
      const { supabaseClient } = await import("@/lib/db-supabase");
      
      if (!supabaseClient) {
        return NextResponse.json(
          { error: "Database not available" },
          { status: 500 }
        );
      }

      // ✅ DEĞİŞİKLİK: Sadece mint edenleri göster
      // Önce mint eden wallet adreslerini tokens tablosundan al
      const { data: mintedTokens, error: tokensError } = await (supabaseClient as any)
        .from("tokens")
        .select("wallet_address")
        .or("status.eq.minted,token_id.gt.0");
      
      if (tokensError) {
        console.error("Error fetching minted tokens:", tokensError);
        return NextResponse.json(
          { error: "Failed to fetch minted tokens", details: tokensError.message },
          { status: 500 }
        );
      }
      
      // Mint eden wallet adreslerini Set'e çevir (normalize edilmiş)
      const mintedWallets = new Set(
        (mintedTokens || [])
          .map((t: any) => t.wallet_address?.toLowerCase())
          .filter(Boolean)
      );
      
      if (mintedWallets.size === 0) {
        // Hiç mint eden yok
        return NextResponse.json({
          leaderboard: [],
          total: 0,
          limit,
          offset,
        });
      }
      
      // Tüm chat_tokens kayıtlarını al ve sadece mint edenleri filtrele
      const { data: allChatTokens, error, count } = await (supabaseClient as any)
        .from("chat_tokens")
        .select("*", { count: "exact" })
        .order("points", { ascending: false })
        .order("total_tokens_spent", { ascending: false });
      
      if (error) {
        console.error("Supabase leaderboard query error:", error);
        return NextResponse.json(
          { error: "Failed to fetch leaderboard", details: error.message },
          { status: 500 }
        );
      }
      
      // Sadece mint edenleri filtrele ve pagination uygula
      const filteredData = (allChatTokens || [])
        .filter((ct: any) => mintedWallets.has(ct.wallet_address?.toLowerCase()))
        .slice(offset, offset + limit);
      
      const totalMinted = (allChatTokens || [])
        .filter((ct: any) => mintedWallets.has(ct.wallet_address?.toLowerCase()))
        .length;
      
      // Format response with ranks
      const leaderboard = filteredData.map((user: any, index: number) => ({
        rank: offset + index + 1,
        wallet_address: user.wallet_address,
        points: Number(user.points) || 0,
        total_tokens_spent: Number(user.total_tokens_spent) || 0,
        balance: Number(user.balance) || 0,
        updated_at: user.updated_at,
      }));

      return NextResponse.json({
        leaderboard,
        total: totalMinted,
        limit,
        offset,
      });

      if (error) {
        console.error("Supabase leaderboard query error:", error);
        return NextResponse.json(
          { error: "Failed to fetch leaderboard", details: error.message },
          { status: 500 }
        );
      }

    } catch (dbError: any) {
      console.error("Database error fetching leaderboard:", dbError);
      return NextResponse.json(
        { error: "Internal server error", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in leaderboard endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET user's rank by wallet address
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Missing walletAddress" },
        { status: 400 }
      );
    }

    const normalizedAddress = walletAddress.toLowerCase();

    if (isMockMode) {
      const { getMockTokenBalances } = await import("@/lib/chat-tokens-mock");
      const mockTokenBalances = getMockTokenBalances();
      const userData = mockTokenBalances.get(normalizedAddress);
      
      if (!userData) {
        return NextResponse.json({
          rank: null,
          points: 0,
          total_users: mockTokenBalances.size,
        });
      }

      // Calculate rank
      const users = Array.from(mockTokenBalances.entries())
        .map(([wallet, data]) => ({
          wallet,
          points: data.points || 0,
        }))
        .sort((a, b) => b.points - a.points);

      const rank = users.findIndex((u) => u.wallet === normalizedAddress) + 1;

      return NextResponse.json({
        rank: rank > 0 ? rank : null,
        points: userData.points || 0,
        total_users: mockTokenBalances.size,
      });
    }

    // Database mode
    try {
      const { supabaseClient } = await import("@/lib/db-supabase");
      
      if (!supabaseClient) {
        return NextResponse.json(
          { error: "Database not available" },
          { status: 500 }
        );
      }

      // ✅ DEĞİŞİKLİK: Sadece mint edenleri kontrol et
      // Önce bu wallet'ın mint edip etmediğini kontrol et
      const { data: mintedToken } = await (supabaseClient as any)
        .from("tokens")
        .select("wallet_address")
        .eq("wallet_address", normalizedAddress)
        .or("status.eq.minted,token_id.gt.0")
        .limit(1);
      
      if (!mintedToken || mintedToken.length === 0) {
        // Bu wallet mint etmemiş, leaderboard'da yok
        return NextResponse.json({
          rank: null,
          points: 0,
          total_users: 0,
        });
      }
      
      // Get user's points
      const { data: userData, error: userError } = await (supabaseClient as any)
        .from("chat_tokens")
        .select("points")
        .eq("wallet_address", normalizedAddress)
        .single();

      if (userError || !userData) {
        // User not found in chat_tokens (mint etmiş ama chat_tokens'da kayıt yok)
        return NextResponse.json({
          rank: null,
          points: 0,
          total_users: 0,
        });
      }

      const userPoints = Number(userData.points) || 0;

      // ✅ Sadece mint edenler arasında rank hesapla
      // Önce mint eden wallet adreslerini al
      const { data: mintedTokens } = await (supabaseClient as any)
        .from("tokens")
        .select("wallet_address")
        .or("status.eq.minted,token_id.gt.0");
      
      const mintedWallets = new Set(
        (mintedTokens || [])
          .map((t: any) => t.wallet_address?.toLowerCase())
          .filter(Boolean)
      );
      
      // Tüm chat_tokens kayıtlarını al ve sadece mint edenleri filtrele
      const { data: allChatTokens } = await (supabaseClient as any)
        .from("chat_tokens")
        .select("wallet_address, points");
      
      const mintedUsers = (allChatTokens || [])
        .filter((ct: any) => mintedWallets.has(ct.wallet_address?.toLowerCase()))
        .map((ct: any) => ({
          wallet: ct.wallet_address,
          points: Number(ct.points) || 0,
        }))
        .sort((a: any, b: any) => b.points - a.points);
      
      // Rank hesapla
      const rankIndex = mintedUsers.findIndex((u: any) => u.wallet?.toLowerCase() === normalizedAddress);
      const rank = rankIndex >= 0 ? rankIndex + 1 : null;
      
      const totalUsers = mintedUsers.length;

      return NextResponse.json({
        rank,
        points: userPoints,
        total_users: totalUsers || 0,
      });
    } catch (dbError: any) {
      console.error("Database error fetching user rank:", dbError);
      return NextResponse.json(
        { error: "Internal server error", message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in user rank endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

