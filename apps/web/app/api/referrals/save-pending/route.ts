import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/db-supabase";

export const dynamic = 'force-dynamic';

/**
 * Save referral code to pending_referrals table
 * Called when Farcaster user loads and has a referral code in localStorage
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { x_user_id, referral_code } = body;

    if (!x_user_id || !referral_code) {
      return NextResponse.json({ error: "Missing x_user_id or referral_code" }, { status: 400 });
    }

    const client = supabaseClient;
    if (!client) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
    }

    console.log("💾 Saving referral code to pending_referrals:", { x_user_id, referral_code });

    // Check if referral code exists in referral_codes table
    const { data: codeData, error: codeError } = await (client as any)
      .from("referral_codes")
      .select("code")
      .eq("code", referral_code)
      .single();

    if (codeError || !codeData) {
      console.warn("⚠️ Referral code not found in referral_codes table:", referral_code);
      return NextResponse.json({ 
        success: false, 
        message: "Invalid referral code" 
      });
    }

    // Check if pending referral already exists for this user
    const { data: existing } = await (client as any)
      .from("pending_referrals")
      .select("id")
      .eq("x_user_id", x_user_id)
      .single();

    if (existing) {
      // Update existing pending referral
      const { error: updateError } = await (client as any)
        .from("pending_referrals")
        .update({
          referral_code: referral_code,
          created_at: new Date().toISOString()
        })
        .eq("x_user_id", x_user_id);

      if (updateError) {
        console.error("❌ Error updating pending referral:", updateError);
        return NextResponse.json({ error: "Failed to update pending referral" }, { status: 500 });
      }

      console.log("✅ Updated existing pending referral");
      return NextResponse.json({ success: true, message: "Pending referral updated" });
    } else {
      // Insert new pending referral
      const { error: insertError } = await (client as any)
        .from("pending_referrals")
        .insert({
          x_user_id: x_user_id,
          referral_code: referral_code
        });

      if (insertError) {
        console.error("❌ Error inserting pending referral:", insertError);
        return NextResponse.json({ error: "Failed to save pending referral" }, { status: 500 });
      }

      console.log("✅ Saved referral code to pending_referrals");
      return NextResponse.json({ success: true, message: "Pending referral saved" });
    }
  } catch (error: any) {
    console.error("❌ Error saving pending referral:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

