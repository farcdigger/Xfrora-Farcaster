import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://xfroranft.xyz";

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
    "fc:miniapp": baseUrl,
    "fc:miniapp:version": "1.0.0",
    "fc:miniapp:image": `${baseUrl}/og-xfrora.png`,
    "fc:miniapp:button": "Generate NFT",
    "fc:miniapp:action": baseUrl,
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

