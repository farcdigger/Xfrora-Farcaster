import { paymentMiddleware, Network } from "x402-next";
import { facilitator } from "@coinbase/x402";

// Recipient wallet address (server signer address)
const RECIPIENT_ADDRESS = "0x5305538F1922B69722BBE2C1B84869Fd27Abb4BF";

// CRITICAL: Check if CDP API keys are configured
// The facilitator from @coinbase/x402 REQUIRES CDP_API_KEY_ID and CDP_API_KEY_SECRET
// These must be set in Vercel environment variables
if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET) {
  console.error("❌ CRITICAL: CDP_API_KEY_ID or CDP_API_KEY_SECRET not set!");
  console.error("   Middleware will fail to verify payments!");
  console.error("   Set these in Vercel environment variables:");
  console.error("   1. Go to https://portal.cdp.coinbase.com/");
  console.error("   2. Create API key with x402 permission");
  console.error("   3. Add CDP_API_KEY_ID and CDP_API_KEY_SECRET to Vercel");
  console.error("   4. Redeploy");
}

// Configure the payment middleware for /api/mint-permit endpoint
// Using CDP facilitator for mainnet (configured via CDP_API_KEY_ID and CDP_API_KEY_SECRET)
// Reference: https://docs.cdp.coinbase.com/x402/quickstart-for-sellers#running-on-mainnet
export const middleware = paymentMiddleware(
  RECIPIENT_ADDRESS, // Your receiving wallet address
  {
    "/api/mint-permit": {
      price: "$0.1", // 0.1 USDC
      network: "base" as Network, // Base mainnet
      config: {
        description: "Mint permit for Aura Creatures NFT",
        maxTimeoutSeconds: 300, // 5 minutes
        outputSchema: {
          type: "object",
          properties: {
            auth: {
              type: "object",
              properties: {
                to: { type: "string" },
                payer: { type: "string" },
                xUserId: { type: "string" },
                tokenURI: { type: "string" },
                nonce: { type: "number" },
                deadline: { type: "number" },
              },
            },
            signature: { type: "string" },
          },
        },
      },
    },
  },
  facilitator // CDP facilitator - automatically uses CDP_API_KEY_ID and CDP_API_KEY_SECRET from env
);

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    "/api/mint-permit",
  ],
};

