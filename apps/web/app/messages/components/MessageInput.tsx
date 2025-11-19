"use client";

import { useState } from "react";
import { MESSAGING_RATE_LIMITS } from "@/lib/feature-flags";

interface MessageInputProps {
  conversationId: string | null;
  senderWallet: string;
  receiverWallet: string;
  onMessageSent: (newConversationId?: string, timestamp?: string) => void;
}

export default function MessageInput({
  conversationId,
  senderWallet,
  receiverWallet,
  onMessageSent,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!receiverWallet) {
      setError("No recipient selected");
      return;
    }

    if (!message.trim()) {
      setError("Message cannot be empty");
      return;
    }

    if (message.length > MESSAGING_RATE_LIMITS.MAX_MESSAGE_LENGTH) {
      setError(`Message too long. Maximum ${MESSAGING_RATE_LIMITS.MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderWallet,
          receiverWallet,
          content: message.trim(),
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      // Clear input and refresh messages
      setMessage("");
      const newConversationId = data.message?.conversationId;
      const timestamp = data.message?.createdAt || new Date().toISOString();
      
      onMessageSent(newConversationId, timestamp);
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!receiverWallet) {
    return (
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Select a conversation or search for a user to start messaging"
            disabled
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          />
          <button
            disabled
            className="px-6 py-2 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setError(null);
            }}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            rows={1}
            maxLength={MESSAGING_RATE_LIMITS.MAX_MESSAGE_LENGTH}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white resize-none"
            style={{ minHeight: "40px", maxHeight: "120px" }}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {message.length}/{MESSAGING_RATE_LIMITS.MAX_MESSAGE_LENGTH} characters
          </p>
        </div>
        <button
          onClick={handleSend}
          disabled={sending || !message.trim() || message.length > MESSAGING_RATE_LIMITS.MAX_MESSAGE_LENGTH}
          className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black border border-black dark:border-white font-semibold hover:bg-gray-900 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
