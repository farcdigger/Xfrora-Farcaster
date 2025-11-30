"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { sdk } from "@farcaster/miniapp-sdk";
import Link from "next/link";

function SharePageContent() {
  const searchParams = useSearchParams();
  const [castData, setCastData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCastData = async () => {
      try {
        // Get cast data from URL parameters (available immediately)
        const castHash = searchParams?.get("castHash");
        const castFid = searchParams?.get("castFid");
        const viewerFid = searchParams?.get("viewerFid");

        // Get enriched cast data from SDK context (available after initialization)
        let enrichedCast = null;
        try {
          const context = await sdk.context;
          if (context?.location?.type === "cast_share") {
            enrichedCast = context.location.cast;
            console.log("✅ Enriched cast data from SDK:", enrichedCast);
          }
        } catch (sdkError) {
          console.log("ℹ️ SDK context not available (may be outside Farcaster client)");
        }

        // Combine URL params and SDK data
        const combinedData = {
          hash: castHash || enrichedCast?.hash,
          authorFid: castFid || enrichedCast?.author?.fid,
          viewerFid: viewerFid,
          author: enrichedCast?.author || {
            fid: castFid ? parseInt(castFid) : null,
          },
          text: enrichedCast?.text,
          timestamp: enrichedCast?.timestamp,
          embeds: enrichedCast?.embeds,
          channelKey: enrichedCast?.channelKey,
        };

        setCastData(combinedData);
        console.log("📥 Shared cast data:", combinedData);
      } catch (error) {
        console.error("❌ Error loading cast data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCastData();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-black dark:text-white text-xl">Loading cast...</div>
      </div>
    );
  }

  if (!castData || !castData.hash) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-black dark:text-white mb-4">
            No Cast Shared
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This page is designed to receive shared casts from Farcaster.
            Share a cast to this Mini App to see it here.
          </p>
          <Link
            href="/"
            className="btn-primary inline-block"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-6">
            Shared Cast
          </h1>

          <div className="card mb-6">
            {castData.author && (
              <div className="flex items-center gap-3 mb-4">
                {castData.author.pfpUrl && (
                  <img
                    src={castData.author.pfpUrl}
                    alt={castData.author.username || "Author"}
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <p className="font-semibold text-black dark:text-white">
                    {castData.author.displayName || `@${castData.author.username}` || `FID ${castData.author.fid}`}
                  </p>
                  {castData.author.username && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      @{castData.author.username}
                    </p>
                  )}
                </div>
              </div>
            )}

            {castData.text && (
              <p className="text-black dark:text-white mb-4 whitespace-pre-wrap">
                {castData.text}
              </p>
            )}

            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
              <p>Cast Hash: <code className="text-xs">{castData.hash}</code></p>
              {castData.authorFid && (
                <p>Author FID: {castData.authorFid}</p>
              )}
              {castData.timestamp && (
                <p>
                  {new Date(castData.timestamp * 1000).toLocaleString()}
                </p>
              )}
              {castData.channelKey && (
                <p>Channel: /{castData.channelKey}</p>
              )}
            </div>

            {castData.embeds && castData.embeds.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-black dark:text-white mb-2">
                  Embeds:
                </p>
                <div className="space-y-2">
                  {castData.embeds.map((embed: string, index: number) => (
                    <a
                      key={index}
                      href={embed}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm break-all"
                    >
                      {embed}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <Link
              href="/"
              className="btn-secondary"
            >
              ← Back to Home
            </Link>
            <button
              onClick={() => {
                // You can add custom actions here, like analyzing the cast
                alert("Cast analysis feature coming soon!");
              }}
              className="btn-primary"
            >
              Analyze Cast
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-black dark:text-white text-xl">Loading...</div>
      </div>
    }>
      <SharePageContent />
    </Suspense>
  );
}

