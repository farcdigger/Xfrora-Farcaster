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
  // CRITICAL FIX per user guidance:
  // - Hex strings (0x...) MUST be converted to BigInt
  // - Decimal strings/numbers can stay as strings/numbers
  // - Mixing BigInt with strings/numbers causes "Cannot mix BigInt" error
  // Solution: Only convert hex strings to BigInt, keep others as strings/numbers
  
  // xUserId is a hex string (0x...) from ethers.id() - MUST convert to BigInt
  let xUserIdValue: bigint | string | number;
  try {
    if (auth.xUserId.startsWith('0x')) {
      // Hex string - MUST convert to BigInt per user guidance
      // BigInt() constructor accepts hex strings (0x...) directly
      xUserIdValue = BigInt(auth.xUserId);
    } else {
      // Already a decimal string - keep as string (ethers.js handles it)
      xUserIdValue = auth.xUserId;
    }
  } catch (convertError: any) {
    throw new Error(`Failed to convert xUserId: ${convertError.message}`);
  }
  
  // nonce and deadline are numbers - keep as numbers or strings
  // DO NOT convert to BigInt - this causes mixing errors
  // ethers.js will handle number/string → BigInt conversion internally
  const eip712Auth = {
    to: auth.to,
    payer: auth.payer,
    xUserId: xUserIdValue, // BigInt (if hex) or string (if decimal)
    tokenURI: auth.tokenURI,
    nonce: auth.nonce, // Number - ethers.js will convert internally
    deadline: auth.deadline, // Number - ethers.js will convert internally
  };
  
  console.log("EIP-712 Auth values (xUserId as BigInt, others as number):", {
    to: eip712Auth.to,
    payer: eip712Auth.payer,
    xUserId: typeof eip712Auth.xUserId === 'bigint' 
      ? eip712Auth.xUserId.toString() 
      : eip712Auth.xUserId,
    xUserIdType: typeof eip712Auth.xUserId,
    xUserIdIsBigInt: typeof eip712Auth.xUserId === 'bigint',
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
  // Hex strings → BigInt, others stay as numbers/strings
  
  let xUserIdValue: bigint | string | number;
  try {
    if (auth.xUserId.startsWith('0x')) {
      // Hex string - convert to BigInt
      xUserIdValue = BigInt(auth.xUserId);
    } else {
      // Decimal string - keep as string
      xUserIdValue = auth.xUserId;
    }
  } catch (convertError: any) {
    throw new Error(`Failed to convert xUserId: ${convertError.message}`);
  }
  
  const eip712Auth = {
    to: auth.to,
    payer: auth.payer,
    xUserId: xUserIdValue, // BigInt (if hex) or string (if decimal)
    tokenURI: auth.tokenURI,
    nonce: auth.nonce, // Number - ethers.js will convert internally
    deadline: auth.deadline, // Number - ethers.js will convert internally
  };
  
  const recovered = ethers.verifyTypedData(
    EIP712_DOMAIN,
    { MintAuth: EIP712_TYPES.MintAuth },
    eip712Auth,
    signature
  );
  return recovered;
}

