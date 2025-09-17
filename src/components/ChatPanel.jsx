import FilePreview from "./FilePreview";

export default function ChatPanel({
  userId,
  setUserId,
  recipientId,
  setRecipientId,
  message,
  setMessage,
  selectedFiles,
  setSelectedFiles,
  uploadingMedia,
  setUploadingMedia,
  showFilePicker,
  setShowFilePicker,
  fileInputRef,
  jwt,
  setMessages,
  setConversationMessages,
  selectedConversation,
  replyingTo,
  setReplyingTo,
}) {
  // File handling functions
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);

    if (files.length > 10) {
      alert("Maximum 10 files allowed per message");
      return;
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/avi",
      "video/mov",
      "video/wmv",
      "video/webm",
      "audio/mp3",
      "audio/wav",
      "audio/aac",
      "audio/ogg",
      "audio/mpeg",
      "application/pdf",
      "text/plain",
    ];

    const validFiles = [];
    const errors = [];

    files.forEach((file, index) => {
      if (file.size > maxSize) {
        errors.push(`${file.name}: File too large (max 100MB)`);
      } else if (!allowedTypes.includes(file.type.toLowerCase())) {
        errors.push(`${file.name}: File type not supported`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      alert(`File validation errors:\n${errors.join("\n")}`);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      setShowFilePicker(true);
    }
  };

  // Send multiple media files
  const sendMediaFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploadingMedia(true);
    try {
      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append("media", file);
      });

      formData.append("recipientId", recipientId);
      if (message.trim()) {
        formData.append("content", message.trim());
      }

      const endpoint =
        selectedFiles.length === 1 ? "send-media" : "send-multiple-media";

      const res = await fetch(`http://165.227.209.124:4002/chat/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        body: formData,
      });

      const data = await res.json();
      console.log("Media send response:", data);

      if (data.success) {
        const outgoing = {
          ...data.message,
          incoming: false,
          status: data.message?.status || "sent",
        };
        setMessages((prev) => [...prev, outgoing]);

        // If currently viewing conversation with recipient, append there too
        if (selectedConversation === recipientId) {
          setConversationMessages((prev) => [...prev, outgoing]);
        }

        // Clear form
        setMessage("");
        setSelectedFiles([]);
        setShowFilePicker(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        if (data.uploadResults && data.uploadResults.failed > 0) {
          alert(
            `Message sent but ${data.uploadResults.failed} files failed to upload`
          );
        }
      } else {
        throw new Error(data.error || "Failed to send media");
      }
    } catch (err) {
      console.error("❌ Media send error:", err);
      alert("❌ Failed to send media files");
    } finally {
      setUploadingMedia(false);
    }
  };

  // 2. ADD this Reply Preview component inside your ChatPanel:
  const ReplyPreview = ({ replyingTo, onCancel, userId }) => {
    if (!replyingTo) return null;

    const isReplyToOwn = replyingTo.senderId === userId;

    return (
      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-3 rounded-r">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-xs font-semibold text-blue-700 mb-1">
              Replying to {isReplyToOwn ? "yourself" : "them"}
            </div>
            <div className="text-sm text-gray-700 truncate">
              {replyingTo.content ||
                (replyingTo.attachmentPreview
                  ? `${replyingTo.attachmentPreview.fileType} ${replyingTo.attachmentPreview.count > 1 ? `(${replyingTo.attachmentPreview.count} files)` : ""}`
                  : "Message")}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="ml-2 text-gray-500 hover:text-gray-700 text-lg font-bold"
          >
            ×
          </button>
        </div>
      </div>
    );
  };

  // const sendMessage = async () => {
  //   if (selectedFiles.length > 0) {
  //     await sendMediaFiles();
  //     return;
  //   }

  //   if (!message.trim()) {
  //     alert("Please enter a message");
  //     return;
  //   }

  //   try {
  //     const res = await fetch("http://localhost:4002/chat/send", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${jwt}`,
  //       },
  //       body: JSON.stringify({ recipientId, content: message }),
  //     });
  //     const data = await res.json();
  //     if (data.success) {
  //       const outgoing = {
  //         ...data.message,
  //         incoming: false,
  //         status: data.message?.status || "sent",
  //       };
  //       setMessages((prev) => [...prev, outgoing]);
  //       if (selectedConversation === recipientId) {
  //         setConversationMessages((prev) => [...prev, outgoing]);
  //       }
  //       setMessage("");
  //     } else {
  //       throw new Error(data.error || "Failed to send");
  //     }
  //   } catch (err) {
  //     console.error("❌ Send error:", err);
  //     alert("❌ Failed to send message");
  //   }
  // };

  // 3. UPDATE your sendMessage function to include reply data:
  const sendMessage = async () => {
    if (!message.trim() && selectedFiles.length === 0) return;
    if (!recipientId) {
      alert("Please enter recipient ID");
      return;
    }

    try {
      let endpoint = "http://localhost:4002/chat/send";
      let payload;
      let headers = {
        Authorization: `Bearer ${jwt}`,
      };

      if (selectedFiles.length > 0) {
        // Handle media messages
        const formData = new FormData();
        formData.append("recipientId", recipientId);
        if (message.trim()) {
          formData.append("content", message.trim());
        }

        // ADD: Include reply data for media messages
        if (replyingTo) {
          formData.append("replyToMessageId", replyingTo.messageId);
        }

        if (selectedFiles.length === 1) {
          formData.append("media", selectedFiles[0]);
          endpoint = "http://localhost:4002/chat/send-media";
        } else {
          selectedFiles.forEach((file) => {
            formData.append("media", file);
          });
          endpoint = "http://localhost:4002/chat/send-multiple-media";
        }
        payload = formData;
      } else {
        // Handle text messages
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify({
          recipientId,
          content: message.trim(),
          attachments: [],
          // ADD: Include reply data for text messages
          ...(replyingTo && { replyToMessageId: replyingTo.messageId }),
        });
      }

      setUploadingMedia(true);
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: payload,
      });

      const data = await response.json();
      if (response.ok && data.success) {
        console.log("Message sent successfully:", data.message);

        // Clear form and reply state
        setMessage("");
        setSelectedFiles([]);
        setReplyingTo(null); // ADD: Clear reply state

        // Add to messages if it matches current conversation
        if (
          data.message &&
          ((data.message.senderId === userId &&
            data.message.recipientId === recipientId) ||
            (data.message.senderId === recipientId &&
              data.message.recipientId === userId))
        ) {
          setMessages((prev) => [...prev, data.message]);
          if (
            selectedConversation === recipientId ||
            selectedConversation === data.message.senderId
          ) {
            setConversationMessages((prev) => [...prev, data.message]);
          }
        }
      } else {
        throw new Error(data.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Send message error:", error);
      alert("Failed to send message: " + error.message);
    } finally {
      setUploadingMedia(false);
    }
  };

  return (
    <>
      <div className="space-y-4 p-4 bg-gray-50 rounded">
        <ReplyPreview
          replyingTo={replyingTo}
          onCancel={() => setReplyingTo(null)}
          userId={userId}
        />

        <div>
          <label className="block text-sm font-medium mb-1">
            👤 Your User ID
          </label>
          <input
            className="w-full border rounded px-3 py-2"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            🎯 Recipient ID
          </label>
          <input
            className="w-full border rounded px-3 py-2"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">💬 Message</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
        </div>

        {/* File Selection */}
        <div className="space-y-2">
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center justify-center space-x-2"
          >
            <span>📎</span>
            <span>Add Files</span>
          </button>

          {selectedFiles.length > 0 && (
            <div className="text-sm text-gray-600">
              {selectedFiles.length} file(s) selected
            </div>
          )}
        </div>

        <button
          onClick={sendMessage}
          disabled={uploadingMedia}
          className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          {uploadingMedia
            ? "Sending..."
            : selectedFiles.length > 0
              ? "Send Media"
              : "Send Message"}
        </button>
      </div>

      {/* File Preview */}
      <FilePreview
        showFilePicker={showFilePicker}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        setShowFilePicker={setShowFilePicker}
        fileInputRef={fileInputRef}
      />
    </>
  );
}
