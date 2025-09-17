export default function BulkActions({
  selectedMessageIds,
  setSelectedMessageIds,
  jwt,
  userId,
  setMessages,
  setConversationMessages,
  updateMessageById,
}) {
  const deleteSelected = async (mode = "for_me") => {
    if (selectedMessageIds.length === 0) {
      alert("No messages selected");
      return;
    }
    const ok = confirm(
      `Delete ${selectedMessageIds.length} message(s) (${mode})?`
    );
    if (!ok) return;
    try {
      const res = await fetch(
        `http://localhost:4002/chat/messages/delete-multiple`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ messageIds: selectedMessageIds, mode }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        if (mode === "for_me") {
          // remove locally
          setMessages((prev) =>
            prev.filter((m) => !selectedMessageIds.includes(m.messageId))
          );
          setConversationMessages((prev) =>
            prev.filter((m) => !selectedMessageIds.includes(m.messageId))
          );
        } else {
          // for everyone -> mark deleted locally for each id
          selectedMessageIds.forEach((mid) =>
            updateMessageById(mid, {
              content: "",
              attachments: [],
              isDeletedForEveryone: true,
              deletedForEveryoneAt: new Date().toISOString(),
              deletedForEveryoneBy: userId,
            })
          );
        }
        setSelectedMessageIds([]);
      } else {
        throw new Error(data.error || "Bulk delete failed");
      }
    } catch (err) {
      console.error("Bulk delete error:", err);
      alert("Failed to delete selected messages");
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm">Selected: {selectedMessageIds.length}</div>
        <div className="space-x-2">
          <button
            onClick={() => deleteSelected("for_me")}
            disabled={selectedMessageIds.length === 0}
            className="bg-gray-200 px-2 py-1 rounded text-sm hover:bg-gray-300"
          >
            Delete for me
          </button>
          <button
            onClick={() => deleteSelected("for_everyone")}
            disabled={selectedMessageIds.length === 0}
            className="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700"
          >
            Delete for everyone
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        Tip: Use checkboxes on messages to select multiple
      </div>
    </div>
  );
}