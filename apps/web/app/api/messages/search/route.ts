import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/db-supabase";

export const dynamic = 'force-dynamic';

/**
 * GET /api/messages/search
 * Search for users by wallet address
 */
export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q");
    const currentWallet = request.nextUrl.searchParams.get("wallet");

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    if (!currentWallet) {
      return NextResponse.json(
        { error: "Current wallet address is required" },
        { status: 400 }
      );
    }

    if (!supabaseClient) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const normalizedQuery = query.toLowerCase().trim();
    const normalizedCurrentWallet = currentWallet.toLowerCase();

    // Validate wallet address format (basic check)
    const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(normalizedQuery);
    
    if (!isValidAddress) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Don't allow searching for yourself
    if (normalizedQuery === normalizedCurrentWallet) {
      return NextResponse.json(
        { error: "Cannot search for your own wallet address" },
        { status: 400 }
      );
    }

    // Check if user has NFT (from tokens table)
    const { data: tokenData } = await supabaseClient
      .from("tokens")
      .select("token_id, image_uri, wallet_address")
      .eq("wallet_address", normalizedQuery)
      .limit(1)
      .single();

    // Check if user exists in users table
    const { data: userData } = await supabaseClient
      .from("users")
      .select("x_user_id, username, profile_image_url, wallet_address")
      .eq("wallet_address", normalizedQuery)
      .limit(1)
      .single();

    // Check if there's an existing conversation
    const { data: existingConv } = await supabaseClient
      .from("conversations")
      .select("id")
      .or(
        `participant1_wallet.eq.${normalizedQuery},participant2_wallet.eq.${normalizedQuery}`
      )
      .or(
        `participant1_wallet.eq.${normalizedCurrentWallet},participant2_wallet.eq.${normalizedCurrentWallet}`
      )
      .limit(1)
      .single();

    return NextResponse.json({
      wallet: normalizedQuery,
      hasNFT: !!tokenData,
      tokenId: tokenData?.token_id || null,
      nftImageUrl: tokenData?.image_uri || null,
      username: userData?.username || null,
      profileImageUrl: userData?.profile_image_url || null,
      hasExistingConversation: !!existingConv,
      conversationId: existingConv?.id || null,
    });
  } catch (error: any) {
    console.error("Error in search API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
