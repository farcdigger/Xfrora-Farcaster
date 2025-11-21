import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/lib/kv";
import { env } from "@/env.mjs";

// ✅ Güvenlik: Admin API key kontrolü
function requireAdminAuth(request: NextRequest): NextResponse | null {
  const apiKey = request.headers.get("x-admin-api-key");
  
  if (!env.ADMIN_API_KEY) {
    return NextResponse.json(
      { error: "Admin API key not configured" },
      { status: 500 }
    );
  }
  
  if (!apiKey || apiKey !== env.ADMIN_API_KEY) {
    return NextResponse.json(
      { error: "Unauthorized. Admin API key required in header: x-admin-api-key" },
      { status: 401 }
    );
  }
  
  return null; // Authorized
}

// Admin endpoint to clear mint rate limits (for testing/debugging)
export async function POST(request: NextRequest) {
  // ✅ Güvenlik: Admin API key kontrolü
  const authError = requireAdminAuth(request);
  if (authError) return authError;
  
  try {
    const body = await request.json();
    const { wallet, action } = body;

    if (!wallet) {
      return NextResponse.json({ error: "Missing wallet address parameter" }, { status: 400 });
    }

    const mintRateLimitKey = `rate_limit:mint:${wallet}`;

    if (action === "clear") {
      // Clear mint rate limit
      await kv.del(mintRateLimitKey);

      return NextResponse.json({
        success: true,
        message: "Mint rate limit cleared for wallet",
        wallet,
        clearedKeys: [mintRateLimitKey],
      });
    } else if (action === "check") {
      // Check current mint rate limit status
      const currentCount = await kv.get(mintRateLimitKey);
      
      return NextResponse.json({
        wallet,
        mintRateLimitKey,
        currentCount: currentCount ? parseInt(currentCount) : 0,
        limit: 30,
        window: "1 hour",
      });
    } else {
      return NextResponse.json({ error: "Invalid action. Use 'clear' or 'check'" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Clear mint rate limit error:", error);
    return NextResponse.json({ error: error.message || "Failed to clear mint rate limit" }, { status: 500 });
  }
}

