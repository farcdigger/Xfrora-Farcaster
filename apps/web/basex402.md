Prerequisites
Before you begin, ensure you have:
A crypto wallet to receive funds (any EVM-compatible wallet, e.g., CDP Wallet)
(Optional) A Coinbase Developer Platform (CDP) account and API Keys
Required for mainnet use until other facilitators go live
Node.js and npm, or Python and pip installed
An existing API or server
We have pre-configured examples available in our repo for both Node.js and Python. We also have an advanced example that shows how to use the x402 SDKs to build a more complex payment flow.
​
1. Install Dependencies
Node.js
Python
Express
Next.js
Hono
Install the x402 Hono middleware package:

Report incorrect code

Copy

Ask AI
npm install x402-hono
npm install @coinbase/x402 # for the mainnet facilitator
The mainnet facilitator packages (@coinbase/x402 for Node.js, cdp for Python) are only needed for production. For testnet development, you can skip these. See Running on Mainnet for details.
​
2. Add Payment Middleware
Integrate the payment middleware into your application. You will need to provide:
The Facilitator URL or facilitator object. For testing, use https://x402.org/facilitator which works on Base Sepolia and Solana Devnet.
For mainnet setup, see Running on Mainnet
The routes you want to protect
Your receiving wallet address
The examples below show testnet configuration. When you’re ready to accept real payments, refer to Running on Mainnet for the simple changes needed.
Node.js
Python
Express
Next.js
Hono
Full example in the repo here.

Report incorrect code

Copy

Ask AI
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { paymentMiddleware, Network } from "x402-hono";
// import { facilitator } from "@coinbase/x402"; // For mainnet

const app = new Hono();

// Configure the payment middleware
app.use(paymentMiddleware(
  "0xYourAddress", // your receiving wallet address
  {  // Route configurations for protected endpoints
    "/protected-route": {
      price: "$0.10",
      network: "base-sepolia", // for mainnet, see Running on Mainnet section
      config: {
        description: "Access to premium content",
      }
    }
  },
  {
    url: "https://x402.org/facilitator", // for testnet
  }
));

// Implement your route
app.get("/protected-route", (c) => {
  return c.json({ message: "This content is behind a paywall" });
});

serve({
  fetch: app.fetch,
  port: 3000
});
Ready to accept real payments? See Running on Mainnet for production setup.
Payment Middleware Configuration Interface:

Report incorrect code

Copy

Ask AI
interface PaymentMiddlewareConfig {
  description?: string;               // Description of the payment
  mimeType?: string;                  // MIME type of the resource
  maxTimeoutSeconds?: number;         // Maximum time for payment (default: 60)
  outputSchema?: Record;              // JSON schema for the response
  customPaywallHtml?: string;         // Custom HTML for the paywall
  resource?: string;                  // Resource URL (defaults to request URL)
}
When a request is made to these routes without payment, your server will respond with the HTTP 402 Payment Required code and payment instructions.
​
3. Test Your Integration
To verify:
Make a request to your endpoint (e.g., curl http://localhost:3000/your-endpoint).
The server responds with a 402 Payment Required, including payment instructions in the body.
Complete the payment using a compatible client, wallet, or automated agent. This typically involves signing a payment payload, which is handled by the client SDK detailed in the Quickstart for Buyers.
Retry the request, this time including the X-PAYMENT header containing the cryptographic proof of payment (payment payload).
The server verifies the payment via the facilitator and, if valid, returns your actual API response (e.g., { "data": "Your paid API response." }).
​
4. Enhance Discovery with Metadata (Recommended)
When using the CDP facilitator, your endpoints are automatically listed in the x402 Bazaar, our discovery layer that helps buyers and AI agents find services. To improve your visibility and help users understand your API:
Include descriptive metadata in your middleware configuration:
description: Clear explanation of what your endpoint does
inputSchema: JSON schema describing required parameters
outputSchema: JSON schema of your response format
This metadata helps:
AI agents automatically understand how to use your API
Developers quickly find services that meet their needs
Improve your ranking in discovery results
Example with full metadata:

Report incorrect code

Copy

Ask AI
{
  price: "$0.001",
  network: "base",
  config: {
    description: "Get real-time weather data including temperature, conditions, and humidity",
    inputSchema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "City name or coordinates (e.g., 'San Francisco' or '37.7749,-122.4194')"
        },
        units: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          default: "fahrenheit"
        }
      },
      required: ["location"]
    },
    outputSchema: {
      type: "object",
      properties: {
        temperature: { type: "number", description: "Current temperature" },
        conditions: { type: "string", description: "Weather conditions (sunny, cloudy, rainy, etc.)" },
        humidity: { type: "number", description: "Humidity percentage" }
      }
    }
  }
}
Learn more about the discovery layer in the x402 Bazaar documentation.
​
5. Error Handling
If you run into trouble, check out the examples in the repo for more context and full code.
npm install the dependencies in each example
​
Running on Mainnet
Once you’ve tested your integration on testnet, you’re ready to accept real payments on mainnet.
​
Setting Up CDP Facilitator for Production
CDP’s facilitator provides enterprise-grade payment processing with compliance features:

​
1. Set up CDP API Keys
To use the mainnet facilitator, you’ll need a Coinbase Developer Platform account:
Sign up at cdp.coinbase.com
Create a new project
Generate API credentials
Set the following environment variables:

Report incorrect code

Copy

Ask AI
CDP_API_KEY_ID=your-api-key-id
CDP_API_KEY_SECRET=your-api-key-secret
​
2. Update Your Code
Replace the testnet configuration with mainnet settings:
Node.js
Python

Report incorrect code

Copy

Ask AI
// Change your imports
import { facilitator } from "@coinbase/x402";

// Update the middleware configuration
app.use(paymentMiddleware(
  "0xYourAddress",
  {
    "GET /weather": {
      price: "$0.001",
      network: "base",
    },
  },
  facilitator // this was previously { url: "https://x402.org/facilitator" }
));


// or for Next.js with Solana
export const middleware = paymentMiddleware(
  "YourSolanaWalletAddress", // Use your Solana wallet address
  {
    "GET /weather": {
      price: "$0.001",
      network: "solana",
    },
  },
  facilitator // this was previously { url: "https://x402.org/facilitator" }
));
​
3. Update Your Wallet
Make sure your receiving wallet address (0xYourAddress) is a real mainnet address where you want to receive USDC payments.
​
