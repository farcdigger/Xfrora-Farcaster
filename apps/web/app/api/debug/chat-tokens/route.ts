import { NextRequest, NextResponse } from "next/server";
import { db, chat_tokens } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isSupabaseConfigured } from "@/lib/db";

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/chat-tokens?wallet=0x...
 * Debug endpoint to check chat tokens data in Supabase
 */
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

    if (!isSupabaseConfigured) {
      return NextResponse.json({
        error: "Supabase not configured",
        mode: "MOCK",
        message: "Chat tokens are stored in memory only (not persisted)",
      }, { status: 500 });
    }

    // Query chat_tokens table
    const result = await db
      .select()
      .from(chat_tokens)
      .where(eq(chat_tokens.wallet_address, normalizedAddress))
      .limit(1);

    if (result && result.length > 0) {
      const record = result[0];
      return NextResponse.json({
        found: true,
        wallet: normalizedAddress,
        data: {
          balance: Number(record.balance) || 0,
          points: Number(record.points) || 0,
          total_tokens_spent: Number(record.total_tokens_spent) || 0,
          created_at: record.created_at,
          updated_at: record.updated_at,
        },
        message: "✅ Chat tokens record found in Supabase",
      });
    } else {
      return NextResponse.json({
        found: false,
        wallet: normalizedAddress,
        message: "⚠️ No chat_tokens record found for this wallet",
        tip: "Record will be created when you purchase credits or send a chat message",
      });
    }
  } catch (error: any) {
    console.error("Error checking chat tokens:", error);
    return NextResponse.json(
      {
        error: "Database error",
        message: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

