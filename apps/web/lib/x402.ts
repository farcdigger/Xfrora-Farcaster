/**
 * x402 Server-side utilities
 * 
 * IMPORTANT: Payment verification is handled AUTOMATICALLY by middleware (middleware.ts)
 * This file only contains helper functions for creating 402 responses.
 * 
 * Reference: https://docs.cdp.coinbase.com/x402/quickstart-for-sellers
 */

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

/**
 * Create x402 payment response for mint payment
 * This tells the client what payment is required
 * Actual payment verification is handled by middleware (middleware.ts)
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
