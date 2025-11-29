/**
 * Helper functions for NFT ownership checks and chat_tokens record creation
 * Handles NFT owners who may have transferred NFTs or don't have user records
 */

import { ethers } from "ethers";
import { env } from "@/env.mjs";
import { db, chat_tokens } from "@/lib/db";
import { eq } from "drizzle-orm";

const CONTRACT_ADDRESS = env.CONTRACT_ADDRESS || "0x7De68EB999A314A0f986D417adcbcE515E476396";
const RPC_URL = env.RPC_URL || "https://mainnet.base.org";

const ERC721_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
];

/**
 * Check if wallet owns NFT directly from blockchain (handles transferred NFTs)
 */
export async function checkNFTOwnershipFromBlockchain(
  walletAddress: string
): Promise<boolean> {
  try {
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return false;
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ERC721_ABI, provider);
    
    const checksummedAddress = ethers.getAddress(walletAddress);
    const balanceResult = await contract.balanceOf(checksummedAddress);
    
    return balanceResult > 0n;
  } catch (error) {
    console.error("Error checking NFT ownership from blockchain:", error);
    return false;
  }
}

/**
 * Ensure chat_tokens record exists for NFT owner
 * Creates record if wallet owns NFT but no chat_tokens record exists
 */
export async function ensureChatTokensRecordForNFTOwner(
  walletAddress: string
): Promise<boolean> {
  try {
    const normalizedAddress = walletAddress.toLowerCase();

    // Check if chat_tokens record already exists
    const existing = await db
      .select()
      .from(chat_tokens)
      .where(eq(chat_tokens.wallet_address, normalizedAddress))
      .limit(1);

    if (existing && existing.length > 0) {
      return true; // Record already exists
    }

    // No record exists - check if wallet owns NFT (from blockchain, handles transferred NFTs)
    const hasNFT = await checkNFTOwnershipFromBlockchain(walletAddress);
    
    if (hasNFT) {
      // Create chat_tokens record for NFT owner (even if they didn't mint, transferred NFT counts)
      console.log("✅ Creating chat_tokens record for NFT owner:", {
        wallet: normalizedAddress.substring(0, 10) + "...",
        note: "NFT ownership verified from blockchain (may be transferred NFT)",
      });

      await db.insert(chat_tokens).values({
        wallet_address: normalizedAddress,
        balance: 0,
        points: 0,
        total_tokens_spent: 0,
      });

      return true;
    }

    return false; // No NFT ownership, no record created
  } catch (error: any) {
    console.error("Error ensuring chat_tokens record:", {
      error: error.message,
      wallet: walletAddress?.substring(0, 10) + "...",
    });
    return false;
  }
}

