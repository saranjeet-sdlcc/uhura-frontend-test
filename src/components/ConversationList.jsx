export default function ConversationList({
  conversations,
  showConversations,
  loadingConversations,
  selectedConversation,
  fetchConversations,
  fetchConversationMessages,
  userId,
}) {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
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
            conversations.map((conv) => (
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
                    <div className="font-medium text-sm">
                      {conv.otherUser?.firstName} {conv.otherUser?.lastName}
                    </div>
                    <div className="text-xs text-gray-500">
                      @{conv.otherUser?.username}
                    </div>
                    {conv.lastMessage && (
                      <div className="text-xs text-gray-600 mt-1 truncate">
                        {conv.lastMessage.content ||
                          (conv.lastMessage.attachments?.length > 0
                            ? "📎 Media"
                            : "Message")}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 ml-2">
                    {formatTime(conv.lastActivityAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}