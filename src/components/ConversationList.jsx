import { useEffect } from "react";

export default function ConversationList({
  conversations,
  showConversations,
  loadingConversations,
  selectedConversation,
  fetchConversations,
  fetchConversationMessages,
  userId,
  userPresence,
  setUserPresence,
  typingUsers,
  jwt,
}) {



  // Auto-refresh presence every 30 seconds when viewing conversations
useEffect(() => {
  if (!showConversations) return;
  
  const refreshInterval = setInterval(() => {
    if (conversations.length > 0) {
      console.log("🔄 Auto-refreshing presence data...");
      fetchConversations();
    }
  }, 30000); // 30 seconds

  return () => clearInterval(refreshInterval);
}, [showConversations, conversations.length, fetchConversations]);



  // Update presence data from conversations
  useEffect(() =>   {
    if (conversations && conversations.length > 0) {
      const newPresence = {};
      conversations.forEach(conv => {
        if (conv.otherUserPresence && conv.otherUser?.userId) {
          newPresence[conv.otherUser.userId] = conv.otherUserPresence;
        }
      });
      setUserPresence(prev => ({ ...prev, ...newPresence }));
    }
  }, [conversations, setUserPresence]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatLastSeen = (lastSeenAt) => {
    if (!lastSeenAt) return "Unknown";
    const now = new Date();
    const lastSeen = new Date(lastSeenAt);
    const diffMs = now - lastSeen;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return lastSeen.toLocaleDateString();
  };

  const getPresenceStatus = (otherUserId) => {
    const presence = userPresence[otherUserId];
    if (!presence) return { text: "", color: "bg-gray-400", online: false };
    
    if (presence.online) {
      return { text: "Online", color: "bg-green-500", online: true };
    }
    
    return { 
      text: formatLastSeen(presence.lastSeenAt), 
      color: "bg-gray-400", 
      online: false 
    };
  };

  const isUserTypingInConversation = (conversationId, otherUserId) => {
    return typingUsers[conversationId]?.[otherUserId];
  };

  return (
    <div className="p-4 bg-gray-50 rounded">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">💬 Chat List</h3>
        <button
          onClick={fetchConversations}
          disabled={loadingConversations || !userId}
          className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 disabled:bg-gray-400"
        >
          {loadingConversations ? "Loading..." : "Refresh"}
        </button>
      </div>
      {showConversations && (
        <div className="max-h-64 overflow-y-auto space-y-2">
          {conversations.length === 0 ? (
            <p className="text-gray-500 text-sm">No conversations found</p>
          ) : (
            conversations.map((conv) => {
              const presenceStatus = getPresenceStatus(conv.otherUser?.userId);
              const isTyping = isUserTypingInConversation(
                conv.conversationId,
                conv.otherUser?.userId
              );
              
              return (
                <div
                  key={conv.conversationId}
                  onClick={() =>
                    fetchConversationMessages(conv.otherUser?.userId)
                  }
                  className={`p-3 border rounded cursor-pointer hover:bg-blue-50 ${
                    selectedConversation === conv.otherUser?.userId
                      ? "bg-blue-100 border-blue-300"
                      : "bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">


                        <div className={`w-2 h-2 rounded-full ${presenceStatus.color}`}></div>

                        
                        <div className="font-medium text-sm">
                          {conv.otherUser?.firstName} {conv.otherUser?.lastName}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 ml-4">
                        @{conv.otherUser?.username}
                      </div>
                      
                      {/* Typing indicator */}
                      {isTyping ? (
                        <div className="text-xs text-green-600 ml-4 font-medium flex items-center space-x-1">
                          <span>typing</span>
                          <span className="animate-pulse">...</span>
                        </div>
                      ) : (
                        <>
                          <div className="text-xs text-gray-500 ml-4">
                            {presenceStatus.text}
                          </div>
                          {conv.lastMessage && (
                            <div className="text-xs text-gray-600 mt-1 truncate ml-4">
                              {conv.lastMessage.content ||
                                (conv.lastMessage.attachments?.length > 0
                                  ? "📎 Media"
                                  : "Message")}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 ml-2">
                      {formatTime(conv.lastActivityAt)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}