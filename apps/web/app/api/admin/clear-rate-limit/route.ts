import { NextRequest, NextResponse } from "next/server";
import { kv } from "@/lib/kv";

// Admin endpoint to clear rate limits (for testing/debugging)
// In production, add authentication/authorization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { x_user_id, action } = body;

    if (!x_user_id) {
      return NextResponse.json({ error: "Missing x_user_id parameter" }, { status: 400 });
    }

    const rateLimitKey = `rate_limit:generate:${x_user_id}`;
    const lockKey = `lock:generate:${x_user_id}`;

    if (action === "clear") {
      // Clear rate limit
      await kv.del(rateLimitKey);
      await kv.del(lockKey);

      return NextResponse.json({
        success: true,
        message: "Rate limit cleared for user",
        x_user_id,
        clearedKeys: [rateLimitKey, lockKey],
      });
    } else if (action === "check") {
      // Check current rate limit status
      const currentCount = await kv.get(rateLimitKey);
      
      return NextResponse.json({
        x_user_id,
        rateLimitKey,
        currentCount: currentCount ? parseInt(currentCount) : 0,
        limit: 10,
        window: "1 hour",
      });
    } else {
      return NextResponse.json({ error: "Invalid action. Use 'clear' or 'check'" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Clear rate limit error:", error);
    return NextResponse.json({ error: error.message || "Failed to clear rate limit" }, { status: 500 });
  }
}

