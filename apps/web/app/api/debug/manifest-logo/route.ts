/**
 * Debug endpoint to check if manifest logo URLs are accessible
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://xfrora-farcaster-web.vercel.app");

    const logoUrls = {
      froraLogo: `${baseUrl}/frora-logo.png`,
      froraLogoManifest: `${baseUrl}/frora-logo-manifest.png`,
      froraSplash: `${baseUrl}/frora-splash.png`,
      sharingBanner: `${baseUrl}/sharing-banner.png`,
      ogImage: `${baseUrl}/og-xfrora.png`,
    };

    const results: any = {
      baseUrl,
      timestamp: new Date().toISOString(),
      checks: [],
    };

    // Check each logo URL
    for (const [name, url] of Object.entries(logoUrls)) {
      try {
        const response = await fetch(url, { method: 'HEAD' });
        results.checks.push({
          name,
          url,
          status: response.status,
          accessible: response.ok,
          contentType: response.headers.get('content-type'),
          contentLength: response.headers.get('content-length'),
        });
      } catch (error: any) {
        results.checks.push({
          name,
          url,
          status: 'error',
          accessible: false,
          error: error.message,
        });
      }
    }

    // Check manifest endpoint
    try {
      const manifestUrl = `${baseUrl}/.well-known/farcaster.json`;
      const manifestResponse = await fetch(manifestUrl);
      const manifestData = await manifestResponse.json();
      
      results.manifest = {
        url: manifestUrl,
        accessible: manifestResponse.ok,
        iconUrl: manifestData?.miniapp?.iconUrl,
        splashImageUrl: manifestData?.miniapp?.splashImageUrl,
        heroImageUrl: manifestData?.miniapp?.heroImageUrl,
      };
    } catch (error: any) {
      results.manifest = {
        error: error.message,
      };
    }

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json({
      error: "Internal server error",
      message: error.message,
    }, { status: 500 });
  }
}

