import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/db-supabase";
import { ethers } from "ethers";
import { env } from "@/env.mjs";

export const dynamic = 'force-dynamic';

const CONTRACT_ADDRESS = env.CONTRACT_ADDRESS || "0x7De68EB999A314A0f986D417adcbcE515E476396";
const RPC_URL = env.RPC_URL || "https://mainnet.base.org";

const ERC721_ABI = [
  "function balanceOf(address owner) external view returns (uint256)",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
    }

    const client = supabaseClient;
    if (!client) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const normalizedWallet = walletAddress.toLowerCase();

    // ✅ Check if user owns an NFT via blockchain (required to create referral link)
    // Always check NFT ownership (except for developer wallet in development)
    const DEVELOPER_WALLET = "0xEdf8e693b3ab4899a03aB22eDF90E36a6AC1Fd9d";
    const isDeveloperWallet = normalizedWallet.toLowerCase() === DEVELOPER_WALLET.toLowerCase();
    
    if (!isDeveloperWallet || process.env.NODE_ENV === "production") {
      try {
        console.log("🔍 Checking NFT ownership for referral link creation:", {
          wallet: normalizedWallet,
          isDeveloper: isDeveloperWallet,
          env: process.env.NODE_ENV,
        });
        
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ERC721_ABI, provider);
        
        const checksummedAddress = ethers.getAddress(walletAddress);
        const balanceResult = await contract.balanceOf(checksummedAddress);
        const hasNFT = balanceResult > 0n;
        
        console.log("✅ NFT ownership check result:", {
          wallet: checksummedAddress,
          balance: balanceResult.toString(),
          hasNFT,
        });
        
        if (!hasNFT) {
          console.warn("❌ NFT ownership check failed - user does not own NFT");
          return NextResponse.json(
            { error: "You must own an xFrora NFT to create a referral link." },
            { status: 403 }
          );
        }
      } catch (error: any) {
        console.error("❌ Error checking NFT ownership for referral:", {
          error: error.message,
          stack: error.stack,
          wallet: normalizedWallet,
          contractAddress: CONTRACT_ADDRESS,
          rpcUrl: RPC_URL,
        });
        return NextResponse.json(
          { 
            error: "Failed to verify NFT ownership. Please try again.",
            details: error.message 
          },
          { status: 500 }
        );
      }
    } else {
      console.log("⚠️ Skipping NFT check for developer wallet in development mode");
    }

    // Check if code already exists
    // Try both column names for compatibility (referrer_wallet_address or wallet_address)
    console.log("🔍 Checking for existing referral code:", { wallet: normalizedWallet });
    
    let existingCode: { code: string } | null = null;
    let checkError: any = null;
    
    // First try: referrer_wallet_address (new schema)
    const { data: existingNew, error: checkErrorNew } = await (client as any)
      .from("referral_codes")
      .select("code")
      .eq("referrer_wallet_address", normalizedWallet)
      .single();
    
    if (checkErrorNew && checkErrorNew.code !== 'PGRST116') {
      // Real error or not found, try old column name
      const { data: existingOld, error: checkErrorOld } = await (client as any)
        .from("referral_codes")
        .select("code")
        .eq("wallet_address", normalizedWallet)
        .single();
      
      if (checkErrorOld && checkErrorOld.code !== 'PGRST116') {
        console.error("❌ Error checking existing referral code:", checkErrorOld);
        return NextResponse.json(
          { error: "Failed to check existing referral code", details: checkErrorOld.message },
          { status: 500 }
        );
      }
      
      existingCode = existingOld as { code: string } | null;
      checkError = checkErrorOld;
    } else {
      existingCode = existingNew as { code: string } | null;
      checkError = checkErrorNew;
    }

    if (existingCode && existingCode.code) {
      console.log("✅ Existing referral code found:", existingCode.code);
      return NextResponse.json({ code: existingCode.code });
    }

    // Ensure chat_tokens record exists for NFT owner (handles transferred NFTs)
    // This allows NFT owners to use referral features even if they didn't mint
    console.log("📝 Ensuring chat_tokens record exists for NFT owner...");
    try {
      const { ensureChatTokensRecordForNFTOwner } = await import("@/lib/nft-ownership-helpers");
      await ensureChatTokensRecordForNFTOwner(walletAddress);
    } catch (ensureError: any) {
      console.error("⚠️ Warning: Failed to ensure chat_tokens record:", ensureError);
      // Continue anyway - not critical for referral code creation
    }

    // Create new unique code (last 6 chars of wallet + random string if needed)
    // Simple version: 'ref_' + last 6 chars of wallet
    const code = `ref_${normalizedWallet.slice(-6)}`;
    console.log("➕ Creating new referral code:", { wallet: normalizedWallet, code });

    // Insert - try with referrer_wallet_address first (new schema)
    // If that fails, try wallet_address (old schema for compatibility)
    let insertData: any = null;
    let insertError: any = null;
    
    // Try new schema first
    const { data: insertDataNew, error: insertErrorNew } = await (client as any)
      .from("referral_codes")
      .insert({
        referrer_wallet_address: normalizedWallet,
        code: code
      })
      .select("code")
      .single();
    
    if (insertErrorNew && insertErrorNew.code === '42703') {
      // Column doesn't exist, try old schema
      console.log("⚠️ New schema column not found, trying old schema...");
      const { data: insertDataOld, error: insertErrorOld } = await (client as any)
        .from("referral_codes")
        .insert({
          wallet_address: normalizedWallet,
          code: code
        })
        .select("code")
        .single();
      
      insertData = insertDataOld;
      insertError = insertErrorOld;
    } else {
      insertData = insertDataNew;
      insertError = insertErrorNew;
    }

    const insertedCode = insertData as { code: string } | null;

    if (insertError) {
      console.error("❌ Error inserting referral code:", {
        error: insertError,
        code: insertError.code,
        message: insertError.message,
        wallet: normalizedWallet,
      });
      
      // Handle duplicate code edge case by appending random char
      if (insertError.code === '23505') { // Unique constraint violation
         console.log("🔄 Duplicate code detected, generating new code with suffix...");
         const randomSuffix = Math.floor(Math.random() * 1000);
         const newCode = `ref_${normalizedWallet.slice(-6)}${randomSuffix}`;
         
         // Try new schema first, fallback to old
         let retryData: any = null;
         let retryError: any = null;
         
         const { data: retryDataNew, error: retryErrorNew } = await (client as any)
            .from("referral_codes")
            .insert({
                referrer_wallet_address: normalizedWallet,
                code: newCode
            })
            .select("code")
            .single();
         
         if (retryErrorNew && retryErrorNew.code === '42703') {
           // Column doesn't exist, try old schema
           const { data: retryDataOld, error: retryErrorOld } = await (client as any)
              .from("referral_codes")
              .insert({
                  wallet_address: normalizedWallet,
                  code: newCode
              })
              .select("code")
              .single();
           
           retryData = retryDataOld;
           retryError = retryErrorOld;
         } else {
           retryData = retryDataNew;
           retryError = retryErrorNew;
         }
            
         const retryCode = retryData as { code: string } | null;
         if (retryError) {
           console.error("❌ Error inserting retry referral code:", retryError);
           throw retryError;
         }
         console.log("✅ Retry referral code created:", retryCode?.code);
         return NextResponse.json({ code: retryCode?.code });
      }
      
      throw insertError;
    }

    if (!insertedCode || !insertedCode.code) {
      console.error("❌ Referral code insert succeeded but no code returned:", insertData);
      return NextResponse.json(
        { error: "Failed to create referral code - no code returned" },
        { status: 500 }
      );
    }

    console.log("✅ Referral code created successfully:", insertedCode.code);
    return NextResponse.json({ code: insertedCode.code });

  } catch (error: any) {
    console.error("❌ Referral create error:", {
      error: error.message,
      stack: error.stack,
      code: error.code,
      details: error,
    });
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error.message,
        type: error.constructor.name
      },
      { status: 500 }
    );
  }
}

