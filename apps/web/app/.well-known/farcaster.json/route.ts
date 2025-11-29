import { NextResponse } from "next/server";
import { env } from "@/env.mjs";

/**
 * Farcaster Mini App Manifest
 * 
 * This manifest identifies and configures the Mini App at the domain level.
 * It tells Farcaster clients "this domain is a Mini App."
 * 
 * Required fields:
 * - name: App name
 * - iconUrl: App icon URL (512x512 or 1024x1024 PNG recommended)
 * - homeUrl: Home page URL
 * - version: Manifest version (currently "1.0.0")
 * - accountAssociation: Domain verification signature
 * 
 * Optional fields:
 * - description: App description
 * - splashImageUrl: Splash screen image (shown while app loads)
 * - splashBackgroundColor: Splash screen background color (hex)
 * - themeColor: Theme color for the app (hex)
 * - webhookUrl: For push notifications
 * - permissions: Requested permissions
 */

export async function GET() {
  // Get base URL from environment or use Vercel URL as fallback
  // Priority: NEXT_PUBLIC_BASE_URL > VERCEL_URL > Default Vercel URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://xfrora-farcaster-web.vercel.app");
  
  // Log for debugging (remove in production if needed)
  console.log("🔗 Farcaster manifest base URL:", {
    baseUrl,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  });

  // Logo URLs - Use Frora logo from public folder
  const logoUrl = `${baseUrl}/frora-logo-manifest.png`; // Custom manifest logo
  const splashImageUrl = `${baseUrl}/frora-splash.png`; // Splash screen logo (Frora.jpeg)
  
  // Splash screen and theme colors - matching site aesthetic
  // Black/white contrast with purple accents for premium, modern look
  const splashBackgroundColor = "#000000"; // Pure black background - matches dark theme
  const themeColor = "#8B5CF6"; // Vibrant purple (#8B5CF6) - matches cyberpunk/futuristic vibe
  const accentColor = "#6366F1"; // Indigo accent for variety

  const manifest = {
    version: "1.0.0",
    name: "xFrora",
    description: "AI-crafted identity collection on Base. Generate unique NFTs from your Farcaster profile, chat with your digital avatar, and join the xFrora community. Each NFT is a one-of-a-kind creation powered by AI.",
    iconUrl: logoUrl, // Primary app icon (512x512+ PNG recommended)
    homeUrl: `${baseUrl}`,
    
    // Splash Screen Configuration
    // Defines the loading screen appearance in Farcaster clients
    // Black background with Frora logo creates a premium, branded experience
    splashImageUrl: splashImageUrl, // Frora logo/image displayed during app load
    splashBackgroundColor: splashBackgroundColor, // Black background for premium look
    
    // Theme Configuration
    themeColor: themeColor, // Purple accent color (#8B5CF6) - matches site's cyberpunk aesthetic
    
    // Account Association (Domain Verification)
    // Note: accountAssociation requires domain verification signature
    // This should be generated using Farcaster's domain verification tool
    // See: https://docs.farcaster.xyz/miniapps/sharing#domain-verification
    accountAssociation: {
      // This will be populated with actual signature during domain verification
      // Format: { "account": "your-account", "signature": "..." }
      // For now, left empty until domain verification is completed
    },
    
    // Optional: Webhook URL for push notifications
    // Uncomment when implementing notifications
    // webhookUrl: `${baseUrl}/api/webhooks/farcaster`,
    
    // Optional: Requested permissions
    // Uncomment when needing specific permissions
    // permissions: ["notifications"],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}

