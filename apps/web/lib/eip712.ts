import { ethers } from "ethers";
import type { MintAuth } from "@/lib/types";
import { env } from "../env.mjs";

function getEIP712DomainValue() {
  return {
    name: "X Animal NFT",
    version: "1",
    chainId: parseInt(env.NEXT_PUBLIC_CHAIN_ID),
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
  // CRITICAL FIX: EIP-712 uint256 accepts:
  // 1. BigInt (e.g., 12345n)
  // 2. Decimal string (e.g., "12345")
  // 3. Number (for small values)
  // 
  // PROBLEM: Hex strings (0x...) are NOT accepted directly for uint256
  // Solution: Convert hex string to BigInt, keep decimal strings as strings
  
  // xUserId is a hex string (0x...) from ethers.id() - must convert to BigInt
  let xUserIdValue: bigint;
  try {
    if (auth.xUserId.startsWith('0x')) {
      // Hex string - convert to BigInt using JavaScript's BigInt constructor
      // BigInt() can directly accept hex strings (0x...)
      xUserIdValue = BigInt(auth.xUserId);
    } else {
      // Already a decimal string - convert to BigInt
      xUserIdValue = BigInt(auth.xUserId);
    }
  } catch (convertError: any) {
    throw new Error(`Failed to convert xUserId to BigInt: ${convertError.message}`);
  }
  
  // nonce and deadline are numbers - convert to decimal strings (NOT hex!)
  // Decimal strings are accepted for uint256 in EIP-712
  const eip712Auth = {
    to: auth.to,
    payer: auth.payer,
    xUserId: xUserIdValue, // BigInt - converted from hex string
    tokenURI: auth.tokenURI,
    nonce: String(auth.nonce), // Decimal string - converted from number
    deadline: String(auth.deadline), // Decimal string - converted from number
  };
  
  console.log("EIP-712 Auth values (all strings for uint256):", {
    to: eip712Auth.to,
    payer: eip712Auth.payer,
    xUserId: eip712Auth.xUserId,
    xUserIdType: typeof eip712Auth.xUserId,
    nonce: eip712Auth.nonce,
    nonceType: typeof eip712Auth.nonce,
    deadline: eip712Auth.deadline,
    deadlineType: typeof eip712Auth.deadline,
  });
  
  try {
    const signature = await signer.signTypedData(
      EIP712_DOMAIN,
      { MintAuth: EIP712_TYPES.MintAuth },
      eip712Auth
    );
    
    return signature;
  } catch (error: any) {
    console.error("EIP-712 signing error:", {
      error: error.message,
      errorStack: error.stack,
      auth: eip712Auth,
      originalAuth: auth,
      types: EIP712_TYPES.MintAuth,
    });
    throw new Error(`Failed to sign mint auth: ${error.message}`);
  }
}

export function verifyMintAuth(auth: MintAuth, signature: string): string {
  // Convert values for verification (same as signing)
  // xUserId: hex string → BigInt
  // nonce/deadline: number → decimal string
  
  let xUserIdValue: bigint;
  try {
    if (auth.xUserId.startsWith('0x')) {
      // Hex string - convert to BigInt
      xUserIdValue = BigInt(auth.xUserId);
    } else {
      // Decimal string - convert to BigInt
      xUserIdValue = BigInt(auth.xUserId);
    }
  } catch (convertError: any) {
    throw new Error(`Failed to convert xUserId to BigInt: ${convertError.message}`);
  }
  
  const eip712Auth = {
    to: auth.to,
    payer: auth.payer,
    xUserId: xUserIdValue, // BigInt - converted from hex string
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

