/**
 * Mint Permit API - x402 Payment Protocol
 * 
 * Bu endpoint x402 protokolünü kullanarak:
 * 1. Kullanıcıdan 5 USDC ödemesi alır
 * 2. Ödeme doğrulandıktan sonra mint permit verir
 */

import { NextRequest, NextResponse } from "next/server";
import { signMintAuth } from "@/lib/eip712";
import { db, tokens, payments } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { env, isMockMode } from "@/env.mjs";
import { ethers } from "ethers";
import type { MintAuth } from "@/lib/types";
import { SignJWT } from "jose";

// Ödeme bilgileri
const RECIPIENT_ADDRESS = "0xDA9097c5672928a16C42889cD4b07d9a766827ee";
const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PAYMENT_AMOUNT = "5000000"; // 5 USDC (6 decimals)
const NETWORK = "base";

// CRITICAL: paymentRequirements MUST be EXACTLY the same in 402 response and settle call!
// Store it as a constant to ensure consistency
const PAYMENT_REQUIREMENTS = {
  scheme: "exact" as const,
  network: NETWORK,
  maxAmountRequired: PAYMENT_AMOUNT,
  resource: "https://xfroranft.xyz/api/mint-permit-v2",
  description: "Mint permit for xFrora NFT - Pay 5 USDC to mint your AI-crafted identity",
  mimeType: "application/json",
  payTo: RECIPIENT_ADDRESS,
  maxTimeoutSeconds: 60, // Changed from 300 to 60 (more conservative)
  asset: BASE_USDC_ADDRESS,
  extra: {
    name: "USD Coin",
    version: "2"
  }
};

// Contract ABI
const CONTRACT_ABI = [
  "function getNonce(address user) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function MAX_SUPPLY() external view returns (uint256)",
  "function remainingSupply() external view returns (uint256)",
  "function usedXUserId(uint256) external view returns (bool)", // xUserId = hashed Farcaster FID
  "function getTokenIdForXUser(uint256) external view returns (uint256)",
  "function owner() external view returns (address)",
];

/**
 * x402 Response - 402 Payment Required
 */
function create402Response() {
  return NextResponse.json(
    {
      x402Version: 1,
      accepts: [PAYMENT_REQUIREMENTS] // Use the EXACT same object as settle!
    },
    { 
      status: 402,
      headers: {
        "Content-Type": "application/json",
        "X-Payment-Required": "true"
      }
    }
  );
}

/**
 * CDP Facilitator API - Ödeme settlement (USDC transfer)
 * 
 * API Docs: https://docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator/settle-a-payment
 * 
 * Bu fonksiyon USDC'yi gerçekten transfer eder!
 */
async function settlePaymentWithCDPFacilitator(paymentPayload: any): Promise<{
  success: boolean;
  payer?: string;
  transaction?: string;
  errorReason?: string;
}> {
  try {
    console.log("💰 Settling payment with CDP Facilitator API (USDC TRANSFER)...");
    
    const apiKeyId = env.CDP_API_KEY_ID;
    const apiKeySecret = env.CDP_API_KEY_SECRET;
    
    if (!apiKeyId || !apiKeySecret) {
      console.error("❌ CDP API keys not configured");
      return { success: false, errorReason: "api_keys_missing" };
    }
    
    // Generate JWT token using @coinbase/cdp-sdk/auth
    const { generateJwt } = await import("@coinbase/cdp-sdk/auth");
    
    const requestHost = "api.cdp.coinbase.com";
    const requestPath = "/platform/v2/x402/settle";
    const requestMethod = "POST";
    
    console.log("🔐 Generating CDP JWT token for settlement...");
    const token = await generateJwt({
      apiKeyId: apiKeyId,
      apiKeySecret: apiKeySecret,
      requestMethod: requestMethod,
      requestHost: requestHost,
      requestPath: requestPath,
      expiresIn: 120
    });
    
    // CRITICAL: Use EXACT same paymentRequirements as 402 response!
    const paymentRequirements = PAYMENT_REQUIREMENTS;
    
    const requestBody = {
      x402Version: 1,
      paymentPayload: paymentPayload,
      paymentRequirements: paymentRequirements
    };
    
    console.log("📤 Sending settlement request to CDP Facilitator (THIS TRANSFERS USDC)...");
    console.log("🔍 FULL paymentRequirements being sent:", JSON.stringify(paymentRequirements, null, 2));
    console.log("📝 Payment payload structure:", JSON.stringify({
      scheme: paymentPayload.scheme,
      network: paymentPayload.network,
      payload_keys: Object.keys(paymentPayload.payload || {}),
      authorization_keys: Object.keys(paymentPayload.payload?.authorization || {}),
      authorization_sample: {
        from: paymentPayload.payload?.authorization?.from?.substring(0, 10) + "...",
        to: paymentPayload.payload?.authorization?.to?.substring(0, 10) + "...",
        value: paymentPayload.payload?.authorization?.value
      }
    }));
    
    const response = await fetch(`https://${requestHost}${requestPath}`, {
      method: requestMethod,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ CDP Facilitator settlement error:");
      console.error("   Status:", response.status);
      console.error("   Response:", errorText);
      return { success: false, errorReason: "facilitator_error" };
    }
    
    const result = await response.json();
    console.log("✅ CDP Facilitator settlement response:", JSON.stringify(result, null, 2));
    
    return result;
    
  } catch (error) {
    console.error("❌ Settlement error:", error);
    return { success: false, errorReason: "exception" };
  }
}

/**
 * CDP Facilitator API - Ödeme doğrulama
 * 
 * API Docs: https://docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator/verify-a-payment
 * 
 * CDP Facilitator kullanarak x402 payment verification
 */
async function verifyPaymentWithCDPFacilitator(paymentPayload: any): Promise<boolean> {
  try {
    console.log("🔍 Verifying payment with CDP Facilitator API...");
    
    // CDP API için Bearer token oluştur
    const apiKeyName = env.CDP_API_KEY_ID;
    const apiKeySecret = env.CDP_API_KEY_SECRET;
    
    if (!apiKeyName || !apiKeySecret) {
      console.error("❌ CDP API keys not configured");
      return false;
    }
    
    // JWT token oluştur (CDP Authentication dökümanlarına göre)
    // https://docs.cdp.coinbase.com/api-reference/v2/authentication
    const secret = new TextEncoder().encode(apiKeySecret);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: apiKeyName, typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime("1m")
      .sign(secret);
    
    // CDP Facilitator API endpoint
    const facilitatorUrl = "https://api.cdp.coinbase.com/platform/v2/x402/verify";
    
    // Payment requirements
    const paymentRequirements = {
      scheme: "exact",
      network: NETWORK,
      maxAmountRequired: PAYMENT_AMOUNT,
      resource: `/api/mint-permit-v2`,
      description: "Mint permit for xFrora NFT - Pay 5 USDC to mint your unique AI-crafted identity",
      mimeType: "application/json",
      payTo: RECIPIENT_ADDRESS,
      maxTimeoutSeconds: 300,
      asset: BASE_USDC_ADDRESS
    };
    
    // API request body
    const requestBody = {
      x402Version: 1,
      paymentPayload: paymentPayload,
      paymentRequirements: paymentRequirements
    };
    
    console.log("📤 Sending verification request to CDP Facilitator...");
    
    const response = await fetch(facilitatorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ CDP Facilitator API error:", response.status, errorText);
      return false;
    }
    
    const result = await response.json();
    console.log("📥 CDP Facilitator response:", result);
    
    // Check if payment is valid
    if (result.isValid === true) {
      console.log("✅ Payment verified by CDP Facilitator!");
      console.log(`   Payer: ${result.payer}`);
      return true;
    } else {
      console.error("❌ Payment verification failed");
      console.error(`   Reason: ${result.invalidReason || 'Unknown'}`);
      return false;
    }
    
  } catch (error) {
    console.error("❌ CDP Facilitator verification error:", error);
    return false;
  }
}

/**
 * GET - Return 402 for discovery tools (x402scan)
 */
export async function GET(request: NextRequest) {
  console.log("📮 Received GET request for mint-permit-v2 - returning 402 for discovery");
  return create402Response();
}

/**
 * POST - Mint permit with x402 payment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet, farcaster_user_id } = body;
    
    // Validate input
    if (!wallet || !farcaster_user_id) {
      return NextResponse.json(
        { error: "Missing required fields: wallet and farcaster_user_id" },
        { status: 400 }
      );
    }
    
    const userId = farcaster_user_id;
    
    if (!ethers.isAddress(wallet)) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }
    
    // Lookup existing token state (if any)
    let existingTokenRecord: any = null;
    let existingPaymentRecord: any = null;
    if (!isMockMode && db) {
      try {
        const [tokenRows, paymentRows] = await Promise.all([
          db
            .select()
            .from(tokens)
            .where(eq(tokens.x_user_id, userId)) // Farcaster FID stored in x_user_id column
            .limit(1),
          db
            .select()
            .from(payments)
            .where(eq(payments.x_user_id, userId)) // Farcaster FID stored in x_user_id column
            .limit(1),
        ]);
        existingTokenRecord = tokenRows?.[0] || null;
        existingPaymentRecord = paymentRows?.[0] || null;
      } catch (dbError) {
        console.error("⚠️ Supabase token lookup failed:", dbError);
      }
    }

    const normalizedWallet = wallet.toLowerCase();
    const recordedWallet = existingTokenRecord?.wallet_address
      ? String(existingTokenRecord.wallet_address).toLowerCase()
      : existingPaymentRecord?.wallet_address
      ? String(existingPaymentRecord.wallet_address).toLowerCase()
      : null;
    const recordedStatus = existingTokenRecord?.status || null;
    const hasCompletedPayment = existingPaymentRecord?.status === "completed";

    // Convert Farcaster fid to contract format (uint256)
    // Hash the fid string to get xUserId for contract
    const userIdString = userId.toString();
    const hash = ethers.id(userIdString);
    const xUserIdBigInt = BigInt(hash);

    const issueMintPermit = async () => {
      console.log(`📝 Generating mint permit for wallet: ${wallet}, Farcaster user: ${userId}`);

      const provider = new ethers.JsonRpcProvider(env.RPC_URL);
      const contract = new ethers.Contract(env.CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const nonce = await contract.getNonce(wallet);

      let tokenURI = existingTokenRecord?.metadata_uri || null;

      if (!tokenURI && !isMockMode && db) {
        try {
          console.log(`🔍 Looking for token metadata for farcaster_user_id: ${userId}`);
          const userToken = await db
            .select()
            .from(tokens)
            .where(eq(tokens.x_user_id, userId)) // Farcaster FID stored in x_user_id column
            .limit(1);

          if (userToken && userToken.length > 0) {
            tokenURI = userToken[0].metadata_uri;
            console.log(`✅ Found token metadata: ${tokenURI}`);
          } else {
            console.log(`⚠️ No token metadata found for user: ${userId}`);
          }
        } catch (dbError) {
          console.error("❌ Database error fetching metadata:", dbError);
        }
      }

      if (!tokenURI) {
        tokenURI = `ipfs://QmPlaceholder${Date.now()}`;
        console.warn(`⚠️ Using placeholder tokenURI: ${tokenURI}`);
      }

      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour
      const mintAuth: MintAuth = {
        to: wallet,
        payer: wallet,
        xUserId: xUserIdBigInt.toString(),
        tokenURI,
        nonce: Number(nonce),
        deadline,
      };

      const signature = await signMintAuth(mintAuth);
      console.log(`✅ Mint permit signed successfully`);

      return NextResponse.json({
        auth: mintAuth,
        signature,
      });
    };

    // 🔒 SECURITY: Check if Farcaster user already minted BEFORE accepting payment
    console.log(`🔍 Checking if Farcaster user ${userId} already minted...`);
    try {
      const provider = new ethers.JsonRpcProvider(env.RPC_URL);
      const contract = new ethers.Contract(env.CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const xUserIdAlreadyMinted = await contract.usedXUserId(xUserIdBigInt);
      if (xUserIdAlreadyMinted) {
        console.error("❌ Farcaster User already minted! Rejecting payment.");
        return NextResponse.json(
          {
            error: "Farcaster User ID already minted",
            message: "This Farcaster account has already minted an NFT. Each account can only mint once."
          },
          { status: 400 }
        );
      }
      console.log("✅ Farcaster User has not minted yet, proceeding with payment settlement...");
    } catch (contractError) {
      console.error("⚠️ Contract check failed:", contractError);
      // Continue anyway - contract will validate during mint
    }

    const paymentHeader = request.headers.get("x-payment");

    if (!paymentHeader) {
      const hasRecordedPayment = recordedStatus === "paid" || hasCompletedPayment;
      if (hasRecordedPayment) {
        console.log("💳 Payment already recorded in Supabase. Skipping 402 flow.");
        if (recordedWallet && recordedWallet !== normalizedWallet) {
          console.error("❌ Wallet mismatch for recorded payment:", {
            recordedWallet,
            requestedWallet: normalizedWallet,
          });
          return NextResponse.json(
            {
              error: "Payment already completed with another wallet",
              message: `Payment was completed using wallet ${recordedWallet}. Please reconnect with the same wallet to continue.`,
            },
            { status: 400 }
          );
        }
        if (!existingTokenRecord) {
          console.error("❌ No generated NFT record found for paid user:", userId);
          return NextResponse.json(
            {
              error: "Generated NFT not found",
              message: "We could not find the generated NFT for this payment. Please regenerate your NFT.",
            },
            { status: 400 }
          );
        }
        return await issueMintPermit();
      }

      console.log("💳 No payment header - returning 402");
      return create402Response();
    }

    // Payment header received - parse and settle it
    console.log("🔍 Payment header received");
    console.log("Payment header:", paymentHeader.substring(0, 200) + "...");
    
    // Parse payment payload
    let paymentPayload;
    try {
      // x402-fetch might base64 encode the payload
      // Check if it starts with 'eyJ' (base64 encoded JSON starts with this)
      if (paymentHeader.startsWith('eyJ')) {
        console.log("🔓 Detected base64 encoded payment, decoding...");
        const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
        console.log("Decoded payment:", decoded.substring(0, 200) + "...");
        paymentPayload = JSON.parse(decoded);
      } else {
        // Direct JSON
        paymentPayload = JSON.parse(paymentHeader);
      }
      console.log("✅ Payment payload parsed:", {
        x402Version: paymentPayload.x402Version,
        scheme: paymentPayload.scheme,
        network: paymentPayload.network,
        hasPayload: !!paymentPayload.payload
      });
    } catch (error) {
      console.error("❌ Invalid payment header format:", error);
      return NextResponse.json(
        { error: "Invalid payment header" },
        { status: 400 }
      );
    }
    
    // CRITICAL: Call settle API to transfer USDC!
    console.log("💰 Calling CDP Facilitator SETTLE API to transfer USDC...");
    const settlement = await settlePaymentWithCDPFacilitator(paymentPayload);
    
    if (!settlement.success) {
      console.error("❌ Payment settlement failed:", settlement.errorReason);
      return NextResponse.json(
        { 
          error: "Payment settlement failed", 
          reason: settlement.errorReason 
        },
        { status: 402 }
      );
    }
    
    console.log("✅ Payment settled successfully!");
    console.log(`   Payer: ${settlement.payer}`);
    console.log(`   Transaction: ${settlement.transaction}`);
    
    // 🔒 SECURITY: Check if transaction already used
    if (!isMockMode && db && settlement.transaction) {
      console.log("🔍 Checking if transaction already used in Supabase...");
      try {
        const existingPayment = await db
          .select()
          .from(payments)
          .where(eq((payments as any).transaction_hash, settlement.transaction))
          .limit(1);
        
        if (existingPayment && existingPayment.length > 0) {
          console.error("❌ Transaction already used:", settlement.transaction);
          return NextResponse.json(
            { 
              error: "Payment already used",
              message: "This payment has already been used to mint an NFT"
            },
            { status: 400 }
          );
        }
        
        console.log("✅ Transaction is new, recording to Supabase...");
        // Record the transaction to Supabase
        await db.insert(payments).values({
          x_user_id: userId,
          wallet_address: settlement.payer || wallet,
          amount: PAYMENT_AMOUNT,
          transaction_hash: settlement.transaction,
          status: "completed",
          created_at: new Date().toISOString()
        });
        console.log("💾 Transaction recorded in payments table");
        
        // ✅ UPDATE tokens status to 'paid' (payment successful, ready to mint)
        try {
          await db
            .update(tokens)
            .set({ status: "paid", wallet_address: settlement.payer || wallet })
            .where(eq(tokens.x_user_id, userId));
          console.log("✅ Token status updated to 'paid' (ready to mint)");
          if (existingTokenRecord) {
            existingTokenRecord.status = "paid";
            existingTokenRecord.wallet_address = settlement.payer || wallet;
          }
        } catch (statusError) {
          console.error("⚠️ Failed to update token status:", statusError);
          // Continue anyway - not critical
        }
      } catch (dbError) {
        console.error("⚠️ Database transaction check failed:", dbError);
        // Continue anyway for now, but log the error
      }
    }
    
    return await issueMintPermit();
    
  } catch (error: any) {
    console.error("❌ Error in mint-permit:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error?.message || "Failed to generate mint permit"
      },
      { status: 500 }
    );
  }
}

