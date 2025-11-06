/**
 * x402 Payment Client - Frontend helper for x402 payments
 * Uses Coinbase CDP x402 protocol
 * Reference: https://docs.cdp.coinbase.com/x402/quickstart-for-sellers
 * 
 * IMPORTANT: This uses USDC's official EIP-3009 TransferWithAuthorization
 * Reference: https://eips.ethereum.org/EIPS/eip-3009
 */

import { ethers } from "ethers";

export interface X402PaymentRequest {
  asset: string;
  amount: string;
  network: string;
  recipient: string;
  extra?: {
    name?: string;
    version?: string;
  };
}

export interface X402PaymentResponse {
  x402Version: number;
  accepts: X402PaymentRequest[];
  error?: string;
}

/**
 * Generate x402 payment header
 * User signs EIP-712 payment commitment
 * Middleware verifies and executes USDC transfer via facilitator
 */
export async function generateX402PaymentHeader(
  walletAddress: string,
  signer: ethers.Signer,
  paymentOption: X402PaymentRequest
): Promise<string> {
  console.log(`💰 Creating x402 payment header`);
  console.log(`   Amount: ${paymentOption.amount} ${paymentOption.asset}`);
  console.log(`   Network: ${paymentOption.network}`);
  console.log(`   Recipient: ${paymentOption.recipient}`);
  
  // Get USDC contract address for the network
  const usdcAddress = getUSDCAddress(paymentOption.network);
  if (!usdcAddress) {
    throw new Error(`USDC not configured for network: ${paymentOption.network}`);
  }

  // Validate addresses
  if (!ethers.isAddress(paymentOption.recipient)) {
    throw new Error(`Invalid recipient address: ${paymentOption.recipient}`);
  }
  
  if (!ethers.isAddress(walletAddress)) {
    throw new Error(`Invalid wallet address: ${walletAddress}`);
  }
  
  // Normalize addresses (no ENS resolution)
  const normalizedRecipient = ethers.getAddress(paymentOption.recipient);
  const normalizedPayer = ethers.getAddress(walletAddress);
  const normalizedUsdcAddress = ethers.getAddress(usdcAddress);
  
  // Determine chain ID
  const chainId = paymentOption.network === "base" ? 8453 : 
                  paymentOption.network === "base-sepolia" ? 84532 : 8453;
  
  // EIP-712 domain - Use EXACT values from middleware's 402 response (extra field)
  // Middleware returns: "extra": { "name": "USD Coin", "version": "2" }
  // We MUST use these exact values for signature verification to work
  const domain = {
    name: paymentOption.extra?.name || "USD Coin",
    version: paymentOption.extra?.version || "2",
    chainId: chainId,
    verifyingContract: normalizedUsdcAddress,
  };
  
  console.log(`📋 EIP-712 Domain:`, domain);

  // EIP-3009 TransferWithAuthorization (USDC official standard)
  // Reference: https://github.com/CoinbaseStablecoin/eip-3009
  const types = {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
  };

  // Payment message - EIP-3009 format
  const validAfter = 0; // Valid immediately
  const validBefore = Math.floor(Date.now() / 1000) + 3600; // Valid for 1 hour
  const nonce = ethers.randomBytes(32); // 32-byte random nonce
  
  const message = {
    from: normalizedPayer,
    to: normalizedRecipient,
    value: paymentOption.amount, // Amount in USDC base units (6 decimals)
    validAfter: validAfter,
    validBefore: validBefore,
    nonce: ethers.hexlify(nonce),
  };
  
  console.log(`📋 Payment message (EIP-3009):`, message);
  console.log(`   From: ${message.from}`);
  console.log(`   To: ${message.to}`);
  console.log(`   Value: ${message.value} (USDC base units)`);
  console.log(`   ValidBefore: ${new Date(validBefore * 1000).toISOString()}`);
  console.log(`   Nonce: ${message.nonce}`);

  // Sign EIP-712 payment commitment
  console.log(`📝 Requesting signature with EIP-3009 TransferWithAuthorization...`);
  const signature = await signer.signTypedData(domain, types, message);
  
  // Create x402 payment header
  const paymentData = {
    ...message,
    signature,
  };
  
  const paymentHeader = JSON.stringify(paymentData);
  
  console.log(`✅ Payment header created`);
  console.log(`   Signature: ${signature.substring(0, 20)}...`);
  console.log(`📤 FULL PAYMENT HEADER (for debugging):`);
  console.log(paymentHeader);
  console.log(`📤 Payment header length: ${paymentHeader.length} chars`);
  
  return paymentHeader;
}

/**
 * Get USDC contract address for a network
 */
function getUSDCAddress(network: string): string | null {
  // Check environment variable first
  if (typeof window !== "undefined") {
    const customAddress = process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS;
    if (customAddress && customAddress.startsWith("0x") && customAddress.length === 42) {
      console.log(`✅ Using custom USDC address: ${customAddress}`);
      return customAddress;
    }
  }
  
  // Base Mainnet USDC (official)
  if (network === "base" || network === "base-mainnet") {
    return "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  }
  
  // Base Sepolia - no official USDC
  if (network === "base-sepolia") {
    console.warn(`⚠️ Base Sepolia has no official USDC`);
    return null;
  }
  
  return null;
}
