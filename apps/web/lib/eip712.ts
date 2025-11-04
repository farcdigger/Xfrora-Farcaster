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
  // SOLUTION: xUserId is stored as hex string (0x...) in database/flow
  // EIP-712 signer expects uint256 as BigInt or decimal string, NOT hex string
  // Convert hex string to BigInt right before signing (BigInt constructor accepts 0x... strings)
  
  // xUserId is a hex string (0x...) from ethers.id() - convert to BigInt for EIP-712
  // BigInt() constructor accepts hex strings (0x...) directly - no need for manual conversion
  const xUserIdBigInt = BigInt(auth.xUserId);
  
  // nonce and deadline are numbers - ethers.js will handle conversion internally
  const eip712Auth = {
    to: auth.to,
    payer: auth.payer,
    xUserId: xUserIdBigInt, // BigInt - converted from hex string (0x...)
    tokenURI: auth.tokenURI,
    nonce: auth.nonce, // Number - ethers.js converts internally
    deadline: auth.deadline, // Number - ethers.js converts internally
  };
  
  console.log("EIP-712 Auth values (xUserId as BigInt from hex string):", {
    to: eip712Auth.to,
    payer: eip712Auth.payer,
    xUserId: eip712Auth.xUserId.toString(),
    xUserIdHex: `0x${eip712Auth.xUserId.toString(16)}`,
    xUserIdType: typeof eip712Auth.xUserId,
    originalHex: auth.xUserId,
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
  // xUserId is hex string (0x...) - convert to BigInt for EIP-712 verification
  
  const xUserIdBigInt = BigInt(auth.xUserId);
  
  const eip712Auth = {
    to: auth.to,
    payer: auth.payer,
    xUserId: xUserIdBigInt, // BigInt - converted from hex string (0x...)
    tokenURI: auth.tokenURI,
    nonce: auth.nonce, // Number - ethers.js converts internally
    deadline: auth.deadline, // Number - ethers.js converts internally
  };
  
  const recovered = ethers.verifyTypedData(
    EIP712_DOMAIN,
    { MintAuth: EIP712_TYPES.MintAuth },
    eip712Auth,
    signature
  );
  return recovered;
}

