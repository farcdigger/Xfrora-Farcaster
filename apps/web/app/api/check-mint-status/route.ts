/**
 * Check Mint Status API
 * 
 * Kullanıcının daha önce mint edip etmediğini kontrol eder
 */

import { NextRequest, NextResponse } from "next/server";
import { db, tokens } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isMockMode } from "@/env.mjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { x_user_id } = body;

    if (!x_user_id) {
      return NextResponse.json(
        { error: "Missing x_user_id" },
        { status: 400 }
      );
    }

    console.log("🔍 Checking mint status for x_user_id:", x_user_id);

    // Check in database
    if (!isMockMode && db) {
      try {
        const existingToken = await db
          .select()
          .from(tokens)
          .where(eq(tokens.x_user_id, x_user_id))
          .limit(1);

        const tokenData = existingToken?.[0];
        const tokenId = tokenData?.token_id;
        
        // hasMinted = true ONLY if token_id is set (not NULL and > 0)
        const hasMinted = existingToken && existingToken.length > 0 && tokenId != null && tokenId > 0;

        console.log("✅ Mint status checked:", {
          x_user_id,
          hasMinted,
          token_id: tokenId,
          has_metadata: !!tokenData?.metadata_uri,
          logic: `hasMinted = ${!!existingToken?.length} && tokenId(${tokenId}) > 0 = ${hasMinted}`
        });

        return NextResponse.json({
          hasMinted,
          hasMetadata: !!tokenData?.metadata_uri,
          tokenId: tokenId || 0,  // Return 0 if NULL for backward compatibility
          imageUri: tokenData?.image_uri || null,
          metadataUri: tokenData?.metadata_uri || null,
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

