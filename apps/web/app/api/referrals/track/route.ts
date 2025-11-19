import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/db-supabase";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refereeWallet, referralCode } = body;

    if (!refereeWallet || !referralCode) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const client = supabaseClient;
    if (!client) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    const normalizedReferee = refereeWallet.toLowerCase();

    // 1. Find referrer wallet from code
    const { data: codeData } = await (client as any)
      .from("referral_codes")
      .select("wallet_address")
      .eq("code", referralCode)
      .single();

    const referrerData = codeData as { wallet_address: string } | null;

    if (!referrerData) {
      return NextResponse.json({ error: "Invalid code" }, { status: 404 });
    }

    const referrerWallet = referrerData.wallet_address;

    // 2. Prevent self-referral
    if (referrerWallet === normalizedReferee) {
      return NextResponse.json({ error: "Self-referral not allowed" }, { status: 400 });
    }

    // 3. Check if referee already referred
    const { count: existingCount } = await (client as any)
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referee_wallet", normalizedReferee);

    if (existingCount && existingCount > 0) {
      return NextResponse.json({ success: false, message: "Already referred" });
    }

    // 4. Insert referral record (status: pending until mint is confirmed)
    const { error: insertError } = await (client as any)
      .from("referrals")
      .insert({
        referrer_wallet: referrerWallet,
        referee_wallet: normalizedReferee,
        status: "pending",
        reward_credits: 50000
      });

    if (insertError) {
      console.error("Referral insert error:", insertError);
      throw insertError;
    }

    // 5. Award credits to referrer IMMEDIATELY (since this is called after successful mint)
    try {
      // Get referrer's current balance
      const { data: referrerBalance } = await (client as any)
        .from("chat_tokens")
        .select("balance, wallet_address")
        .eq("wallet_address", referrerWallet)
        .single();

      const balanceData = referrerBalance as { balance: number; wallet_address: string } | null;

      if (balanceData) {
        // Update existing balance
        await (client as any)
          .from("chat_tokens")
          .update({
            balance: (balanceData.balance || 0) + 50000,
            updated_at: new Date().toISOString()
          })
          .eq("wallet_address", referrerWallet);
      } else {
        // Create new record
        await (client as any)
          .from("chat_tokens")
          .insert({
            wallet_address: referrerWallet,
            balance: 50000,
            points: 0,
            total_tokens_spent: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }

      // Mark referral as completed
      await (client as any)
        .from("referrals")
        .update({
          status: "completed",
          rewarded_at: new Date().toISOString()
        })
        .eq("referee_wallet", normalizedReferee);

      console.log(`✅ Referral reward awarded: ${referrerWallet} received 50,000 credits`);
    } catch (rewardError) {
      console.error("Error awarding referral credits:", rewardError);
      // Don't fail the request if reward fails - we can manually fix it later
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Referral track error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

