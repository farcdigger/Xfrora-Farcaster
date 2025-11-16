/**
 * Recent NFTs API
 * 
 * Supabase'den son mint edilmiş NFT'leri getirir
 */

import { NextResponse } from "next/server";
import { db, tokens } from "@/lib/db";
import { desc, eq } from "drizzle-orm";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    console.log("📊 Fetching recent minted NFTs...");
    
    // Get last 8 minted NFTs (token_id > 0, ordered by id descending)
    // Note: tokens table doesn't have status column, so we filter by token_id > 0
    const recentNFTs = await db
      .select({
        id: tokens.id,
        token_id: tokens.token_id,
        image_uri: tokens.image_uri,
        x_user_id: tokens.x_user_id,
      })
      .from(tokens)
      .limit(8);
    
    console.log(`✅ Found ${recentNFTs.length} recent NFTs`);
    
    // Format for frontend - filter by token_id > 0 and sort by id descending
    const formattedNFTs = recentNFTs
      .filter((nft: typeof recentNFTs[0]) => nft.token_id && nft.token_id > 0) // Only minted ones
      .sort((a: typeof recentNFTs[0], b: typeof recentNFTs[0]) => (b.id || 0) - (a.id || 0)) // Sort by id descending
      .slice(0, 8) // Limit to 8
      .map((nft: typeof recentNFTs[0]) => ({
        id: nft.id,
        tokenId: nft.token_id,
        image: nft.image_uri?.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/") || "",
      }));
    
    return NextResponse.json({
      success: true,
      count: formattedNFTs.length,
      nfts: formattedNFTs,
    });
  } catch (error) {
    console.error("❌ Error fetching recent NFTs:", error);
    return NextResponse.json(
      {
        success: false,
        error: String(error),
        nfts: [], // Empty array on error
      },
      { status: 500 }
    );
  }
}

