// Shared types for EIP-712 and traits

export interface MintAuth {
  to: string;
  payer: string;
  xUserId: string; // Contract uses xUserId (hash of farcaster fid)
  tokenURI: string;
  nonce: number;
  deadline: number;
}

export type Traits = {
  description: string; // Resmin genel bir açıklaması
  main_colors: string[]; // Resimdeki baskın renkler (en fazla 3)
  style: string; // Resmin stili (örn: 'cartoon', 'photographic', 'anime', 'text logo')
  accessory: string; // Belirgin bir aksesuar (örn: 'glasses', 'hat', 'none')
};

export interface FarcasterUser {
  fid: string; // Farcaster ID
  username: string;
  display_name?: string;
  pfp_url: string; // Profile picture URL
  bio?: string; // Profile bio/description
}

export interface GenerateRequest {
  farcaster_user_id: string; // Farcaster user ID (fid)
  profile_image_url: string;
  wallet_address?: string; // Optional: wallet address to save in users table
  username?: string; // Optional: username for better AI analysis
  bio?: string; // Optional: profile bio for better AI analysis
}

export interface GenerateResponse {
  seed: string;
  traits: Traits;
  imageUrl: string;
  metadataUrl: string;
  preview?: string; // Base64 encoded image for immediate preview
  alreadyExists?: boolean; // True if NFT was already generated for this user
  message?: string; // Optional message (e.g., "NFT already generated for this user")
}

export interface MintPermitRequest {
  wallet: string;
  farcaster_user_id: string; // Farcaster user ID (fid)
}

export interface MintPermitResponse {
  auth: MintAuth;
  signature: string;
}
