/**
 * Debug endpoint to test Supabase write operations
 * Tests if chat_tokens can be inserted/updated
 */

import { NextRequest, NextResponse } from "next/server";
import { db, chat_tokens } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isSupabaseConfigured } from "@/lib/db";
import { env } from "@/env.mjs";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, action = "test" } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Missing walletAddress" },
        { status: 400 }
      );
    }

    const normalizedAddress = walletAddress.toLowerCase();

    const result: any = {
      timestamp: new Date().toISOString(),
      isSupabaseConfigured,
      NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "NOT SET",
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY ? "SET" : "NOT SET",
      walletAddress: normalizedAddress,
      action,
      steps: [],
    };

    if (!isSupabaseConfigured) {
      return NextResponse.json({
        ...result,
        error: "Supabase not configured",
        steps: [
          { step: "config_check", status: "failed", message: "Supabase credentials missing" },
        ],
      }, { status: 500 });
    }

    // Step 1: Check existing record
    try {
      result.steps.push({ step: "check_existing", status: "in_progress" });
      const existing = await db
        .select()
        .from(chat_tokens)
        .where(eq(chat_tokens.wallet_address, normalizedAddress))
        .limit(1);
      
      result.steps.push({
        step: "check_existing",
        status: "success",
        found: existing && existing.length > 0,
        record: existing && existing.length > 0 ? {
          balance: existing[0].balance,
          points: existing[0].points,
        } : null,
      });
    } catch (error: any) {
      result.steps.push({
        step: "check_existing",
        status: "error",
        error: error.message,
      });
      return NextResponse.json(result, { status: 500 });
    }

    // Step 2: Insert or Update
    try {
      result.steps.push({ step: "write_operation", status: "in_progress" });
      
      const existing = await db
        .select()
        .from(chat_tokens)
        .where(eq(chat_tokens.wallet_address, normalizedAddress))
        .limit(1);

      if (existing && existing.length > 0) {
        // Update existing
        const updateResult = await db
          .update(chat_tokens)
          .set({
            balance: (Number(existing[0].balance) || 0) + 100,
            updated_at: new Date().toISOString(),
          })
          .where(eq(chat_tokens.wallet_address, normalizedAddress))
          .execute();
        
        result.steps.push({
          step: "write_operation",
          status: "success",
          operation: "update",
          updateResult,
        });
      } else {
        // Insert new
        const insertResult = await db.insert(chat_tokens).values({
          wallet_address: normalizedAddress,
          balance: 100,
          points: 0,
          total_tokens_spent: 0,
        }).execute();
        
        result.steps.push({
          step: "write_operation",
          status: "success",
          operation: "insert",
          insertResult,
        });
      }
    } catch (error: any) {
      result.steps.push({
        step: "write_operation",
        status: "error",
        error: error.message,
        stack: error.stack,
        code: error.code,
      });
      return NextResponse.json(result, { status: 500 });
    }

    // Step 3: Verify write
    try {
      result.steps.push({ step: "verify_write", status: "in_progress" });
      const verify = await db
        .select()
        .from(chat_tokens)
        .where(eq(chat_tokens.wallet_address, normalizedAddress))
        .limit(1);
      
      result.steps.push({
        step: "verify_write",
        status: verify && verify.length > 0 ? "success" : "failed",
        verified: verify && verify.length > 0,
        record: verify && verify.length > 0 ? {
          balance: verify[0].balance,
          points: verify[0].points,
        } : null,
      });
    } catch (error: any) {
      result.steps.push({
        step: "verify_write",
        status: "error",
        error: error.message,
      });
      return NextResponse.json(result, { status: 500 });
    }

    result.success = true;
    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json({
      error: "Internal server error",
      message: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
