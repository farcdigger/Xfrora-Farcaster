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
  let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://xfrora-farcaster-web.vercel.app");
  
  // Ensure baseUrl always has https:// protocol and remove trailing slash
  if (!baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`;
  }
  baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
  
  // Log for debugging (remove in production if needed)
  console.log("🔗 Farcaster manifest base URL:", {
    baseUrl,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  });

  // Extract canonical domain (without protocol)
  const canonicalDomain = baseUrl.replace(/^https?:\/\//, "");

  // Logo URLs - Use Frora logo from public folder
  // Farcaster requires iconUrl to be 512x512 or 1024x1024 PNG
  // Using properly formatted 1024x1024 PNG logo for manifest
  const logoUrl = `${baseUrl}/frora-logo-manifest-1024.png`; // Primary app icon (1024x1024 PNG - Farcaster compliant)
  const splashImageUrl = `${baseUrl}/frora-splash.png`; // Splash screen logo (Frora.jpeg converted to PNG)
  // Use sharing-banner.png if available, fallback to og-xfrora.png
  const sharingBannerUrl = `${baseUrl}/sharing-banner.png`; // Sharing banner for social cards
  const heroImageUrl = sharingBannerUrl; // Hero image (same as sharing banner)
  
  // Log logo URLs for debugging
  console.log("🖼️ Logo URLs:", {
    logoUrl,
    splashImageUrl,
    sharingBannerUrl,
    baseUrl,
    canonicalDomain,
  });
  
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
    // Domain ownership verification signature for Farcaster
    // See: https://docs.farcaster.xyz/miniapps/sharing#domain-verification
    accountAssociation: {
      header: "eyJmaWQiOjI1MTYxOSwidHlwZSI6ImF1dGgiLCJrZXkiOiIweDk3Njc1RjAzRDY1RkFCNzM3MWZhMkJlQjNkYkY5YzY4NDJjOGQ1MjUifQ",
      payload: "eyJkb21haW4iOiJ4ZnJvcmEtZmFyY2FzdGVyLXdlYi52ZXJjZWwuYXBwIn0",
      signature: "icCQq88CLuv68KkTwZySK/iCjXdwdgOVfejhii7cBx1xXvc0HbMvpj0R0hP0y2ghL8cYxLus9UzhbMC2MPYHihw="
    }
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}

