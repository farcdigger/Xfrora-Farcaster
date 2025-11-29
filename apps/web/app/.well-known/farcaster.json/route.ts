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
 * - iconUrl: App icon URL
 * - homeUrl: Home page URL
 * - version: Manifest version (currently "1.0.0")
 * - accountAssociation: Domain verification signature
 * 
 * Optional fields:
 * - webhookUrl: For push notifications
 * - permissions: Requested permissions
 */

export async function GET() {
  // Get base URL from environment or use default
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://xfroranft.xyz");

  const manifest = {
    version: "1.0.0",
    name: "xFrora",
    iconUrl: `${baseUrl}/favicon.png`,
    homeUrl: `${baseUrl}`,
    // Note: accountAssociation requires domain verification signature
    // This should be generated using Farcaster's domain verification tool
    // For now, we'll include a placeholder structure
    accountAssociation: {
      // This will be populated with actual signature during domain verification
      // See: https://docs.farcaster.xyz/miniapps/sharing#domain-verification
    },
    // Optional: Webhook URL for push notifications
    // webhookUrl: `${baseUrl}/api/webhooks/farcaster`,
    // Optional: Requested permissions
    // permissions: ["notifications"],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}

