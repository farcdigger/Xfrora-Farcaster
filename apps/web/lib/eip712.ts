import { ethers } from "ethers";
import type { MintAuth } from "@/lib/types";
import { env } from "../env.mjs";

function getEIP712DomainValue() {
  return {
    name: "X Animal NFT",
    version: "1",
    chainId: Number(env.NEXT_PUBLIC_CHAIN_ID), // Ensure it's a number, not BigInt
    verifyingContract: env.CONTRACT_ADDRESS,
  };
}

const EIP712_DOMAIN = getEIP712DomainValue();

const EIP712_TYPES = {
  MintAuth: [
    { name: "to", type: "address" },
    { name: "payer", type: "address" },
    { name: "xUserId", type: "uint256" },
    { name: "tokenURI", type: "string" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

export function getEIP712Domain() {
  return EIP712_DOMAIN;
}

export function getEIP712Types() {
  return EIP712_TYPES;
}

export async function signMintAuth(auth: MintAuth): Promise<string> {
  if (!env.SERVER_SIGNER_PRIVATE_KEY) {
    throw new Error("SERVER_SIGNER_PRIVATE_KEY not configured");
  }
  
  const signer = new ethers.Wallet(env.SERVER_SIGNER_PRIVATE_KEY);
  
  // Convert values to proper types for EIP-712 uint256
  // CRITICAL FIX: ethers.js v6 signTypedData has issues with BigInt mixing
  // The safest approach: Convert ALL uint256 values to decimal strings
  // ethers.js will handle string-to-BigInt conversion internally without mixing issues
  
  // xUserId is a hex string (0x...) from ethers.id() - convert to decimal string
  // Step 1: Hex string → BigInt (temporary, for conversion only)
  // Step 2: BigInt → Decimal string (final format for EIP-712)
  let xUserIdDecimal: string;
  try {
    if (auth.xUserId.startsWith('0x')) {
      // Hex string - convert to BigInt first (for proper conversion)
      const tempBigInt = BigInt(auth.xUserId);
      // Then convert BigInt to decimal string (this is what ethers.js expects)
      xUserIdDecimal = tempBigInt.toString(10); // Explicitly use base 10
    } else {
      // Already a decimal string
      xUserIdDecimal = auth.xUserId;
    }
  } catch (convertError: any) {
    throw new Error(`Failed to convert xUserId to decimal string: ${convertError.message}`);
  }
  
  // nonce and deadline are numbers - convert to decimal strings
  // This ensures ALL uint256 values are decimal strings (no BigInt mixing!)
  const eip712Auth = {
    to: auth.to,
    payer: auth.payer,
    xUserId: xUserIdDecimal, // Decimal string - ethers.js will convert internally
    tokenURI: auth.tokenURI,
    nonce: String(auth.nonce), // Decimal string - converted from number
    deadline: String(auth.deadline), // Decimal string - converted from number
  };
  
  console.log("EIP-712 Auth values (all decimal strings for uint256):", {
    to: eip712Auth.to,
    payer: eip712Auth.payer,
    xUserId: eip712Auth.xUserId,
    xUserIdType: typeof eip712Auth.xUserId,
    xUserIdLength: eip712Auth.xUserId.length,
    xUserIdPreview: eip712Auth.xUserId.substring(0, 20) + "...",
    nonce: eip712Auth.nonce,
    nonceType: typeof eip712Auth.nonce,
    deadline: eip712Auth.deadline,
    deadlineType: typeof eip712Auth.deadline,
  });
  
  try {
    // Ensure domain chainId is a number (not BigInt)
    const domain = {
      ...EIP712_DOMAIN,
      chainId: Number(EIP712_DOMAIN.chainId), // Explicitly convert to number
    };
    
    console.log("EIP-712 Domain:", {
      name: domain.name,
      version: domain.version,
      chainId: domain.chainId,
      chainIdType: typeof domain.chainId,
      verifyingContract: domain.verifyingContract,
    });
    
    const signature = await signer.signTypedData(
      domain,
      { MintAuth: EIP712_TYPES.MintAuth },
      eip712Auth
    );
    
    return signature;
  } catch (error: any) {
    console.error("EIP-712 signing error:", {
      error: error.message,
      errorStack: error.stack,
      domain: EIP712_DOMAIN,
      auth: eip712Auth,
      originalAuth: auth,
      types: EIP712_TYPES.MintAuth,
      // Log all values as strings for debugging
      debugValues: {
        xUserId: eip712Auth.xUserId.toString(),
        nonce: eip712Auth.nonce.toString(),
        deadline: eip712Auth.deadline.toString(),
      },
    });
    throw new Error(`Failed to sign mint auth: ${error.message}`);
  }
}

export function verifyMintAuth(auth: MintAuth, signature: string): string {
  // Convert values for verification (same as signing)
  // ALL uint256 values must be decimal strings to avoid type mixing
  
  let xUserIdDecimal: string;
  try {
    if (auth.xUserId.startsWith('0x')) {
      // Hex string - convert to BigInt first, then to decimal string
      const tempBigInt = BigInt(auth.xUserId);
      xUserIdDecimal = tempBigInt.toString(10); // Explicitly use base 10
    } else {
      // Already a decimal string
      xUserIdDecimal = auth.xUserId;
    }
  } catch (convertError: any) {
    throw new Error(`Failed to convert xUserId to decimal string: ${convertError.message}`);
  }
  
  const eip712Auth = {
    to: auth.to,
    payer: auth.payer,
    xUserId: xUserIdDecimal, // Decimal string - converted from hex string via BigInt
    tokenURI: auth.tokenURI,
    nonce: String(auth.nonce), // Decimal string - converted from number
    deadline: String(auth.deadline), // Decimal string - converted from number
  };
  
  const recovered = ethers.verifyTypedData(
    EIP712_DOMAIN,
    { MintAuth: EIP712_TYPES.MintAuth },
    eip712Auth,
    signature
  );
  return recovered;
}

