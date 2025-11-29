import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware to remove X-Frame-Options header and allow iframe embedding
 * for Farcaster Mini Apps.
 * 
 * Farcaster Mini Apps run in iframes, so we need to:
 * 1. Remove X-Frame-Options DENY header (if set by default)
 * 2. Ensure CSP frame-ancestors allows Farcaster domains
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Remove X-Frame-Options header if it exists
  // This allows Farcaster clients to embed the app in iframes
  response.headers.delete("X-Frame-Options");

  // Ensure CSP allows frame ancestors for Farcaster
  // Note: CSP is set in next.config.js, but we can override here if needed
  const existingCSP = response.headers.get("Content-Security-Policy");
  if (!existingCSP || !existingCSP.includes("frame-ancestors")) {
    response.headers.set(
      "Content-Security-Policy",
      "frame-ancestors 'self' https://*.warpcast.com https://*.farcaster.xyz *;"
    );
  }

  return response;
}

// Apply middleware to all routes
export const config = {
  matcher: "/:path*",
};

