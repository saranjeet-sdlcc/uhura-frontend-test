// LiveMessages.jsx
import Message from "./Message";

export default function LiveMessages({
  messages = [],
  conversationMessages = [],
  selectedConversation,
  loadingMessages,
  userId,
  jwt,
  editingMessageId,
  setEditingMessageId,
  editingText,
  setEditingText,
  selectedMessageIds,
  setSelectedMessageIds,
  updateMessageById: parentUpdateMessageById,
  setMessages,
  setConversationMessages,
  messagesEndRef,
  replyingTo,
  setReplyingTo,
}) {
  // fallback updateMessageById: updates both lists if parent didn't provide
  const updateMessageById = parentUpdateMessageById
    ? parentUpdateMessageById
    : (messageId, patch) => {
        if (setMessages) {
          setMessages((prev) =>
            prev.map((m) => (m.messageId === messageId ? { ...m, ...patch } : m))
          );
        }
        if (setConversationMessages) {
          setConversationMessages((prev) =>
            prev.map((m) => (m.messageId === messageId ? { ...m, ...patch } : m))
          );
        }
      };

  const postReceipt = async (endpoint, body) => {
    try {
      const res = await fetch(`http://localhost:4002/chat/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        console.warn(`${endpoint} request failed`, data);
      }
      return data;
    } catch (err) {
      console.error(`${endpoint} error:`, err);
      return null;
    }
  };

  const handleIncomingClick = async (msg) => {
    if (!msg || !msg.messageId) return;
    if (msg.status === "read") return;
    updateMessageById(msg.messageId, {
      status: "read",
      readAt: new Date().toISOString(),
    });
    await postReceipt("read", {
      messageId: msg.messageId,
      recipientId: userId,
    });
  };

  const startEditing = (msg) => {
    if (!msg) return;
    if (msg.senderId !== userId) {
      alert("Only sender can edit message");
      return;
    }
    if (msg.isDeletedForEveryone) {
      alert("Cannot edit a deleted message");
      return;
    }
    setEditingMessageId(msg.messageId);
    setEditingText(msg.content || "");
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const submitEdit = async () => {
    const msgId = editingMessageId;
    if (!msgId) return;
    if (!editingText.trim()) {
      alert("Message cannot be empty");
      return;
    }
    try {
      const res = await fetch(
        `http://localhost:4002/chat/messages/${msgId}/edit`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ content: editingText.trim() }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        updateMessageById(msgId, {
          content: editingText.trim(),
          isEdited: true,
          editedAt: new Date().toISOString(),
        });
        setEditingMessageId(null);
        setEditingText("");
      } else {
        throw new Error(data.error || "Edit failed");
      }
    } catch (err) {
      console.error("Edit error:", err);
      alert("Failed to edit message");
    }
  };

  const deleteForMe = async (msg) => {
    if (!msg || !msg.messageId) return;
    const ok = confirm("Delete this message for you?");
    if (!ok) return;
    try {
      const res = await fetch(
        `http://localhost:4002/chat/messages/${msg.messageId}?mode=for_me`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages &&
          setMessages((prev) => prev.filter((m) => m.messageId !== msg.messageId));
        setConversationMessages &&
          setConversationMessages((prev) =>
            prev.filter((m) => m.messageId !== msg.messageId)
          );
        setSelectedMessageIds &&
          setSelectedMessageIds((prev) => prev.filter((id) => id !== msg.messageId));
      } else {
        throw new Error(data.error || "Delete for me failed");
      }
    } catch (err) {
      console.error("Delete for me error:", err);
      alert("Failed to delete message for you");
    }
  };

  const deleteForEveryone = async (msg) => {
    if (!msg || !msg.messageId) return;
    const ok = confirm(
      "Delete this message for everyone? (Only allowed for sender)"
    );
    if (!ok) return;
    try {
      const res = await fetch(
        `http://localhost:4002/chat/messages/${msg.messageId}?mode=for_everyone`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        updateMessageById(msg.messageId, {
          content: "",
          attachments: [],
          isDeletedForEveryone: true,
          deletedForEveryoneAt: new Date().toISOString(),
          deletedForEveryoneBy: userId,
        });
      } else {
        throw new Error(data.error || "Delete for everyone failed");
      }
    } catch (err) {
      console.error("Delete for everyone error:", err);
      alert("Failed to delete message for everyone");
    }
  };

  // Reply functionality
  const handleReply = (message) => {
    if (!message || message.isDeletedForEveryone) {
      alert("Cannot reply to deleted message");
      return;
    }

    setReplyingTo({
      messageId: message.messageId,
      senderId: message.senderId,
      content: message.content || "",
      messageType: message.messageType || "text",
      attachmentPreview: message.attachments?.[0]
        ? {
            fileType: message.attachments[0].fileType,
            fileName: message.attachments[0].fileName,
            thumbnailUrl: message.attachments[0].thumbnailUrl || null,
            count: message.attachments.length,
          }
        : null,
      createdAt: message.createdAt,
    });
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const toggleSelectMessage = (messageId) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const messageHandlers = {
    handleIncomingClick,
    startEditing,
    cancelEditing,
    submitEdit,
    deleteForMe,
    deleteForEveryone,
    toggleSelectMessage,
    handleReply,
    cancelReply,
  };

  return (
    <>
      {/* Selected Conversation Messages */}
      {selectedConversation && (
        <div className="mb-6 p-4 bg-blue-50 rounded">
          <h3 className="text-lg font-semibold mb-2">
            Messages with {selectedConversation}
          </h3>
          {loadingMessages ? (
            <p className="text-gray-500">Loading messages...</p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2 bg-white p-3 rounded">
              {conversationMessages.length === 0 ? (
                <p className="text-gray-500 text-sm">No messages found</p>
              ) : (
                conversationMessages.map((msg, i) => (
                  <Message
                    key={msg.messageId || i}
                    message={msg}
                    userId={userId}
                    editingMessageId={editingMessageId}
                    editingText={editingText}
                    setEditingText={setEditingText}
                    selectedMessageIds={selectedMessageIds}
                    formatTime={formatTime}
                    handlers={messageHandlers}
                    updateMessageById={updateMessageById}
                    jwt={jwt}
                    isLive={false}
                    setReplyingTo={setReplyingTo}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Original Live Chat */}
      <div className="border-t pt-4 max-h-64 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-2">Live Messages</h2>
        <div className="space-y-2">
          {messages.map((msg, i) => (
            <Message
              key={msg.messageId || i}
              message={msg}
              userId={userId}
              editingMessageId={editingMessageId}
              editingText={editingText}
              setEditingText={setEditingText}
              selectedMessageIds={selectedMessageIds}
              formatTime={formatTime}
              handlers={messageHandlers}
              updateMessageById={updateMessageById}
              jwt={jwt}
              isLive={true}
              setReplyingTo={setReplyingTo}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </>
  );
}
