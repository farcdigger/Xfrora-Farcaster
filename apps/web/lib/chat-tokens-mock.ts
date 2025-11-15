/**
 * Mock token balances storage for development/testing
 * Used when Supabase is not configured
 */

export interface MockUserData {
  balance: number;
  points: number;
  totalTokensSpent?: number; // Track total tokens spent for points calculation
}

export function getMockTokenBalances(): Map<string, MockUserData> {
  if (typeof global !== 'undefined') {
    if (!(global as any).mockTokenBalances) {
      (global as any).mockTokenBalances = new Map<string, MockUserData>();
    }
    // Migrate old format (number) to new format (MockUserData)
    const map = (global as any).mockTokenBalances;
    map.forEach((value: any, key: string) => {
      if (typeof value === 'number') {
        map.set(key, { balance: value, points: 0, totalTokensSpent: 0 });
      }
    });
    return map;
  }
  // Fallback for environments without global
  if (!(globalThis as any).mockTokenBalances) {
    (globalThis as any).mockTokenBalances = new Map<string, MockUserData>();
  }
  // Migrate old format
  const map = (globalThis as any).mockTokenBalances;
  map.forEach((value: any, key: string) => {
    if (typeof value === 'number') {
      map.set(key, { balance: value, points: 0, totalTokensSpent: 0 });
    }
  });
  return map;
}

