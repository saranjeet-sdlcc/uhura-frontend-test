// Message.jsx
import { Link } from "react-router-dom";
import { useState } from "react";

export default function Message({
  message,
  userId,
  editingMessageId,
  editingText,
  setEditingText,
  selectedMessageIds = [],
  formatTime,
  handlers,
  updateMessageById, // REQUIRED for saving translation result in UI
  jwt,
  isLive = false,
  setReplyingTo, // optional, used by reply action
}) {
  const {
    handleIncomingClick,
    startEditing,
    cancelEditing,
    submitEdit,
    deleteForMe,
    deleteForEveryone,
    toggleSelectMessage,
    handleReply,
  } = handlers;

  // translation menu state per-message
  const [showTranslateMenu, setShowTranslateMenu] = useState(false);
  const [translating, setTranslating] = useState(false);

  // small language list (you can expand or fetch from translation/languages)
  const availableLanguages = [
    { code: "none", name: "Original" },
    { code: "en", name: "English" },
    { code: "hi", name: "Hindi" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "zh-Hans", name: "Chinese (Simplified)" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "pt", name: "Portuguese" },
    { code: "ru", name: "Russian" },
    { code: "it", name: "Italian" },
    { code: "tr", name: "Turkish" },
    { code: "vi", name: "Vietnamese" },
    { code: "ar", name: "Arabic" },
  ];

  const renderAttachments = (attachments) => {
    if (!attachments || attachments.length === 0) return null;

    const formatFileSize = (bytes) => {
      if (!bytes || bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
      <div className="mt-2 space-y-2">
        {attachments.map((attachment, index) => (
          <div
            key={attachment.fileId || attachment.url || index}
            className="border rounded p-2 bg-white bg-opacity-20"
          >
            {attachment.fileType === "image" && (
              <img
                src={attachment.url}
                alt={attachment.fileName}
                className="max-w-xs max-h-48 rounded cursor-pointer"
                onClick={() => window.open(attachment.url, "_blank")}
              />
            )}
            {attachment.fileType === "video" && (
              <video
                controls
                className="max-w-xs max-h-48 rounded"
                src={attachment.url}
              />
            )}
            {attachment.fileType === "audio" && (
              <audio
                controls
                className="w-full max-w-xs"
                src={attachment.url}
              />
            )}
            {attachment.fileType === "document" && (
              <div className="flex items-center space-x-2">
                <span className="text-lg">📄</span>
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  {attachment.fileName}
                </a>
                <span className="text-xs opacity-70">
                  ({formatFileSize(attachment.fileSize)})
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderReplyContext = (replyTo) => {
    if (!replyTo) return null;

    const isReplyToOwn = replyTo.senderId === userId;

    return (
      <div className="mb-2 p-2 rounded border-l-4 border-gray-300 bg-black bg-opacity-10">
        <div className="text-xs font-semibold mb-1 opacity-80">
          {isReplyToOwn ? "You" : "Them"}
        </div>
        <div className="text-xs opacity-70 truncate">
          {replyTo.content ||
            (replyTo.attachmentPreview
              ? `${replyTo.attachmentPreview.fileType} ${
                  replyTo.attachmentPreview.count > 1
                    ? `(${replyTo.attachmentPreview.count} files)`
                    : ""
                }`
              : "Message")}
        </div>
      </div>
    );
  };

  const renderMessageContent = (msg) => {
    if (msg.isDeletedForEveryone) {
      return <i className="opacity-80">This message was deleted</i>;
    }

    const hasContent = msg.content && msg.content.trim();
    const hasAttachments = msg.attachments && msg.attachments.length > 0;

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const renderContentWithLinks = (content) => {
      const parts = content.split(urlRegex);
      return parts.map((part, index) => {
        if (!part) return null;
        if (urlRegex.test(part) && part.includes("/groups/invite/")) {
          const path = part.replace(/^https?:\/\/[^\/]+/, "");
          return (
            <Link
              key={index}
              to={path}
              className="text-blue-600 bg-blue-100 px-2 py-1 rounded flex items-center space-x-1 hover:bg-blue-200"
            >
              <span className="text-lg" role="img" aria-label="group">
                👥
              </span>
              <span>Join Group</span>
            </Link>
          );
        } else if (urlRegex.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      });
    };

    return (
      <div className="space-y-1">
        {msg.isReply && msg.replyTo && renderReplyContext(msg.replyTo)}
        {hasContent && (
          <div>
            {renderContentWithLinks(msg.content)}{" "}
            {msg.isEdited && (
              <span className="text-xs opacity-70"> (edited)</span>
            )}
            {/* Show badge if this message has any saved userTranslations for this user */}
            {Array.isArray(msg.userTranslations) &&
              msg.userTranslations.find((ut) => ut.userId === userId) && (
                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded ml-2">
                  🌐 Saved translation
                </span>
              )}
          </div>
        )}
        {hasAttachments && renderAttachments(msg.attachments)}
      </div>
    );
  };

  const renderStatus = (m) => {
    const s = m.status || "sent";
    if (s === "read") return <span className="text-xs">👁 read</span>;
    if (s === "delivered") return <span className="text-xs">✓ delivered</span>;
    return <span className="text-xs">• sent</span>;
  };

  const isOwner = message.senderId === userId;
  const isEditing = editingMessageId === message.messageId;

  // Translate a message and save the translation to server for this user
  const translateMessage = async (targetLanguage) => {
    if (!targetLanguage || targetLanguage === "none") {
      alert("Choose a valid language to translate to.");
      return;
    }
    if (!jwt) {
      alert("No JWT available to translate.");
      return;
    }

    setTranslating(true);
    setShowTranslateMenu(false);

    try {
      const res = await fetch(
        `http://localhost:4002/chat/messages/${message.messageId}/translate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({ targetLanguage }),
        }
      );
      const data = await res.json();

      if (res.ok && data.success) {
        // Use updateMessageById to update UI locally – include userTranslations
        const savedTranslation = {
          userId,
          language: data.translation.language,
          content: data.translation.content,
          translatedAt: data.translation.translatedAt || new Date().toISOString(),
          translatedBy: userId,
        };

        // Build patch: update userTranslations array, and show content in UI
        const patch = {};
        // prefer replacing or adding userTranslations client-side
        const existingTranslations = Array.isArray(message.userTranslations)
          ? [...message.userTranslations]
          : [];

        const idx = existingTranslations.findIndex(
          (ut) => ut.userId === userId && ut.language === savedTranslation.language
        );
        if (idx >= 0) {
          existingTranslations[idx] = savedTranslation;
        } else {
          existingTranslations.push(savedTranslation);
        }

        // patch content shown to the user
        patch.userTranslations = existingTranslations;
        patch.content = savedTranslation.content;

        // Apply update locally (parent should update persisted state too)
        if (typeof updateMessageById === "function") {
          updateMessageById(message.messageId, patch);
        }

        // quick user feedback
        alert(`Translated message saved (${savedTranslation.language.toUpperCase()})`);
      } else {
        throw new Error(data.error || "Translation failed");
      }
    } catch (err) {
      console.error("Translation error:", err);
      alert("Failed to translate message");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div
      className="flex items-start space-x-2"
      onClick={() => message.incoming && handleIncomingClick(message)}
    >
      <div>
        <input
          type="checkbox"
          checked={selectedMessageIds.includes(message.messageId)}
          onChange={(e) => {
            e.stopPropagation();
            toggleSelectMessage(message.messageId);
          }}
        />
      </div>
      <div
        className={`p-3 rounded shadow text-sm cursor-pointer ${
          isOwner
            ? "bg-blue-500 text-white ml-auto text-right"
            : "bg-gray-200 text-left"
        }`}
        style={{ maxWidth: "70%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {isEditing ? (
          <>
            <textarea
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              className="w-full p-2 rounded mb-2 text-black"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cancelEditing();
                }}
                className="px-2 py-1 bg-gray-200 text-black rounded"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  submitEdit();
                }}
                className="px-2 py-1 bg-green-600 text-white rounded"
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <>
            {renderMessageContent(message)}
            <div className="flex items-center justify-between mt-1">
              <div className="text-xs opacity-70">
                {message.createdAt
                  ? formatTime(message.createdAt)
                  : formatTime(new Date().toISOString())}
              </div>
              <div className="ml-2 opacity-90 text-xs">{renderStatus(message)}</div>
            </div>

            <div className="mt-2 flex justify-end space-x-2 text-xs flex-wrap gap-1">
              {!message.isDeletedForEveryone && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTranslateMenu((s) => !s);
                    }}
                    disabled={translating}
                    className="px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 flex items-center space-x-1"
                    title="Translate this message and save translation"
                  >
                    {translating ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        <span>Translating...</span>
                      </>
                    ) : (
                      <>
                        <span>🌐</span>
                        <span>Translate</span>
                        <span>{showTranslateMenu ? "▲" : "▼"}</span>
                      </>
                    )}
                  </button>

                  {showTranslateMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowTranslateMenu(false)}
                      />
                      <div className="absolute right-0 -top-20 left-40 mt-1 w-48 bg-white border border-gray-300 rounded shadow-lg z-20 max-h-60 overflow-y-auto">
                        <div className="p-2 bg-gray-100 border-b font-semibold text-gray-700 text-xs">
                          Translate to
                        </div>
                        {availableLanguages.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowTranslateMenu(false);
                              // guard: don't send 'none'
                              if (lang.code === "none") {
                                alert("Choose a real language, not 'Original'");
                                return;
                              }
                              translateMessage(lang.code);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors text-gray-800 border-b last:border-b-0"
                          >
                            <div className="font-medium text-sm">{lang.name}</div>
                            <div className="text-xs text-gray-500">{lang.code}</div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {!message.isDeletedForEveryone && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // support both local reply setter or handlers
                    if (setReplyingTo) setReplyingTo(message);
                    else handleReply(message);
                  }}
                  className="px-2 py-1 bg-green-200 text-black rounded hover:bg-green-300"
                >
                  Reply
                </button>
              )}

              {isOwner && !message.isDeletedForEveryone && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(message);
                    }}
                    className="px-2 py-1 bg-yellow-200 text-black rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteForEveryone(message);
                    }}
                    className="px-2 py-1 bg-red-600 text-white rounded"
                  >
                    Unsend
                  </button>
                </>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteForMe(message);
                }}
                className="px-2 py-1 bg-gray-200 text-black rounded"
              >
                Delete for me
              </button>
            </div>
          </>
        )}  
      </div>
    </div>
  );
}
