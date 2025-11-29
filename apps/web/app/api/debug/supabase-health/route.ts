import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { env } from "@/env.mjs";

export const dynamic = 'force-dynamic';

export async function GET() {
  const stats = {
    timestamp: new Date().toISOString(),
    supabase: {
      configured: isSupabaseConfigured,
      url: env.NEXT_PUBLIC_SUPABASE_URL 
        ? `${env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 40)}...`
        : "❌ Missing",
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
        ? `${env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`
        : "❌ Missing",
    },
    mode: isSupabaseConfigured ? "🟢 REAL DATABASE" : "🔴 MOCK MODE",
    tips: [
      "✅ Use indexes on frequently queried columns",
      "✅ Enable connection pooling in Supabase",
      "✅ Use Vercel KV for rate limiting (faster than DB)",
      "✅ Add caching for frequently accessed data",
      "⚠️ Check Supabase Dashboard > Reports > Database for slow queries",
    ],
    healthCheck: {
      message: "If this endpoint loads slowly, Supabase might be overloaded",
      recommendation: "Run the optimize-indexes.sql script in Supabase SQL Editor",
    }
  };

  return NextResponse.json(stats, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    }
  });
}

