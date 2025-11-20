/**
 * Client-side NFT ownership check using ethers.js
 * This directly checks the blockchain without making API calls
 */

import { ethers } from "ethers";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x7De68EB999A314A0f986D417adcbcE515E476396";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.base.org";

const ERC721_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
];

/**
 * Check NFT ownership directly from blockchain (client-side)
 * @param walletAddress - The wallet address to check
 * @returns Promise<boolean> - True if wallet owns at least one NFT
 */
export async function checkNFTOwnershipClientSide(
  walletAddress: string
): Promise<boolean> {
  try {
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      console.error("❌ Invalid wallet address:", walletAddress);
      return false;
    }

    console.log("🔍 Checking NFT ownership (client-side):", {
      wallet: walletAddress.substring(0, 10) + "...",
      contract: CONTRACT_ADDRESS,
      rpc: RPC_URL,
    });

    // Create provider and contract instance
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ERC721_ABI, provider);

    // Check balance with timeout
    const balancePromise = contract.balanceOf(walletAddress);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("NFT check timeout")), 10000)
    );

    const balance = (await Promise.race([
      balancePromise,
      timeoutPromise,
    ])) as bigint;

    const hasNFT = balance > 0n;

    console.log("✅ NFT ownership check result:", {
      wallet: walletAddress.substring(0, 10) + "...",
      balance: balance.toString(),
      hasNFT,
    });

    return hasNFT;
  } catch (error: any) {
    console.error("❌ Error checking NFT ownership (client-side):", {
      error: error.message,
      wallet: walletAddress?.substring(0, 10) + "...",
    });
    return false;
  }
}

