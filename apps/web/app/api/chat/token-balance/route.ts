/**
 * Get token balance for a wallet
 */

import { NextRequest, NextResponse } from "next/server";
import { db, chat_tokens } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isMockMode } from "@/env.mjs";
import { getMockTokenBalances } from "@/lib/chat-tokens-mock";

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
      return NextResponse.json({ balance: userData.balance, points: userData.points });
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
        });
      }

      // No record found - create one with 0 balance, 0 points, and 0 total_tokens_spent
      await db.insert(chat_tokens).values({
        wallet_address: normalizedAddress,
        balance: 0,
        points: 0,
        total_tokens_spent: 0,
      });

      return NextResponse.json({ balance: 0, points: 0 });
    } catch (dbError: any) {
      console.error("Database error fetching token balance:", dbError);
      // Fallback to mock storage if database fails
      const userData = mockTokenBalances.get(normalizedAddress) || { balance: 0, points: 0 };
      return NextResponse.json({ balance: userData.balance, points: userData.points });
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

