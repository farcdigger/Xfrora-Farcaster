/**
 * GET /api/nft-image
 * Get NFT image URL for a wallet address
 * Returns the NFT image from database or fetches from contract
 */

import { NextRequest, NextResponse } from "next/server";
import { db, tokens, users } from "@/lib/db";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0; // Never cache, always fetch fresh

// Convert IPFS URL to HTTP gateway URL
function ipfsToHttp(url: string): string {
  if (!url) return "";
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
  }
  return url;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get("wallet");
    const nftTokenId = searchParams.get("nft_token_id");

    if (!walletAddress && !nftTokenId) {
      return NextResponse.json(
        { error: "Missing wallet or nft_token_id parameter" },
        { status: 400 }
      );
    }

    const normalizedAddress = walletAddress?.toLowerCase();

    let nftImage: string | null = null;
    let tokenId: number | null = null;

    // Method 1: Get by NFT token ID (fastest, direct lookup)
    if (nftTokenId) {
      try {
        const tokenResult = await db
          .select()
          .from(tokens)
          .where(eq(tokens.token_id, Number(nftTokenId)))
          .limit(1);

        if (tokenResult && tokenResult.length > 0) {
          const token = tokenResult[0];
          nftImage = token.image_uri || "";
          tokenId = token.token_id || null;
          
          console.log("✅ Found NFT image by token_id:", {
            nft_token_id: nftTokenId,
            hasImage: !!nftImage,
          });
        }
      } catch (error) {
        console.warn("⚠️ Error fetching NFT by token_id:", error);
      }
    }

    // Method 2: Get by wallet address (lookup user, then token)
    if (!nftImage && normalizedAddress) {
      try {
        // Get user's x_user_id from wallet address
        const userResult = await db
          .select()
          .from(users)
          .where(eq(users.wallet_address, normalizedAddress))
          .limit(1);

        if (userResult && userResult.length > 0) {
          const user = userResult[0];
          
          // Get token by x_user_id
          const tokenResult = await db
            .select()
            .from(tokens)
            .where(eq(tokens.x_user_id, user.x_user_id))
            .limit(1);

          if (tokenResult && tokenResult.length > 0) {
            const token = tokenResult[0];
            nftImage = token.image_uri || "";
            tokenId = token.token_id || null;
            
            console.log("✅ Found NFT image by wallet address (via users table):", {
              wallet: normalizedAddress,
              x_user_id: user.x_user_id,
              hasImage: !!nftImage,
            });
          }
        }
      } catch (error) {
        console.warn("⚠️ Error fetching NFT by wallet address (users table):", error);
      }
    }

    // Method 3: Direct lookup in tokens table by wallet_address (fallback)
    // This handles cases where user posted but isn't in users table yet
    if (!nftImage && normalizedAddress) {
      try {
        const tokenResult = await db
          .select()
          .from(tokens)
          .where(eq(tokens.wallet_address, normalizedAddress))
          .limit(1);

        if (tokenResult && tokenResult.length > 0) {
          const token = tokenResult[0];
          nftImage = token.image_uri || "";
          tokenId = token.token_id || null;
          
          console.log("✅ Found NFT image by wallet address (direct tokens lookup):", {
            wallet: normalizedAddress,
            hasImage: !!nftImage,
          });
        }
      } catch (error) {
        console.warn("⚠️ Error fetching NFT by wallet address (direct tokens lookup):", error);
      }
    }

    // If no NFT found
    if (!nftImage) {
      console.log("❌ No NFT image found for:", { walletAddress, nftTokenId });
      return NextResponse.json(
        { 
          hasNFT: false,
          imageUrl: null,
          tokenId: null,
        },
        { 
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    // Convert IPFS to HTTP if needed
    const httpImageUrl = ipfsToHttp(nftImage);
    
    console.log("✅ NFT image found:", {
      wallet: walletAddress?.substring(0, 10),
      hasImage: !!httpImageUrl,
    });

    return NextResponse.json(
      { 
        hasNFT: true,
        imageUrl: httpImageUrl,
        tokenId: tokenId,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error("Error fetching NFT image:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

