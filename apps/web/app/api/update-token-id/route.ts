/**
 * Update Token ID API
 * 
 * Mint başarılı olduktan sonra token_id, tx_hash ve status'u günceller
 * STATUS: 'generated' → 'paid' → 'minted'
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db, tokens } from "@/lib/db";
import { eq } from "drizzle-orm";
import { env, isMockMode } from "@/env.mjs";
import { timingSafeEqual } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("x-update-token-secret");
    if (!env.UPDATE_TOKEN_SECRET) {
      console.warn("⚠️ UPDATE_TOKEN_SECRET not configured; request rejected");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    // ✅ Güvenlik: Timing-safe comparison (timing attack koruması)
    if (!authHeader) {
      console.warn("⚠️ Invalid update token secret", { provided: "missing" });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Timing-safe comparison için Buffer kullan
    const providedBuffer = Buffer.from(authHeader, "utf8");
    const expectedBuffer = Buffer.from(env.UPDATE_TOKEN_SECRET, "utf8");
    
    // Buffer uzunlukları farklıysa timing-safe comparison yapılamaz
    if (providedBuffer.length !== expectedBuffer.length) {
      console.warn("⚠️ Invalid update token secret", { provided: "***" });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Timing-safe comparison
    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      console.warn("⚠️ Invalid update token secret", { provided: "***" });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { farcaster_user_id, token_id, transaction_hash } = body;

    const userId = farcaster_user_id;

    console.log("🔄 Update token_id request for Farcaster user:", {
      farcaster_user_id: userId,
      token_id,
      transaction_hash: transaction_hash?.substring(0, 20) + "...",
    });

    // Validation
    if (!userId || token_id === undefined || token_id === null) {
      return NextResponse.json(
        { error: "Missing required fields: farcaster_user_id, token_id" },
        { status: 400 }
      );
    }

    let updateResult: any = null;

    if (!isMockMode) {
      if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Supabase credentials missing");
      }
      try {
        const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false },
        });

        const { data, error } = await supabase
          .from("tokens")
          .update({
            token_id: Number(token_id),
            tx_hash: transaction_hash || null,
            status: "minted",
          })
          .eq("farcaster_user_id", userId)
          .select();

        if (error) {
          throw error;
        }

        updateResult = data;
        console.log("✅ Token ID updated via db facade for Farcaster user", { farcaster_user_id: userId, token_id });
        
        // ✅ YENİ: Mint eden cüzdan adresini chat_tokens tablosuna ekle
        if (updateResult && updateResult.length > 0) {
          const tokenData = updateResult[0];
          const walletAddress = tokenData.wallet_address;
          
          if (walletAddress) {
            try {
              const normalizedWallet = walletAddress.toLowerCase();
              
              // Önce mevcut kaydı kontrol et
              const { data: existingChatToken, error: checkError } = await supabase
                .from("chat_tokens")
                .select("wallet_address")
                .eq("wallet_address", normalizedWallet)
                .single();
              
              if (checkError && checkError.code === 'PGRST116') {
                // Kayıt yok, yeni kayıt oluştur
                const { error: insertError } = await supabase
                  .from("chat_tokens")
                  .insert({
                    wallet_address: normalizedWallet,
                    balance: 0,
                    points: 0,
                    total_tokens_spent: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  });
                
                if (insertError) {
                  console.error("⚠️ chat_tokens ekleme hatası:", insertError);
                } else {
                  console.log("✅ Mint eden cüzdan adresi chat_tokens tablosuna eklendi:", normalizedWallet);
                }
              } else if (existingChatToken) {
                console.log("ℹ️ Cüzdan adresi zaten chat_tokens tablosunda mevcut:", normalizedWallet);
              }
            } catch (chatTokenError) {
              console.error("⚠️ chat_tokens ekleme hatası (kritik değil):", chatTokenError);
            }
          }
        }
      } catch (dbError) {
        console.error("❌ Supabase update failed:", dbError);
        return NextResponse.json(
          {
            error: "Database update failed",
            message: String(dbError),
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        farcaster_user_id: userId,
        token_id: Number(token_id),
        tx_hash: transaction_hash,
        status: "minted",
      });
    }

    // Mock mode
    console.log("⚠️ Mock mode: Database update skipped");
    return NextResponse.json({
      success: true,
      farcaster_user_id: userId,
      token_id: Number(token_id),
      mock: true,
    });
  } catch (error) {
    console.error("❌ Update token_id error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: String(error),
      },
      { status: 500 }
    );
  }
}

