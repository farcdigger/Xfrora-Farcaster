import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env.mjs";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  let status = "UNKNOWN";
  let error: any = null;
  let testResult: any = null;

  try {
    // Check if credentials are configured
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      status = "NOT_CONFIGURED";
      return NextResponse.json({
        status: "NOT_CONFIGURED",
        message: "Supabase credentials not configured",
        details: {
          NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing",
          SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Set" : "❌ Missing",
        },
        instructions: [
          "1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables",
          "2. Add NEXT_PUBLIC_SUPABASE_URL: https://vzhclqjrqhhpyicaktpv.supabase.co",
          "3. Add SUPABASE_SERVICE_ROLE_KEY: Get from Supabase Dashboard → Settings → API → service_role key",
          "4. Redeploy your application",
        ],
        timestamp: new Date().toISOString(),
      });
    }

    // Try to create Supabase client
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Test connection by querying tokens table
    const { data, error: queryError } = await supabase
      .from("tokens")
      .select("id")
      .limit(1);

    if (queryError) {
      status = "ERROR";
      error = {
        message: queryError.message,
        code: queryError.code,
        details: queryError.details,
        hint: queryError.hint,
      };
    } else {
      status = "CONNECTED";
      testResult = {
        table: "tokens",
        rows: data?.length || 0,
        message: "Successfully connected to Supabase",
      };
    }
  } catch (err: any) {
    status = "FAILED";
    error = {
      message: err.message,
      stack: err.stack,
    };
  }

  return NextResponse.json({
    status,
    error,
    testResult,
    configuration: {
      NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL
        ? `${env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...`
        : "Not set",
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY
        ? "✅ Set (hidden)"
        : "❌ Not set",
    },
    timestamp: new Date().toISOString(),
  });
}

