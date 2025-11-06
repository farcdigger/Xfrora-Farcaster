/**
 * Debug endpoint to check X OAuth configuration
 * Access: /api/debug/x-config
 */

import { NextResponse } from "next/server";
import { env } from "@/env.mjs";

export async function GET() {
  const config = {
    hasClientId: !!env.X_CLIENT_ID,
    hasClientSecret: !!env.X_CLIENT_SECRET,
    hasCallbackUrl: !!env.X_CALLBACK_URL,
    callbackUrl: env.X_CALLBACK_URL || "NOT SET",
    clientIdLength: env.X_CLIENT_ID?.length || 0,
    clientSecretLength: env.X_CLIENT_SECRET?.length || 0,
    clientIdPreview: env.X_CLIENT_ID ? `${env.X_CLIENT_ID.substring(0, 10)}...` : "NOT SET",
    environment: process.env.NODE_ENV || "unknown",
    vercelEnv: process.env.VERCEL_ENV || "unknown",
    deploymentUrl: process.env.VERCEL_URL || "unknown",
  };

  // Check if all required fields are present
  const isConfigured =
    config.hasClientId && config.hasClientSecret && config.hasCallbackUrl;

  return NextResponse.json({
    configured: isConfigured,
    config,
    status: isConfigured
      ? "✅ X OAuth is configured"
      : "❌ X OAuth is NOT configured",
    missingFields: [
      !config.hasClientId && "X_CLIENT_ID",
      !config.hasClientSecret && "X_CLIENT_SECRET",
      !config.hasCallbackUrl && "X_CALLBACK_URL",
    ].filter(Boolean),
    note: "Check Vercel environment variables if not configured",
  });
}

