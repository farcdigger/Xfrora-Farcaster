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
  // ethers.js v6 signTypedData can handle number, string, or BigInt for uint256
  // To avoid BigInt mixing issues, we use ethers utilities to convert values
  // IMPORTANT: Use ethers.getBytes() and ethers.toBigInt() for consistent conversion
  
  let xUserIdValue: string | number | bigint;
  try {
    // Convert hex string (0x...) to decimal string for uint256
    // ethers.id() returns hex string (0x...), convert using ethers utilities
    if (auth.xUserId.startsWith('0x')) {
      // Use ethers.toBigInt() to convert hex string to BigInt, then to string
      // This ensures proper conversion without type mixing
      const bigIntValue = ethers.toBigInt(auth.xUserId);
      xUserIdValue = bigIntValue.toString(); // Convert BigInt to decimal string
    } else {
      // Already a decimal string
      xUserIdValue = auth.xUserId;
    }
  } catch (convertError: any) {
    throw new Error(`Failed to convert xUserId to uint256: ${convertError.message}`);
  }
  
  // Convert nonce and deadline to strings as well
  // Use explicit String() conversion to avoid BigInt mixing
  const eip712Auth = {
    to: auth.to,
    payer: auth.payer,
    xUserId: xUserIdValue, // Decimal string for uint256
    tokenURI: auth.tokenURI,
    nonce: String(auth.nonce), // Convert number to string for uint256
    deadline: String(auth.deadline), // Convert number to string for uint256
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
  // Convert values to strings for verification (same as signing)
  let xUserIdValue: string;
  try {
    if (auth.xUserId.startsWith('0x')) {
      // Use ethers.toBigInt() for consistent conversion
      const bigIntValue = ethers.toBigInt(auth.xUserId);
      xUserIdValue = bigIntValue.toString();
    } else {
      xUserIdValue = auth.xUserId;
    }
  } catch (convertError: any) {
    throw new Error(`Failed to convert xUserId to uint256 string: ${convertError.message}`);
  }
  
  const eip712Auth = {
    to: auth.to,
    payer: auth.payer,
    xUserId: xUserIdValue,
    tokenURI: auth.tokenURI,
    nonce: String(auth.nonce),
    deadline: String(auth.deadline),
  };
  
  const recovered = ethers.verifyTypedData(
    EIP712_DOMAIN,
    { MintAuth: EIP712_TYPES.MintAuth },
    eip712Auth,
    signature
  );
  return recovered;
}

