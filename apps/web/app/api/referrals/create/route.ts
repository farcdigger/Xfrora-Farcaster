import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/db-supabase";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
    }

    const client = supabaseClient;
    if (!client) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const normalizedWallet = walletAddress.toLowerCase();

    // ✅ Check if user owns an NFT (required to create referral link)
    const { data: nftData } = await (client as any)
      .from("tokens")
      .select("id")
      .eq("wallet_address", normalizedWallet)
      .limit(1)
      .maybeSingle();

    if (!nftData && process.env.NODE_ENV !== "development") {
      const DEVELOPER_WALLET = "0xEdf8e693b3ab4899a03aB22eDF90E36a6AC1Fd9d";
      if (normalizedWallet.toLowerCase() !== DEVELOPER_WALLET.toLowerCase()) {
        return NextResponse.json(
          { error: "You must own an xFrora NFT to create a referral link." },
          { status: 403 }
        );
      }
    }

    // Check if code already exists
    const { data: existing } = await (client as any)
      .from("referral_codes")
      .select("code")
      .eq("wallet_address", normalizedWallet)
      .single();

    const existingCode = existing as { code: string } | null;

    if (existingCode) {
      return NextResponse.json({ code: existingCode.code });
    }

    // Create new unique code (last 6 chars of wallet + random string if needed)
    // Simple version: 'ref_' + last 6 chars of wallet
    const code = `ref_${normalizedWallet.slice(-6)}`;

    // Insert
    const { data, error } = await (client as any)
      .from("referral_codes")
      .insert({
        wallet_address: normalizedWallet,
        code: code
      })
      .select("code")
      .single();

    const insertedCode = data as { code: string } | null;

    if (error) {
      // Handle duplicate code edge case by appending random char
      if (error.code === '23505') { // Unique constraint violation
         const randomSuffix = Math.floor(Math.random() * 1000);
         const newCode = `ref_${normalizedWallet.slice(-6)}${randomSuffix}`;
         const { data: retryData, error: retryError } = await (client as any)
            .from("referral_codes")
            .insert({
                wallet_address: normalizedWallet,
                code: newCode
            })
            .select("code")
            .single();
            
         const retryCode = retryData as { code: string } | null;
         if (retryError) throw retryError;
         return NextResponse.json({ code: retryCode?.code });
      }
      throw error;
    }

    return NextResponse.json({ code: insertedCode?.code });

  } catch (error: any) {
    console.error("Referral create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

