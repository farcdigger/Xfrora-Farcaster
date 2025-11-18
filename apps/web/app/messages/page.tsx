"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { isMessagingEnabled, checkMessagingPermissions } from "@/lib/feature-flags";

export default function MessagesPage() {
  const { address, isConnected } = useAccount();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessReason, setAccessReason] = useState<string>("");

  useEffect(() => {
    const checkAccess = () => {
      const permissions = checkMessagingPermissions(address);
      setHasAccess(permissions.hasAccess);
      setAccessReason(permissions.reason || "");
      setLoading(false);
      
      // Erişim yoksa ana sayfaya yönlendir (3 saniye sonra)
      if (!permissions.hasAccess && address) {
        setTimeout(() => {
          window.location.href = "/social";
        }, 3000);
      }
    };
    
    checkAccess();
  }, [address]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-black dark:border-white border-t-transparent mb-4"></div>
          <div className="text-black dark:text-white">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        {/* Navbar */}
        <nav className="border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <img 
                  src="/frora-logo.png" 
                  alt="XFRORA Logo" 
                  className="w-10 h-10 rounded-full object-cover"
                />
                <span className="text-xl font-bold text-gray-800 uppercase dark:text-slate-100">XFRORA</span>
              </Link>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <ConnectButton />
              </div>
            </div>
          </div>
        </nav>

        {/* Access Denied Content */}
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="text-6xl mb-6">🔒</div>
            <h1 className="text-3xl font-bold text-black dark:text-white mb-4">
              Erişim Yok
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {accessReason || "Bu özellik henüz geliştirme aşamasında."}
            </p>
            {!isConnected && (
              <div className="mb-6">
                <ConnectButton />
              </div>
            )}
            <div className="space-y-3">
              <Link
                href="/social"
                className="block w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white font-semibold hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors"
              >
                Social Sayfasına Dön
              </Link>
              <Link
                href="/"
                className="block w-full px-6 py-3 border border-gray-300 dark:border-gray-700 text-black dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                Ana Sayfaya Dön
              </Link>
            </div>
            {address && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
                Cüzdan: {address.substring(0, 6)}...{address.substring(38)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Navbar */}
      <nav className="border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img 
                src="/frora-logo.png" 
                alt="XFRORA Logo" 
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="text-xl font-bold text-gray-800 uppercase dark:text-slate-100">XFRORA</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Messages</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/social"
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 text-black dark:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                Social
              </Link>
              <ThemeToggle />
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar - Conversations List */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">
              Mesajlar
              {process.env.NODE_ENV === "development" && (
                <span className="text-xs bg-yellow-400 text-black px-2 py-1 rounded ml-2">
                  BETA
                </span>
              )}
            </h2>
            
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cüzdan adresi ara..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
              <svg className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Conversations List */}
          <div className="overflow-y-auto h-full">
            {/* Placeholder for conversations */}
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-4">💬</div>
              <p className="text-sm">Henüz konuşma yok</p>
              <p className="text-xs mt-2">Birisiyle mesajlaşmaya başlamak için cüzdan adresini arayın</p>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">🚀</div>
              <h3 className="text-lg font-semibold text-black dark:text-white">
                Mesajlaşma Sistemi
              </h3>
              <p className="text-sm">
                Geliştirme aşamasında - Yakında aktif olacak!
              </p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
              <div className="max-w-md mx-auto">
                <h4 className="text-lg font-semibold text-black dark:text-white mb-4">
                  Özellikler
                </h4>
                <div className="space-y-3 text-sm text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-green-500">✅</span>
                    <span>Wallet-to-wallet mesajlaşma</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-green-500">✅</span>
                    <span>Real-time mesaj bildirimleri</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-green-500">✅</span>
                    <span>Spam koruması (dakikada 10 mesaj)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-green-500">✅</span>
                    <span>Otomatik mesaj silme (24 saat)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-green-500">✅</span>
                    <span>NFT profil resimleri</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Message Input Area */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Mesaj yazın... (henüz aktif değil)"
                disabled
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
              <button
                disabled
                className="px-6 py-2 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              >
                Gönder
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Geliştirme tamamlandığında aktif olacak
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
