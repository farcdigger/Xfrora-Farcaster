import { NextResponse } from "next/server";
import { env } from "@/env.mjs";
import { isSupabaseConfigured } from "@/lib/db";

export async function GET() {
  return NextResponse.json({
    isSupabaseConfigured,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL 
        ? `✅ Set (${env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...)`
        : "❌ Missing",
      SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY
        ? `✅ Set (${env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...)`
        : "❌ Missing",
    },
    mode: isSupabaseConfigured ? "🟢 REAL DATABASE (Supabase)" : "🔴 MOCK MODE (In-Memory)",
    warning: !isSupabaseConfigured 
      ? "⚠️ Database is in MOCK MODE! No data will be saved. Add Supabase credentials to Vercel environment variables."
      : null,
  });
}

