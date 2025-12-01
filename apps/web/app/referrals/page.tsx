"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { checkNFTOwnershipClientSide } from "@/lib/check-nft-ownership";

export default function ReferralsPage() {
  const { address, isConnected } = useAccount();
  const [hasNFT, setHasNFT] = useState<boolean | null>(null);
  const [checkingNFT, setCheckingNFT] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalCreditsEarned: 0,
    pendingCredits: 0,
    totalUsdcEarned: 0,
    usdcPaid: 0,
    usdcPending: 0,
  });
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadStats = async () => {
    if (!address) return;
    setLoading(true);
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const res = await fetch(`/api/referrals/stats?wallet=${address}&t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      const data = await res.json();
      
      console.log("📊 Referral stats loaded:", data);
      
      if (data.referralCode) {
        setReferralCode(data.referralCode);
      }
      setStats({
        totalReferrals: data.totalReferrals || 0,
        totalCreditsEarned: data.totalCreditsEarned || 0,
        pendingCredits: data.pendingCredits || 0,
        totalUsdcEarned: data.totalUsdcEarned || 0,
        usdcPaid: data.usdcPaid || 0,
        usdcPending: data.usdcPending || 0,
      });
    } catch (error) {
      console.error("Failed to load stats", error);
    } finally {
      setLoading(false);
    }
  };

  const createCode = async () => {
    if (!address) return;
    setCreating(true);
    try {
      console.log("🔄 Creating referral code for wallet:", address);
      
      const res = await fetch("/api/referrals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      
      const data = await res.json();
      
      console.log("📥 Referral create response:", {
        status: res.status,
        data,
      });
      
      if (!res.ok) {
        const errorMessage = data.error || data.details || "Failed to create referral link";
        console.error("❌ Referral create failed:", {
          status: res.status,
          error: errorMessage,
          details: data.details,
        });
        
        if (res.status === 403) {
          alert(`❌ ${errorMessage}\n\nPlease ensure you own an xFrora NFT in your wallet.`);
        } else if (res.status === 500) {
          alert(`❌ Server Error: ${errorMessage}\n\nDetails: ${data.details || "Unknown error"}\n\nPlease try again or contact support.`);
        } else {
          alert(`❌ Error: ${errorMessage}`);
        }
        return;
      }
      
      if (data.code) {
        console.log("✅ Referral code created successfully:", data.code);
        setReferralCode(data.code);
        // Reload stats after code creation
        await loadStats();
      } else {
        console.error("❌ No code returned in response:", data);
        alert("Failed to create referral link - no code returned. Please try again.");
      }
    } catch (error: any) {
      console.error("❌ Failed to create referral code:", {
        error: error.message,
        stack: error.stack,
      });
      alert(`Failed to create referral link: ${error.message || "Network error"}\n\nPlease check your connection and try again.`);
    } finally {
      setCreating(false);
    }
  };

  // ✅ NFT Ownership Check: Only checks wallet balance on blockchain
  // - Works for both minted NFTs and transferred NFTs (no database check)
  // - If wallet has NFT → access granted (mint status not required)
  useEffect(() => {
    const checkNFT = async () => {
      if (!address) {
        setHasNFT(false);
        setCheckingNFT(false);
        return;
      }

      setCheckingNFT(true);
      try {
        // Check if wallet owns NFT directly from blockchain (handles transferred NFTs)
        const hasNFTResult = await checkNFTOwnershipClientSide(address);
        setHasNFT(hasNFTResult);
        
        // Only load stats if user has NFT
        if (hasNFTResult) {
          loadStats();
        }
      } catch (error) {
        console.error("Error checking NFT ownership:", error);
        setHasNFT(false);
      } finally {
        setCheckingNFT(false);
      }
    };

    if (isConnected && address) {
      checkNFT();
    } else {
      setHasNFT(null);
      setCheckingNFT(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected]);

  // Use Farcaster Mini App format for referral links
  // Format: https://farcaster.xyz/miniapps/{MINI_APP_ID}/{APP_NAME}?ref={CODE}
  const FARCASTER_MINI_APP_ID = "KD7K0EBIz173";
  const FARCASTER_APP_NAME = "xfrora";
  const FARCASTER_MINI_APP_BASE_URL = `https://farcaster.xyz/miniapps/${FARCASTER_MINI_APP_ID}/${FARCASTER_APP_NAME}`;
  
  const referralLink = referralCode 
    ? `${FARCASTER_MINI_APP_BASE_URL}?ref=${referralCode}`
    : "";

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <nav className="border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 bg-white dark:bg-black">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              {/* Back Button - Mobile */}
              <Link 
                href="/" 
                className="md:hidden p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors flex-shrink-0"
                aria-label="Back to home"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              
              <Link href="/" className="text-lg sm:text-xl font-bold text-black dark:text-white whitespace-nowrap">
                XFRORA
              </Link>
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden sm:inline">Referrals</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <ThemeToggle />
              {/* Wallet badge - hide on very small screens */}
              <div className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hidden xs:block">
                Wallet
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 md:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-black dark:text-white mb-4 sm:mb-6">
          Invite Friends & Earn Rewards
        </h1>
        
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-4 sm:p-6 rounded-lg mb-6 sm:mb-8">
          <h2 className="text-lg font-semibold text-black dark:text-white mb-4">
            How it works
          </h2>
          <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex gap-2">
              <span className="font-bold text-black dark:text-white">1.</span>
              Share your unique referral link (NFT owners only).
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-black dark:text-white">2.</span>
              Friends mint an NFT using your link.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-black dark:text-white">3.</span>
              You earn <span className="font-bold text-green-600 dark:text-green-400">50,000 Credits</span> instantly + <span className="font-bold text-blue-600 dark:text-blue-400">0.25 USDC</span> per mint!
            </li>
            <li className="flex gap-2">
               <span className="font-bold text-black dark:text-white">4.</span>
               Credits are added instantly. USDC rewards are paid manually after NFT sale ends.
            </li>
          </ul>
        </div>

        {!isConnected ? (
          <div className="text-center py-12">
            <p className="mb-4 text-gray-600 dark:text-gray-400">Connect wallet to view your referral dashboard</p>
          </div>
        ) : checkingNFT ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Checking NFT ownership...</p>
          </div>
        ) : !hasNFT ? (
          <div className="text-center py-12">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-lg max-w-md mx-auto">
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
                NFT Required
              </h3>
              <p className="text-red-700 dark:text-red-300 mb-4">
                You must own an xFrora NFT to access the referral program.
              </p>
              <Link
                href="/"
                className="inline-block px-4 py-2 bg-red-600 text-white rounded hover:opacity-90"
              >
                Mint Your NFT
              </Link>
            </div>
          </div>
        ) : loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 border border-gray-200 dark:border-gray-800 rounded-lg text-center">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 uppercase mb-1">Total Referrals</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-black dark:text-white">{stats.totalReferrals}</p>
              </div>
              <div className="p-3 sm:p-4 border border-gray-200 dark:border-gray-800 rounded-lg text-center">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 uppercase mb-1">Credits Earned</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">{stats.totalCreditsEarned.toLocaleString()}</p>
              </div>
              <div className="p-3 sm:p-4 border border-gray-200 dark:border-gray-800 rounded-lg text-center bg-blue-50 dark:bg-blue-900/10">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 uppercase mb-1">USDC Pending</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">${stats.usdcPending.toFixed(2)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">Paid after sale ends</p>
              </div>
              <div className="p-3 sm:p-4 border border-gray-200 dark:border-gray-800 rounded-lg text-center">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 uppercase mb-1">USDC Paid</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-600 dark:text-gray-400">${stats.usdcPaid.toFixed(2)}</p>
              </div>
            </div>

            {/* Link Generation */}
            <div className="p-4 sm:p-6 border border-gray-200 dark:border-gray-800 rounded-lg">
              <h3 className="font-bold text-black dark:text-white mb-3 sm:mb-4 text-sm sm:text-base">Your Referral Link</h3>
              
              {referralCode ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    readOnly 
                    value={referralLink}
                    className="flex-1 px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs sm:text-sm text-black dark:text-white min-w-0"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(referralLink)}
                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-semibold rounded hover:opacity-90 text-sm sm:text-base whitespace-nowrap"
                  >
                    Copy
                  </button>
                </div>
              ) : (
                <button
                  onClick={createCode}
                  disabled={creating}
                  className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Generate Referral Link"}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

