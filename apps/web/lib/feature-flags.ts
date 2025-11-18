import { env } from "@/env.mjs";

/**
 * Mesajlaşma özelliğinin aktif olup olmadığını kontrol eder
 * @param walletAddress - Kullanıcının cüzdan adresi
 * @returns boolean - Özellik aktif mi?
 */
export function isMessagingEnabled(walletAddress?: string | null): boolean {
  // Geliştirme modunda her zaman aktif
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  
  // Feature flag kapalıysa hiç kimse için aktif değil
  if (env.ENABLE_MESSAGING_FEATURE !== "true") {
    return false;
  }
  
  // Geliştirici cüzdan adresi belirtilmişse, sadece o adres için aktif
  if (env.DEVELOPER_WALLET_ADDRESS) {
    return walletAddress?.toLowerCase() === env.DEVELOPER_WALLET_ADDRESS.toLowerCase();
  }
  
  // Hiçbir kısıtlama yoksa herkese açık
  return true;
}

/**
 * Spam koruması için rate limit kontrolü
 */
export const MESSAGING_RATE_LIMITS = {
  MESSAGES_PER_MINUTE: 10,
  MESSAGES_PER_HOUR: 100,
  MAX_MESSAGE_LENGTH: 500,
} as const;

/**
 * Mesajlaşma özelliği için gerekli izinleri kontrol eder
 */
export function checkMessagingPermissions(walletAddress?: string | null): {
  hasAccess: boolean;
  reason?: string;
} {
  if (!walletAddress) {
    return { hasAccess: false, reason: "Wallet not connected" };
  }
  
  if (!isMessagingEnabled(walletAddress)) {
    return { hasAccess: false, reason: "Messaging feature not enabled for this wallet" };
  }
  
  return { hasAccess: true };
}
