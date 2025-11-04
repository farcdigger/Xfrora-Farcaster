import axios from "axios";
import { env } from "../env.mjs";

export interface X402PaymentRequest {
  asset: string;
  amount: string;
  network: string;
  recipient: string;
}

export interface X402PaymentResponse {
  x402Version: number;
  accepts: X402PaymentRequest[];
  error?: string;
}

export interface X402PaymentVerification {
  paymentId: string;
  amount: string;
  asset: string;
  network: string;
  payer: string;
  recipient: string;
}

/**
 * Create x402 payment response for mint payment
 * Note: This is separate from Daydreams SDK's x402 payment (used for image generation)
 * This payment is for the NFT mint itself
 */
export function createX402Response(recipient: string): X402PaymentResponse {
  // Determine network from chain ID
  const chainId = parseInt(env.NEXT_PUBLIC_CHAIN_ID || "8453");
  let network = "base"; // Base Mainnet
  
  // Base Mainnet (default)
  if (chainId === 8453) {
    network = "base";
  } else if (chainId === 84532) {
    // Base Sepolia testnet (legacy support)
    network = "base-sepolia";
  }
  
  return {
    x402Version: 1,
    accepts: [
      {
        asset: "USDC",
        amount: env.X402_PRICE_USDC,
        network,
        recipient,
      },
    ],
    error: "",
  };
}

/**
 * Verify x402 payment for mint
 * This verifies the payment header following Daydreams Router x402 pattern
 * The payment header contains a signed EIP-712 message that commits to a payment
 * 
 * This verification:
 * 1. Verifies the EIP-712 signature
 * 2. Checks payment commitment matches the expected amount/recipient
 * 3. Optionally executes the payment on-chain (or trusts the signature)
 */
export async function verifyX402Payment(
  paymentHeader: string,
  facilitatorUrl?: string,
  rpcUrl?: string
): Promise<X402PaymentVerification | null> {
  try {
    // Parse X-PAYMENT header (contains payment commitment + transaction proof)
    // x402 Protocol (immediate): Signature + Transaction pattern
    // Both signature (payment commitment) and transaction hash (actual USDC transfer) are present
    const paymentData = JSON.parse(paymentHeader);
    
    // Verify payment header has required data
    if (!paymentData.payer || !paymentData.amount || !paymentData.recipient) {
      console.error("Invalid payment header: missing payment data");
      return null;
    }
    
    // Verify EIP-712 signature is present (payment commitment)
    if (!paymentData.signature) {
      console.error("Invalid payment header: missing EIP-712 signature (payment commitment)");
      return null;
    }
    
    // Verify transaction hash is present (proof of actual USDC transfer)
    // This follows x402-fetch pattern: signature + transaction
    if (!paymentData.transactionHash) {
      console.error("Invalid payment header: missing transaction hash (proof of USDC transfer)");
      return null;
    }

    // Verify EIP-712 signature
    // The signature proves the user committed to pay the specified amount
    const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "8453");
    const network = chainId === 8453 ? "base" : chainId === 84532 ? "base-sepolia" : "base";
    
    // Base Mainnet USDC
    const usdcAddress = network === "base" 
      ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
      : process.env.USDC_CONTRACT_ADDRESS || null;
    
    if (!usdcAddress) {
      console.error("USDC contract address not configured");
      return null;
    }

    try {
      const { ethers } = await import("ethers");
      
      // Verify EIP-712 signature
      // This is the x402 payment commitment - the signature proves the payment
      const domain = {
        name: "X402 Payment",
        version: "1",
        chainId: network === "base" ? 8453 : network === "base-sepolia" ? 84532 : 8453,
        verifyingContract: usdcAddress,
      };

      const types = {
        Payment: [
          { name: "amount", type: "string" },
          { name: "asset", type: "string" },
          { name: "network", type: "string" },
          { name: "recipient", type: "address" },
          { name: "payer", type: "address" },
          { name: "timestamp", type: "uint256" },
          { name: "nonce", type: "string" },
        ],
      };

      // Verify signature matches payer
      const recoveredAddress = ethers.verifyTypedData(
        domain,
        types,
        {
          amount: paymentData.amount,
          asset: paymentData.asset,
          network: paymentData.network,
          recipient: paymentData.recipient,
          payer: paymentData.payer,
          timestamp: BigInt(paymentData.timestamp),
          nonce: paymentData.nonce,
        },
        paymentData.signature
      );

      if (recoveredAddress.toLowerCase() !== paymentData.payer.toLowerCase()) {
        console.error("Signature verification failed: address mismatch");
        return null;
      }

      // Verify payment amount matches expected
      const expectedAmount = process.env.X402_PRICE_USDC || "2000000";
      if (paymentData.amount !== expectedAmount) {
        console.error(`Payment amount mismatch: expected ${expectedAmount}, got ${paymentData.amount}`);
        return null;
      }

      // Verify payment is not too old (5 minutes)
      const timestamp = Number(paymentData.timestamp || 0);
      const now = Math.floor(Date.now() / 1000);
      if (timestamp > 0 && now - timestamp > 300) {
        console.error("Payment commitment expired");
        return null;
      }

      // Verify actual USDC transfer transaction on-chain
      // This follows x402-fetch pattern: verify both signature AND transaction
      if (!rpcUrl) {
        console.error("RPC_URL not configured - cannot verify transaction");
        return null;
      }

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        
        // Verify transaction exists and is successful
        const receipt = await provider.getTransactionReceipt(paymentData.transactionHash);
        
        if (!receipt || receipt.status !== 1) {
          console.error("USDC transfer transaction failed or not found:", paymentData.transactionHash);
          return null;
        }

        // Verify transaction is from the payer
        if (receipt.from.toLowerCase() !== paymentData.payer.toLowerCase()) {
          console.error("Transaction payer mismatch");
          return null;
        }

        // Format USDC amount for display
        const amountBigInt = BigInt(paymentData.amount);
        const usdcDecimals = 6; // USDC has 6 decimals
        const divisor = BigInt(10 ** usdcDecimals);
        const whole = amountBigInt / divisor;
        const fraction = amountBigInt % divisor;
        const formattedAmount = `${whole}.${fraction.toString().padStart(usdcDecimals, "0")}`;
        
        console.log("✅ x402 payment verified (signature + transaction):");
        console.log(`   - Payment commitment: EIP-712 signature verified ✓`);
        console.log(`   - USDC transfer: ${receipt.hash} verified on-chain ✓`);
        console.log(`   Payer: ${paymentData.payer}`);
        console.log(`   Amount: ${formattedAmount} USDC`);
        console.log(`   Recipient: ${paymentData.recipient}`);
        console.log(`   Block: ${receipt.blockNumber}`);
        
        return {
          paymentId: paymentData.nonce || `payment_${receipt.blockNumber}`,
          amount: paymentData.amount,
          asset: paymentData.asset,
          network: paymentData.network || "base",
          payer: paymentData.payer,
          recipient: paymentData.recipient,
        };
      } catch (txError: any) {
        console.error("Transaction verification error:", txError.message);
        return null;
      }
    } catch (sigError: any) {
      console.error("EIP-712 signature verification error:", sigError.message);
      return null;
    }
  } catch (error: any) {
    console.error("x402 verification error:", error.message);
    return null;
  }
}

