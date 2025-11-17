/**
 * GET /api/nft-image
 * Get NFT image URL for a wallet address
 * Returns the NFT image from database or fetches from contract
 */

import { NextRequest, NextResponse } from "next/server";
import { db, tokens, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { ethers } from "ethers";
import { env } from "@/env.mjs";

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

// Fetch NFT image from blockchain (fallback)
async function fetchNFTImageFromBlockchain(walletAddress: string): Promise<{ imageUrl: string | null; tokenId: number | null }> {
  try {
    const CONTRACT_ADDRESS = env.CONTRACT_ADDRESS || "0x7De68EB999A314A0f986D417adcbcE515E476396";
    const RPC_URL = env.RPC_URL || "https://mainnet.base.org";

    const ERC721_ABI = [
      "function balanceOf(address owner) external view returns (uint256)",
      "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
      "function tokenURI(uint256 tokenId) external view returns (string)",
    ];

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ERC721_ABI, provider);

    console.log("🔗 Fetching NFT from blockchain:", { walletAddress: walletAddress.substring(0, 10) });

    // Check balance with timeout to prevent hanging
    const balance = await Promise.race([
      contract.balanceOf(walletAddress),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Balance check timeout")), 5000)
      ),
    ]) as bigint;

    if (balance === 0n) {
      console.log("❌ No NFT found on blockchain for wallet");
      return { imageUrl: null, tokenId: null };
    }

    // Get first token ID
    const tokenId = await Promise.race([
      contract.tokenOfOwnerByIndex(walletAddress, 0),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Token ID fetch timeout")), 5000)
      ),
    ]) as bigint;

    console.log("✅ Found NFT token ID:", Number(tokenId));

    // Get tokenURI (metadata URL)
    const tokenURI = await Promise.race([
      contract.tokenURI(tokenId),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("TokenURI fetch timeout")), 5000)
      ),
    ]) as string;

    console.log("✅ Got tokenURI:", tokenURI.substring(0, 50));

    // Fetch metadata from tokenURI
    const metadataUrl = ipfsToHttp(tokenURI);
    const metadataResponse = await fetch(metadataUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (!metadataResponse.ok) {
      throw new Error(`Failed to fetch metadata: ${metadataResponse.status}`);
    }

    const metadata = await metadataResponse.json();
    const imageUrl = ipfsToHttp(metadata.image || "");

    console.log("✅ Got NFT image from blockchain:", {
      tokenId: Number(tokenId),
      hasImage: !!imageUrl,
    });

    return { imageUrl, tokenId: Number(tokenId) };
  } catch (error: any) {
    // Gracefully handle rate limit errors
    if (error?.info?.error?.code === -32016) {
      console.warn("⚠️ RPC rate limit hit, cannot fetch from blockchain");
    } else {
      console.error("❌ Error fetching NFT from blockchain:", error.message);
    }
    return { imageUrl: null, tokenId: null };
  }
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

    // Method 4: Blockchain fallback (if database doesn't have image)
    // Only use this as last resort to avoid rate limits
    if (!nftImage && normalizedAddress) {
      console.log("⚠️ Database has no image, trying blockchain fallback...");
      const blockchainResult = await fetchNFTImageFromBlockchain(normalizedAddress);
      
      if (blockchainResult.imageUrl) {
        nftImage = blockchainResult.imageUrl;
        tokenId = blockchainResult.tokenId;
        
        console.log("✅ Got image from blockchain, updating database...");
        
        // Update database with the fetched image for future requests
        try {
          if (tokenId && tokenId > 0) {
            await db
              .update(tokens)
              .set({ image_uri: nftImage })
              .where(eq(tokens.token_id, tokenId));
            console.log("✅ Database updated with blockchain image");
          }
        } catch (updateError) {
          console.warn("⚠️ Could not update database with image:", updateError);
        }
      }
    }

    // If STILL no NFT found after all methods
    if (!nftImage) {
      console.log("❌ No NFT image found after all lookup methods:", { walletAddress, nftTokenId });
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

