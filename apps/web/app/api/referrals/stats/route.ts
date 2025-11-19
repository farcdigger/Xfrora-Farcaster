import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/db-supabase";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json({ error: "Wallet required" }, { status: 400 });
    }

    const client = supabaseClient;
    if (!client) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const normalizedWallet = wallet.toLowerCase();

    // Get total referrals count
    const { count } = await (client as any)
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("referrer_wallet", normalizedWallet);

    // Get total credits earned (50,000 per referral)
    const { data: earnings } = await (client as any)
      .from("referrals")
      .select("reward_credits, status")
      .eq("referrer_wallet", normalizedWallet);
      
    const earningsData = earnings as Array<{ reward_credits: number; status: string }> | null;
    
    // Only count completed referrals
    const totalCreditsEarned = earningsData?.reduce((sum, ref) => {
      return ref.status === 'completed' ? sum + (Number(ref.reward_credits) || 0) : sum;
    }, 0) || 0;
    
    const pendingCredits = earningsData?.reduce((sum, ref) => {
      return ref.status === 'pending' ? sum + (Number(ref.reward_credits) || 0) : sum;
    }, 0) || 0;

    // Get referral code
    const { data: codeData } = await (client as any)
      .from("referral_codes")
      .select("code")
      .eq("wallet_address", normalizedWallet)
      .single();

    const code = codeData as { code: string } | null;

    return NextResponse.json({
      referralCode: code?.code || null,
      totalReferrals: count || 0,
      totalCreditsEarned,
      pendingCredits
    });

  } catch (error: any) {
    console.error("Referral stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

