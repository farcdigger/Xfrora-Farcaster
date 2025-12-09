import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://xfrora-farcaster-web.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "xFrora - Farcaster Profile NFTs",
  description: "AI-crafted identity collection on Base",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "xFrora - Farcaster Profile NFTs",
    description: "AI-crafted identity collection on Base",
    url: baseUrl,
    siteName: "xFrora",
    images: [
      {
        url: "/og-xfrora.png",
        width: 1200,
        height: 630,
        alt: "xFrora - AI-crafted identity collection on Base",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "xFrora - Farcaster Profile NFTs",
    description: "AI-crafted identity collection on Base",
    images: ["/og-xfrora.png"],
  },
  other: {
    // Farcaster Mini App Embed - Makes this page shareable as a rich card
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: `${baseUrl}/og-xfrora.png`,
      button: {
        title: "Generate NFT",
        action: {
          type: "launch_miniapp",
          name: "xFrora",
          url: baseUrl,
          splashImageUrl: `${baseUrl}/frora-splash.png`,
          splashBackgroundColor: "#000000",
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

