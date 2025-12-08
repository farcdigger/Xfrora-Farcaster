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
  // Get base URL from environment or use production URL as fallback
  // Priority: NEXT_PUBLIC_BASE_URL > Production URL
  // Note: We don't use VERCEL_URL as it can be a preview URL (xfrora-farcaster-i89dcxi73-...)
  // Instead, we always use the production URL: xfrora-farcaster-web.vercel.app
  const PRODUCTION_URL = "https://xfrora-farcaster-web.vercel.app";
  let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || PRODUCTION_URL;
  
  // Ensure baseUrl always has https:// protocol and remove trailing slash
  if (!baseUrl.startsWith("http")) {
    baseUrl = `https://${baseUrl}`;
  }
  baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
  
  // Force production URL to avoid preview/deployment URLs
  // Only use custom NEXT_PUBLIC_BASE_URL if explicitly set, otherwise use production
  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    baseUrl = PRODUCTION_URL;
  }
  
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
  // Using optimized 512x512 PNG logo for manifest (smaller file size, faster loading)
  const logoUrl = `${baseUrl}/frora-logo-512.png`; // Primary app icon (512x512 PNG - Farcaster compliant, optimized size)
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
      description: "Generate unique NFTs from your Farcaster profile",
      tagline: "Your Farcaster AI twin",
      primaryCategory: "Art",
      tags: ["nft", "base", "ai", "avatar", "identity"],
      heroImageUrl: heroImageUrl,
      ogTitle: "xFrora",
      ogDescription: "AI-crafted identity NFTs.",
      ogImageUrl: sharingBannerUrl,
      noindex: true,
      screenshotUrls: [sharingBannerUrl],
      canonicalDomain: canonicalDomain,
      requiredChains: ["eip155:8453"], // Base Mainnet (chain ID: 8453)
      requiredCapabilities: ["actions.signIn", "wallet.getEthereumProvider"],
      castShareUrl: `${baseUrl}/share`, // Enable share extensions - allows users to share casts to this Mini App
    },

    // Account Association (Domain Verification)
    // Domain ownership verification signature for Farcaster
    // See: https://docs.farcaster.xyz/miniapps/sharing#domain-verification
    accountAssociation: {
      header:
        "eyJmaWQiOjI1MTYxOSwidHlwZSI6ImF1dGgiLCJrZXkiOiIweDk3Njc1RjAzRDY1RkFCNzM3MWZhMkJlQjNkYkY5YzY4NDJjOGQ1MjUifQ",
      payload:
        "eyJkb21haW4iOiJ4ZnJvcmEtZmFyY2FzdGVyLXdlYi52ZXJjZWwuYXBwIn0",
      signature:
        "icCQq88CLuv68KkTwZySK/iCjXdwdgOVfejhii7cBx1xXvc0HbMvpj0R0hP0y2ghL8cYxLus9UzhbMC2MPYHihw=",
    },

    // Base App / Base Builder doğrulaması
    baseBuilder: {
      ownerAddress: "0xcF1B5d6CD8e0bfd6B1a8B2c2ceAb0bc165EEE5B3",
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}
