/**
 * Debug endpoint to check referral_codes table access
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/db-supabase";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const client = supabaseClient;
    if (!client) {
      return NextResponse.json({
        error: "Supabase client not initialized",
        hasClient: false,
      }, { status: 500 });
    }

    const result: any = {
      timestamp: new Date().toISOString(),
      hasClient: true,
      checks: [],
    };

    // Check 1: Try to read from referral_codes table
    try {
      result.checks.push({ step: "read_table", status: "in_progress" });
      const { data, error } = await (client as any)
        .from("referral_codes")
        .select("code, wallet_address")
        .limit(5);
      
      if (error) {
        result.checks.push({
          step: "read_table",
          status: "error",
          error: error.message,
          code: error.code,
          details: error,
        });
      } else {
        result.checks.push({
          step: "read_table",
          status: "success",
          recordCount: data?.length || 0,
          sample: data?.slice(0, 2) || [],
        });
      }
    } catch (readError: any) {
      result.checks.push({
        step: "read_table",
        status: "error",
        error: readError.message,
        stack: readError.stack,
      });
    }

    // Check 2: Try to insert a test record (then delete it)
    try {
      result.checks.push({ step: "write_table", status: "in_progress" });
      const testWallet = `0x${Math.random().toString(16).substring(2, 42)}`;
      const testCode = `test_${Date.now()}`;
      
      const { data: insertData, error: insertError } = await (client as any)
        .from("referral_codes")
        .insert({
          wallet_address: testWallet,
          code: testCode,
        })
        .select("code")
        .single();
      
      if (insertError) {
        result.checks.push({
          step: "write_table",
          status: "error",
          error: insertError.message,
          code: insertError.code,
          details: insertError,
        });
      } else {
        result.checks.push({
          step: "write_table",
          status: "success",
          insertedCode: insertData?.code,
        });
        
        // Try to delete test record
        try {
          await (client as any)
            .from("referral_codes")
            .delete()
            .eq("code", testCode);
          result.checks.push({
            step: "delete_test_record",
            status: "success",
          });
        } catch (deleteError: any) {
          result.checks.push({
            step: "delete_test_record",
            status: "error",
            error: deleteError.message,
            note: "Test record may remain in database",
          });
        }
      }
    } catch (writeError: any) {
      result.checks.push({
        step: "write_table",
        status: "error",
        error: writeError.message,
        stack: writeError.stack,
      });
    }

    result.success = result.checks.every((c: any) => c.status === "success" || c.status === "error" && c.step === "delete_test_record");
    
    return NextResponse.json(result, { status: result.success ? 200 : 500 });

  } catch (error: any) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json({
      error: "Internal server error",
      message: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

