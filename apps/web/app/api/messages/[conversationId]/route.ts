import { NextRequest, NextResponse } from "next/server";
import { supabaseClient } from "@/lib/db-supabase";

export const dynamic = 'force-dynamic';

/**
 * GET /api/messages/[conversationId]
 * Get all messages for a conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const conversationId = params.conversationId;
    const walletAddress = request.nextUrl.searchParams.get("wallet");
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
    const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    if (!supabaseClient) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const normalizedWallet = walletAddress.toLowerCase();

    // Verify user is a participant in this conversation
    const { data: conversation, error: convError } = await supabaseClient
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const isParticipant =
      conversation.participant1_wallet.toLowerCase() === normalizedWallet ||
      conversation.participant2_wallet.toLowerCase() === normalizedWallet;

    if (!isParticipant) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get messages for this conversation
    const { data: messages, error: messagesError } = await supabaseClient
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    // Mark received messages as read
    if (messages && messages.length > 0) {
      await supabaseClient
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", conversationId)
        .eq("receiver_wallet", normalizedWallet)
        .eq("read", false);
    }

    // Get other participant info
    const otherParticipant =
      conversation.participant1_wallet.toLowerCase() === normalizedWallet
        ? conversation.participant2_wallet
        : conversation.participant1_wallet;

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        otherParticipant,
        createdAt: conversation.created_at,
        lastMessageAt: conversation.last_message_at,
      },
      messages: messages || [],
      hasMore: (messages?.length || 0) === limit,
    });
  } catch (error: any) {
    console.error("Error in get messages API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
