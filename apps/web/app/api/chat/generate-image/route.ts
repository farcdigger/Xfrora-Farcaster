/**
 * Chatbot Image Generation Endpoint
 * Generates images based on user prompts from chatbot
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env.mjs";
import { ethers } from "ethers";
import { generateImageViaDaydreamsAPI } from "@/lib/daydreams-api";
import { pinToIPFS } from "@/lib/ipfs";
import { ensureChatTokensRecordForNFTOwner } from "@/lib/nft-ownership-helpers";
import { db, chat_tokens } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isMockMode } from "@/env.mjs";

const CONTRACT_ADDRESS = env.CONTRACT_ADDRESS || "0x7De68EB999A314A0f986D417adcbcE515E476396";
const RPC_URL = env.RPC_URL || "https://mainnet.base.org";
const ERC721_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
];

// Image generation cost in tokens (more expensive than text messages)
const IMAGE_GENERATION_COST = 100; // Adjust based on your pricing

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, prompt } = body;

    if (!walletAddress || !prompt) {
      return NextResponse.json(
        { error: "Missing walletAddress or prompt" },
        { status: 400 }
      );
    }

    // Normalize wallet address
    const normalizedAddress = walletAddress.toLowerCase();
    if (!ethers.isAddress(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    // ✅ NFT Ownership Check: Only checks wallet balance on blockchain
    // - Works for both minted NFTs and transferred NFTs (no database check)
    // - If wallet has NFT → access granted (mint status not required)
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ERC721_ABI, provider);
      
      const checksummedAddress = ethers.getAddress(walletAddress);
      const balanceResult = await contract.balanceOf(checksummedAddress);
      const hasNFT = balanceResult > 0n;
      
      if (!hasNFT) {
        console.log("❌ NFT ownership check failed for image generation:", {
          wallet: checksummedAddress,
          balance: balanceResult.toString(),
        });
        return NextResponse.json(
          { error: "Access denied. You must own an xFrora NFT to generate images." },
          { status: 403 }
        );
      }
      
      console.log("✅ NFT ownership verified for image generation:", {
        wallet: checksummedAddress,
        balance: balanceResult.toString(),
      });
    } catch (error: any) {
      console.error("❌ Error checking NFT ownership for image generation:", error);
      return NextResponse.json(
        { error: "Failed to verify NFT ownership. Please try again." },
        { status: 500 }
      );
    }

    // Ensure chat_tokens record exists for NFT owner
    await ensureChatTokensRecordForNFTOwner(walletAddress);

    // Check token balance
    let currentBalance = 0;
    let currentPoints = 0;
    try {
      if (isMockMode) {
        const { getMockTokenBalances } = await import("@/lib/chat-tokens-mock");
        const mockTokenBalances = getMockTokenBalances();
        const userData = mockTokenBalances.get(normalizedAddress) || { balance: 0, points: 0 };
        currentBalance = userData.balance;
        currentPoints = userData.points;
      } else {
        const result = await db
          .select()
          .from(chat_tokens)
          .where(eq(chat_tokens.wallet_address, normalizedAddress))
          .limit(1);
        
        if (result && result.length > 0) {
          currentBalance = Number(result[0].balance) || 0;
          currentPoints = Number(result[0].points) || 0;
        }
      }
    } catch (error) {
      console.error("Error fetching token balance:", error);
      return NextResponse.json(
        { error: "Failed to check token balance" },
        { status: 500 }
      );
    }
    
    if (currentBalance < IMAGE_GENERATION_COST) {
      return NextResponse.json(
        {
          error: `Insufficient tokens. Image generation requires ${IMAGE_GENERATION_COST} tokens. You have ${currentBalance} tokens.`,
          paymentRequired: true,
        },
        { status: 402 }
      );
    }

    // Generate image using Daydreams API
    if (!env.INFERENCE_API_KEY) {
      return NextResponse.json(
        { error: "Image generation service not configured" },
        { status: 500 }
      );
    }

    try {
      console.log("🎨 Generating image from chatbot prompt:", prompt);
      
      // Generate seed from prompt + wallet for uniqueness
      const seed = ethers.id(prompt + walletAddress + Date.now());
      
      // Generate image
      const imageBuffer = await generateImageViaDaydreamsAPI(
        prompt,
        seed,
        env.COLLECTION_THEME || "frog"
      );

      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error("Image generation returned empty buffer");
      }

      console.log("✅ Image generated successfully. Size:", imageBuffer.length, "bytes");

      // Pin image to IPFS
      const filename = `chatbot_${normalizedAddress}_${Date.now()}.png`;
      let imageUrl: string;
      try {
        imageUrl = await pinToIPFS(imageBuffer, filename);
        console.log("✅ Image pinned to IPFS:", imageUrl);
      } catch (ipfsError: any) {
        console.error("❌ Failed to pin image to IPFS:", ipfsError);
        return NextResponse.json(
          { 
            error: "Failed to upload image",
            details: ipfsError?.message || "Unknown IPFS error",
          },
          { status: 500 }
        );
      }

      // Convert IPFS URL to gateway URL for display
      let imageGatewayUrl = imageUrl;
      if (imageUrl.startsWith("ipfs://")) {
        imageGatewayUrl = `https://gateway.pinata.cloud/ipfs/${imageUrl.replace("ipfs://", "")}`;
      }

      // Deduct tokens and update points
      const newBalance = Math.max(0, currentBalance - IMAGE_GENERATION_COST);
      
      // Calculate points: image generation earns bonus points
      // Every image generation = 10 bonus points + normal token-based points
      let totalTokensSpent = 0;
      let newPoints = currentPoints;

      if (isMockMode) {
        const { getMockTokenBalances } = await import("@/lib/chat-tokens-mock");
        const mockTokenBalances = getMockTokenBalances();
        const userData = mockTokenBalances.get(normalizedAddress) || { balance: 0, points: 0, totalTokensSpent: 0 };
        const previousTotalSpent = userData.totalTokensSpent || 0;
        totalTokensSpent = previousTotalSpent + IMAGE_GENERATION_COST;
        
        // Calculate base points from total tokens spent (every 2,000 tokens = 1 point)
        const basePoints = Math.floor(totalTokensSpent / 2000);
        // Add bonus points for image generation
        const imageBonusPoints = 10;
        newPoints = basePoints + imageBonusPoints;
        
        mockTokenBalances.set(normalizedAddress, {
          balance: newBalance,
          points: newPoints,
          totalTokensSpent: totalTokensSpent,
        });
      } else {
        const result = await db
          .select()
          .from(chat_tokens)
          .where(eq(chat_tokens.wallet_address, normalizedAddress))
          .limit(1);
        
        const currentTotalSpent = result && result.length > 0
          ? Number(result[0].total_tokens_spent) || 0
          : 0;
        
        totalTokensSpent = currentTotalSpent + IMAGE_GENERATION_COST;
        
        // Calculate base points from total tokens spent (every 2,000 tokens = 1 point)
        const basePoints = Math.floor(totalTokensSpent / 2000);
        // Add bonus points for image generation
        const imageBonusPoints = 10;
        newPoints = basePoints + imageBonusPoints;
        
        // Update balance, points, and total_tokens_spent
        const { updateTokenBalance } = await import("@/lib/chat-tokens-mock");
        await updateTokenBalance(walletAddress, newBalance, newPoints, totalTokensSpent);
      }

      const pointsEarned = newPoints - currentPoints;
      
      console.log("💾 Token balance updated for image generation:", {
        walletAddress: normalizedAddress,
        cost: IMAGE_GENERATION_COST,
        newBalance,
        pointsEarned,
        newPoints,
        previousPoints: currentPoints,
      });

      return NextResponse.json({
        success: true,
        imageUrl: imageGatewayUrl,
        ipfsUrl: imageUrl,
        tokensUsed: IMAGE_GENERATION_COST,
        newBalance,
        points: newPoints,
        pointsEarned,
      });
    } catch (error: any) {
      console.error("❌ Image generation error:", error);
      
      // Handle payment required error
      if (error.paymentRequired || error.message?.includes("PAYMENT_REQUIRED")) {
        return NextResponse.json(
          {
            error: "Daydreams account balance insufficient",
            code: "PAYMENT_REQUIRED",
            message: "Image generation service requires payment. Please contact support.",
          },
          { status: 402 }
        );
      }

      return NextResponse.json(
        {
          error: "Image generation failed",
          message: error.message || "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in chatbot image generation endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

