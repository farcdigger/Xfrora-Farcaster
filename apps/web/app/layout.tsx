import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://xfrora-farcaster-web.vercel.app";

export async function generateMetadata(): Promise<Metadata> {
  return {
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
      // This metadata is used to generate rich embeds when the app is shared
      // Required for Base App to recognize this as a Mini App instead of a regular website
      // Format must match Base App documentation exactly
      "fc:miniapp": JSON.stringify({
        version: "next",
        imageUrl: `${baseUrl}/image.png`,
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
}

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

