"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import ConversationList from "../../messages/components/ConversationList";
import MessageThread from "../../messages/components/MessageThread";
import MessageInput from "../../messages/components/MessageInput";
import UserSearch from "../../messages/components/UserSearch";

interface ChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatWidget({ isOpen, onClose }: ChatWidgetProps) {
  const { address } = useAccount();
  const [view, setView] = useState<"LIST" | "THREAD">("LIST");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [otherParticipant, setOtherParticipant] = useState<string>("");
  const [showSearch, setShowSearch] = useState(false);
  const [lastUpdatedConversation, setLastUpdatedConversation] = useState<{ id: string; timestamp: string } | null>(null);
  const [messageRefreshSignal, setMessageRefreshSignal] = useState(0);

  // Reset view when widget is closed
  useEffect(() => {
    if (!isOpen) {
      // Optional: Reset to list view or keep state? 
      // User might want to come back to the same conversation.
      // keeping it as is for now.
    }
  }, [isOpen]);

  const handleSelectConversation = (conversationId: string, participant: string) => {
    setSelectedConversationId(conversationId);
    setOtherParticipant(participant);
    setView("THREAD");
  };

  const handleBackToList = () => {
    setView("LIST");
    // Don't clear selectedConversationId immediately to avoid flicker, 
    // but practically we are in list view now.
  };

  const handleMessageSent = (newConversationId?: string, timestamp?: string) => {
    if (newConversationId && newConversationId !== selectedConversationId) {
      setSelectedConversationId(newConversationId);
    }
    
    if (newConversationId && timestamp) {
       setLastUpdatedConversation({ id: newConversationId, timestamp });
    } else if (selectedConversationId && timestamp) {
       setLastUpdatedConversation({ id: selectedConversationId, timestamp });
    }

    setMessageRefreshSignal((prev) => prev + 1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-white dark:bg-black border-l border-gray-200 dark:border-gray-800 shadow-xl z-50 flex flex-col transition-transform duration-300 transform translate-x-0">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-black">
        <div className="flex items-center gap-3">
          {view === "THREAD" && (
            <button 
              onClick={handleBackToList}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 className="text-lg font-bold text-black dark:text-white">
            {view === "LIST" ? "Messages" : otherParticipant ? `${otherParticipant.substring(0, 6)}...${otherParticipant.substring(38)}` : "Chat"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
            {view === "LIST" && (
                <button
                    onClick={() => setShowSearch(!showSearch)}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </button>
            )}
            <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {view === "LIST" ? (
          <div className="h-full overflow-y-auto">
            {showSearch && (
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <UserSearch 
                        currentWallet={address || ""} 
                        onSelectUser={(wallet, userInfo) => {
                            if (userInfo && userInfo.conversationId) {
                                handleSelectConversation(userInfo.conversationId, wallet);
                            } else {
                                handleSelectConversation("temp", wallet); 
                            }
                            setShowSearch(false);
                        }} 
                    />
                </div>
            )}
            <ConversationList
              currentWallet={address || ""}
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
              lastUpdatedConversation={lastUpdatedConversation}
            />
          </div>
        ) : (
          <>
            <MessageThread
              conversationId={selectedConversationId === "temp" ? null : selectedConversationId}
              currentWallet={address || ""}
              otherParticipant={otherParticipant}
              refreshSignal={messageRefreshSignal}
            />
            <MessageInput
              conversationId={selectedConversationId === "temp" ? null : selectedConversationId}
              senderWallet={address || ""}
              receiverWallet={otherParticipant}
              onMessageSent={handleMessageSent}
            />
          </>
        )}
      </div>
    </div>
  );
}

