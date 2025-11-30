"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sdk } from "@farcaster/miniapp-sdk";
import YamaAgentWebOnlyModal from "@/components/YamaAgentWebOnlyModal";

interface YamaAgentRedirectProps {
  children: React.ReactNode;
}

export default function YamaAgentRedirect({ children }: YamaAgentRedirectProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [isInMiniApp, setIsInMiniApp] = useState<boolean | null>(null);

  useEffect(() => {
    const checkMiniApp = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        setIsInMiniApp(inMiniApp);
        if (inMiniApp) {
          // In Mini App - show modal instead of page content
          setShowModal(true);
        }
        // Not in Mini App - allow page to render normally
      } catch (error) {
        console.error("Error checking Mini App status:", error);
        // On error, allow page to render (assume not in Mini App)
        setIsInMiniApp(false);
      }
    };

    checkMiniApp();
  }, []);

  // If in Mini App, show modal and hide page content
  if (isInMiniApp === true && showModal) {
    return (
      <>
        <YamaAgentWebOnlyModal
          onClose={() => {
            setShowModal(false);
            router.push("/");
          }}
        />
        {/* Hide page content when in Mini App */}
        <div style={{ display: 'none' }}>
          {children}
        </div>
      </>
    );
  }

  // Not in Mini App or still checking - render page content normally
  return <>{children}</>;
}

