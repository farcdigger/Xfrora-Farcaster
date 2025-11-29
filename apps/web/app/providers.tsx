"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { ReactNode, useState, useMemo, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getDefaultConfig,
  RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { env } from "@/env.mjs";
import { base } from "wagmi/chains";
import { WagmiProvider, createConfig, http } from "wagmi";
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";
import { ThemeProvider } from "@/components/ThemeProvider";
import { sdk } from "@farcaster/miniapp-sdk";

const projectId = env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId || projectId === "demo") {
  console.warn(
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not configured. RainbowKit will not be able to connect to wallets in production."
  );
}

// Helper function to create Wagmi config
function createWagmiConfig() {
  // Check if running inside Farcaster Mini App using SDK
  const isMiniApp = typeof window !== "undefined" && sdk.isInMiniApp();
  
  if (isMiniApp) {
    // Use Farcaster Mini App connector for seamless wallet integration
    console.log("🔗 Using Farcaster Mini App wallet connector");
    return createConfig({
      chains: [base],
      transports: {
        [base.id]: http(),
      },
      connectors: [
        miniAppConnector(),
      ],
      ssr: true,
    });
  }
  
  // Fallback to RainbowKit for regular browsers
  console.log("🔗 Using RainbowKit wallet connector");
  return getDefaultConfig({
    appName: "xFrora",
    projectId: projectId || "demo",
    chains: [base],
    ssr: true,
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  
  // Create config dynamically based on environment
  const wagmiConfig = useMemo(() => createWagmiConfig(), []);
  
  // Check if we should show RainbowKit (only in regular browsers, not in Mini App)
  // Use a simpler check - the connector handles Mini App detection
  const [isMiniApp, setIsMiniApp] = useState(false);
  
  useEffect(() => {
    const checkMiniApp = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        setIsMiniApp(inMiniApp);
      } catch {
        setIsMiniApp(false);
      }
    };
    checkMiniApp();
  }, []);
  
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={client}>
        {isMiniApp ? (
          // In Mini App, wallet is automatically connected - no need for RainbowKit UI
          <ThemeProvider>{children}</ThemeProvider>
        ) : (
          // In regular browser, use RainbowKit for wallet selection
          <RainbowKitProvider modalSize="compact">
            <ThemeProvider>{children}</ThemeProvider>
          </RainbowKitProvider>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

