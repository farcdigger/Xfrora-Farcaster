import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://xfroranft.xyz"),
  title: "xFrora - X Profile NFTs",
  description: "AI-crafted identity collection on Base",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "xFrora - X Profile NFTs",
    description: "AI-crafted identity collection on Base",
    url: "https://xfroranft.xyz",
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
    title: "xFrora - X Profile NFTs",
    description: "AI-crafted identity collection on Base",
    images: ["/og-xfrora.png"],
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

