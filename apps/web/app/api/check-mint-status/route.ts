/**
 * Check Mint Status API
 * 
 * Kullanıcının daha önce mint edip etmediğini kontrol eder
 */

import { NextRequest, NextResponse } from "next/server";
import { db, tokens, payments } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isMockMode } from "@/env.mjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { farcaster_user_id } = body;

    if (!farcaster_user_id) {
      return NextResponse.json(
        { error: "Missing farcaster_user_id" },
        { status: 400 }
      );
    }

    const userId = farcaster_user_id;

    console.log(`🔍 Checking mint status for farcaster_user_id: ${userId}`);

    // Check in database
    if (!isMockMode && db) {
      try {
        const existingToken = await db
          .select()
          .from(tokens)
          .where(eq(tokens.farcaster_user_id, userId))
          .limit(1);

        const tokenData = existingToken?.[0];
        const tokenId = tokenData?.token_id;
        let status = tokenData?.status || "unknown";

        let paymentRecord: any = null;
        try {
          const paymentRows = await db
            .select()
            .from(payments)
            .where(eq(payments.farcaster_user_id, userId))
            .limit(1);
          paymentRecord = paymentRows?.[0] || null;
        } catch (paymentError) {
          console.warn("⚠️ Payment lookup failed (non-critical):", paymentError);
        }
        const hasCompletedPayment = paymentRecord?.status === "completed";
        if (status === "unknown" && hasCompletedPayment) {
          status = "paid";
        }
        const recordedWallet = tokenData?.wallet_address || paymentRecord?.wallet_address || null;
        
        // hasMinted = true if status='minted' OR token_id > 0
        const hasMinted = (status === "minted") || (tokenId != null && tokenId > 0);
        
        // hasPaid = true if status='paid' (payment done, waiting for mint)
        const hasPaid = status === "paid" || hasCompletedPayment;

        console.log("✅ Mint status checked for Farcaster user:", {
          farcaster_user_id: userId,
          status,
          hasMinted,
          hasPaid,
          token_id: tokenId,
          has_metadata: !!tokenData?.metadata_uri,
          recordedWallet,
          logic: `status=${status}, hasMinted=${hasMinted}, hasPaid=${hasPaid}`
        });

        return NextResponse.json({
          hasMinted,
          hasPaid,
          hasMetadata: !!tokenData?.metadata_uri,
          tokenId: tokenId || 0,  // Return 0 if NULL for backward compatibility
          status,
          imageUri: tokenData?.image_uri || null,
          metadataUri: tokenData?.metadata_uri || null,
          walletAddress: recordedWallet,
        });
      } catch (dbError) {
        console.error("❌ Database check error:", dbError);
        return NextResponse.json(
          {
            error: "Database check failed",
            message: String(dbError),
          },
          { status: 500 }
        );
      }
    }

    // Mock mode - assume not minted
    return NextResponse.json({
      hasMinted: false,
      hasMetadata: false,
      tokenId: 0,
      imageUri: null,
      metadataUri: null,
      mock: true,
    });
  } catch (error) {
    console.error("❌ Check mint status error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: String(error),
      },
      { status: 500 }
    );
  }
}

