/**
 * Check Mint Status API
 * 
 * Kullanıcının daha önce mint edip etmediğini kontrol eder
 */

import { NextRequest, NextResponse } from "next/server";
import { db, tokens, payments, users } from "@/lib/db";
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
        // First check users table to see if user exists (mint edildiyse user tablosunda olmalı)
        let userData: any = null;
        try {
          const userRows = await db
            .select()
            .from(users)
            .where(eq(users.x_user_id, userId)) // Farcaster FID stored in x_user_id column
            .limit(1);
          userData = userRows?.[0] || null;
          console.log("👤 User data from users table:", {
            exists: !!userData,
            hasWallet: !!userData?.wallet_address,
          });
        } catch (userError) {
          console.warn("⚠️ Users table lookup failed (non-critical):", userError);
        }
        
        const existingToken = await db
          .select()
          .from(tokens)
          .where(eq(tokens.x_user_id, userId)) // Farcaster FID stored in x_user_id column
          .limit(1);

        const tokenData = existingToken?.[0];
        const tokenId = tokenData?.token_id;
        let status = tokenData?.status || "unknown";

        let paymentRecord: any = null;
        try {
          const paymentRows = await db
            .select()
            .from(payments)
            .where(eq(payments.x_user_id, userId)) // Farcaster FID stored in x_user_id column
            .limit(1);
          paymentRecord = paymentRows?.[0] || null;
        } catch (paymentError) {
          console.warn("⚠️ Payment lookup failed (non-critical):", paymentError);
        }
        const hasCompletedPayment = paymentRecord?.status === "completed";
        if (status === "unknown" && hasCompletedPayment) {
          status = "paid";
        }
        
        // Get wallet address from userData (users table) first, then token, then payment
        const recordedWallet = userData?.wallet_address || tokenData?.wallet_address || paymentRecord?.wallet_address || null;
        
        // ✅ IMPORTANT: If user exists in users table with wallet_address, consider it minted
        // (Mint process creates user record in users table after payment)
        const hasUserWithWallet = !!(userData?.wallet_address);
        
        // hasMinted = true if:
        // 1. status='minted' OR token_id > 0 (from tokens table)
        // 2. OR user exists in users table with wallet_address (mint completed but token_id not updated)
        const hasMinted = (status === "minted") || (tokenId != null && tokenId > 0) || hasUserWithWallet;
        
        // hasPaid = true if status='paid' (payment done, waiting for mint)
        const hasPaid = status === "paid" || hasCompletedPayment;
        
        // If user exists but token_id is missing, try to get token info from users table
        let finalTokenId = tokenId;
        let finalImageUri = tokenData?.image_uri || null;
        let finalMetadataUri = tokenData?.metadata_uri || null;
        
        // If hasUserWithWallet but no token_id in tokens table, try to find token via user's wallet
        if (hasUserWithWallet && (!tokenId || tokenId === 0 || tokenId === null) && userData?.wallet_address) {
          console.log("⚠️ User exists with wallet but no token_id found, attempting to find token...");
          try {
            // Try to find token by wallet_address in tokens table
            const tokenByWallet = await db
              .select()
              .from(tokens)
              .where(eq(tokens.wallet_address, userData.wallet_address.toLowerCase()))
              .limit(1);
            
            if (tokenByWallet && tokenByWallet.length > 0) {
              const foundToken = tokenByWallet[0];
              finalTokenId = foundToken.token_id;
              finalImageUri = foundToken.image_uri || finalImageUri;
              finalMetadataUri = foundToken.metadata_uri || finalMetadataUri;
              console.log("✅ Found token via wallet_address:", {
                token_id: finalTokenId,
                hasImage: !!finalImageUri,
              });
            }
          } catch (walletLookupError) {
            console.warn("⚠️ Token lookup by wallet_address failed:", walletLookupError);
          }
        }

        console.log("✅ Mint status checked for Farcaster user:", {
          farcaster_user_id: userId,
          status,
          hasMinted,
          hasPaid,
          token_id: finalTokenId || tokenId,
          has_user_with_wallet: hasUserWithWallet,
          has_metadata: !!(finalMetadataUri || tokenData?.metadata_uri),
          recordedWallet,
          logic: `status=${status}, hasMinted=${hasMinted}, hasPaid=${hasPaid}, hasUserWithWallet=${hasUserWithWallet}`
        });

        return NextResponse.json({
          hasMinted,
          hasPaid,
          hasMetadata: !!(finalMetadataUri || tokenData?.metadata_uri),
          tokenId: finalTokenId || tokenId || 0,  // Return 0 if NULL for backward compatibility
          status: hasMinted ? "minted" : status, // Update status if user has wallet
          imageUri: finalImageUri || tokenData?.image_uri || null,
          metadataUri: finalMetadataUri || tokenData?.metadata_uri || null,
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

