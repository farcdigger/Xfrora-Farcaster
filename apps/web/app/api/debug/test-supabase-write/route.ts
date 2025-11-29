import { NextResponse } from "next/server";
import { db, chat_tokens } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/db";
import { env } from "@/env.mjs";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

/**
 * Test endpoint to verify Supabase write operations
 * GET /api/debug/test-supabase-write
 */
export async function GET() {
  try {
    const testWallet = "0x" + "0".repeat(40); // Test wallet address
    
    const status = {
      timestamp: new Date().toISOString(),
      isSupabaseConfigured,
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL ? `${env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...` : "MISSING",
      hasServiceRoleKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
      testResults: {
        read: null as any,
        write: null as any,
        delete: null as any,
      },
      errors: [] as string[],
    };

    if (!isSupabaseConfigured) {
      return NextResponse.json({
        ...status,
        error: "Supabase not configured",
        message: "Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
      }, { status: 500 });
    }

    // Test 1: Read
    try {
      const readResult = await db
        .select()
        .from(chat_tokens)
        .limit(1);
      status.testResults.read = {
        success: true,
        recordCount: readResult?.length || 0,
      };
    } catch (readError: any) {
      status.testResults.read = {
        success: false,
        error: readError.message,
      };
      status.errors.push(`Read error: ${readError.message}`);
    }

    // Test 2: Write (INSERT)
    try {
      const testData = {
        wallet_address: testWallet,
        balance: 999999,
        points: 0,
        total_tokens_spent: 0,
      };
      
      await db.insert(chat_tokens).values(testData);
      
      // Verify write
      const verifyResult = await db
        .select()
        .from(chat_tokens)
        .where(eq(chat_tokens.wallet_address, testWallet))
        .limit(1);
      
      status.testResults.write = {
        success: verifyResult && verifyResult.length > 0,
        inserted: verifyResult?.length || 0,
      };

      // Test 3: Delete (cleanup)
      try {
        await db.delete(chat_tokens).where(eq(chat_tokens.wallet_address, testWallet));
        status.testResults.delete = {
          success: true,
          message: "Test record deleted",
        };
      } catch (deleteError: any) {
        status.testResults.delete = {
          success: false,
          error: deleteError.message,
          warning: "Test record may still exist in database",
        };
        status.errors.push(`Delete error: ${deleteError.message}`);
      }
    } catch (writeError: any) {
      status.testResults.write = {
        success: false,
        error: writeError.message,
      };
      status.errors.push(`Write error: ${writeError.message}`);
    }

    const allTestsPassed = 
      status.testResults.read?.success &&
      status.testResults.write?.success &&
      status.testResults.delete?.success;

    return NextResponse.json({
      ...status,
      summary: allTestsPassed ? "✅ All tests passed" : "❌ Some tests failed",
      recommendation: allTestsPassed
        ? "Supabase is working correctly!"
        : "Check Supabase configuration and database schema",
    }, {
      status: allTestsPassed ? 200 : 500,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: "Test failed",
      message: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

