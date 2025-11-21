/**
 * Get token balance for a wallet
 */

import { NextRequest, NextResponse } from "next/server";
import { db, chat_tokens } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isMockMode } from "@/env.mjs";
import { getMockTokenBalances } from "@/lib/chat-tokens-mock";

// Force dynamic rendering to avoid static generation errors
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0; // Never cache, always fetch fresh

const mockTokenBalances = getMockTokenBalances();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get("wallet");

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Missing wallet parameter" },
        { status: 400 }
      );
    }

    const normalizedAddress = walletAddress.toLowerCase();

    if (isMockMode) {
      // Mock mode: return in-memory balance and points
      const userData = mockTokenBalances.get(normalizedAddress) || { balance: 0, points: 0 };
      return NextResponse.json({ balance: userData.balance, points: userData.points }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Database mode: query from chat_tokens table
    try {
      const result = await db
        .select()
        .from(chat_tokens)
        .where(eq(chat_tokens.wallet_address, normalizedAddress))
        .limit(1);

      if (result && result.length > 0) {
        return NextResponse.json({ 
          balance: Number(result[0].balance) || 0,
          points: Number(result[0].points) || 0,
        }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
      }

      // ✅ DEĞİŞİKLİK: No record found - ÖNCE MINT KONTROLÜ YAP
      // Sadece mint edenler için chat_tokens kaydı oluştur
      const { supabaseClient } = await import("@/lib/db-supabase");
      if (supabaseClient) {
        const { data: tokenData } = await (supabaseClient as any)
          .from("tokens")
          .select("status, token_id, wallet_address")
          .eq("wallet_address", normalizedAddress)
          .or("status.eq.minted,token_id.gt.0")
          .limit(1);
        
        // ✅ Sadece mint edenler için kayıt oluştur
        if (tokenData && tokenData.length > 0) {
          await db.insert(chat_tokens).values({
            wallet_address: normalizedAddress,
            balance: 0,
            points: 0,
            total_tokens_spent: 0,
          });
        }
      }

      return NextResponse.json({ balance: 0, points: 0 }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    } catch (dbError: any) {
      console.error("Database error fetching token balance:", dbError);
      // Fallback to mock storage if database fails
      const userData = mockTokenBalances.get(normalizedAddress) || { balance: 0, points: 0 };
      return NextResponse.json({ balance: userData.balance, points: userData.points }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }
  } catch (error: any) {
    console.error("Error fetching token balance:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

// Note: Helper functions (updateTokenBalance, addTokens) are exported from @/lib/chat-tokens-mock
// Next.js routes can only export HTTP methods (GET, POST, etc.)

