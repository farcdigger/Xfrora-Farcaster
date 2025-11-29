import { NextResponse } from "next/server";

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

  // Extract canonical domain (without protocol)
  const canonicalDomain = baseUrl.replace(/^https?:\/\//, "");

  // Logo URLs - Use Frora logo from public folder
  const logoUrl = `${baseUrl}/frora-logo-manifest.png`; // Custom manifest logo
  const splashImageUrl = `${baseUrl}/frora-splash.png`; // Splash screen logo (Frora.jpeg)
  // Use sharing-banner.png if available, fallback to og-xfrora.png
  const sharingBannerUrl = `${baseUrl}/sharing-banner.png`; // Sharing banner for social cards
  const heroImageUrl = sharingBannerUrl; // Hero image (same as sharing banner)
  
  // Splash screen and theme colors - matching site aesthetic
  // Black/white contrast with purple accents for premium, modern look
  const splashBackgroundColor = "#000000"; // Pure black background - matches dark theme
  const themeColor = "#8B5CF6"; // Vibrant purple (#8B5CF6) - matches cyberpunk/futuristic vibe

  const manifest = {
    miniapp: {
      version: "1",
      name: "xFrora",
      iconUrl: logoUrl,
      homeUrl: baseUrl,
      splashImageUrl: splashImageUrl,
      splashBackgroundColor: splashBackgroundColor,
      themeColor: themeColor,
      subtitle: "AI-generated identity avatars",
      description: "Generate unique NFTs from your Farcaster profile and chat with your AI-powered identity.",
      tagline: "Your Farcaster AI twin",
      primaryCategory: "art-creativity",
      tags: ["nft", "base", "ai", "avatar", "identity"],
      heroImageUrl: heroImageUrl,
      ogTitle: "xFrora",
      ogDescription: "AI-crafted identity NFTs. Chat with your digital twin.",
      ogImageUrl: sharingBannerUrl,
      screenshotUrls: [
        sharingBannerUrl
      ],
      canonicalDomain: canonicalDomain,
      requiredChains: ["eip155:8453"], // Base Mainnet (chain ID: 8453)
      requiredCapabilities: [
        "actions.signIn",
        "wallet.getEthereumProvider"
      ]
    },
    
    // Account Association (Domain Verification)
    // Note: accountAssociation requires domain verification signature
    // This should be generated using Farcaster's domain verification tool
    // See: https://docs.farcaster.xyz/miniapps/sharing#domain-verification
    accountAssociation: {
      // This will be populated with actual signature during domain verification
      // Format: { "account": "your-account", "signature": "..." }
      // For now, left empty until domain verification is completed
    }
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}

