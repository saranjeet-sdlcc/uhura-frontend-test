// export default function Message({
//   message,
//   userId,
//   editingMessageId,
//   editingText,
//   setEditingText,
//   selectedMessageIds,
//   formatTime,
//   handlers,
//   isLive = false,
// }) {
//   const {
//     handleIncomingClick,
//     startEditing,
//     cancelEditing,
//     submitEdit,
//     deleteForMe,
//     deleteForEveryone,
//     toggleSelectMessage,
//     handleReply, // NEW
//   } = handlers;

//   const renderAttachments = (attachments) => {
//     if (!attachments || attachments.length === 0) return null;

//     const formatFileSize = (bytes) => {
//       if (bytes === 0) return "0 Bytes";
//       const k = 1024;
//       const sizes = ["Bytes", "KB", "MB", "GB"];
//       const i = Math.floor(Math.log(bytes) / Math.log(k));
//       return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
//     };

//     return (
//       <div className="mt-2 space-y-2">
//         {attachments.map((attachment, index) => (
//           <div
//             key={index}
//             className="border rounded p-2 bg-white bg-opacity-20"
//           >
//             {attachment.fileType === "image" && (
//               <img
//                 src={attachment.url}
//                 alt={attachment.fileName}
//                 className="max-w-xs max-h-48 rounded cursor-pointer"
//                 onClick={() => window.open(attachment.url, "_blank")}
//               />
//             )}
//             {attachment.fileType === "video" && (
//               <video
//                 controls
//                 className="max-w-xs max-h-48 rounded"
//                 src={attachment.url}
//               />
//             )}
//             {attachment.fileType === "audio" && (
//               <audio
//                 controls
//                 className="w-full max-w-xs"
//                 src={attachment.url}
//               />
//             )}
//             {attachment.fileType === "document" && (
//               <div className="flex items-center space-x-2">
//                 <span className="text-lg">📄</span>
//                 <a
//                   href={attachment.url}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="text-blue-600 hover:underline text-sm"
//                 >
//                   {attachment.fileName}
//                 </a>
//                 <span className="text-xs opacity-70">
//                   ({formatFileSize(attachment.fileSize)})
//                 </span>
//               </div>
//             )}
//           </div>
//         ))}
//       </div>
//     );
//   };

//   // NEW: Render reply context
//   const renderReplyContext = (replyTo) => {
//     if (!replyTo) return null;

//     const isReplyToOwn = replyTo.senderId === userId;
    
//     return (
//       <div className="mb-2 p-2 rounded border-l-4 border-gray-300 bg-black bg-opacity-10">
//         <div className="text-xs font-semibold mb-1 opacity-80">
//           {isReplyToOwn ? "You" : "Them"}
//         </div>
//         <div className="text-xs opacity-70 truncate">
//           {replyTo.content || (
//             replyTo.attachmentPreview 
//               ? `${replyTo.attachmentPreview.fileType} ${replyTo.attachmentPreview.count > 1 ? `(${replyTo.attachmentPreview.count} files)` : ''}`
//               : "Message"
//           )}
//         </div>
//       </div>
//     );
//   };

//   const renderMessageContent = (msg) => {
//     if (msg.isDeletedForEveryone) {
//       return <i className="opacity-80">This message was deleted</i>;
//     }

//     const hasContent = msg.content && msg.content.trim();
//     const hasAttachments = msg.attachments && msg.attachments.length > 0;

//     return (
//       <div className="space-y-1">
//         {/* NEW: Show reply context if this is a reply */}
//         {msg.isReply && msg.replyTo && renderReplyContext(msg.replyTo)}
        
//         {hasContent && (
//           <div>
//             {msg.content}{" "}
//             {msg.isEdited && (
//               <span className="text-xs opacity-70"> (edited)</span>
//             )}
//           </div>
//         )}
//         {hasAttachments && renderAttachments(msg.attachments)}
//       </div>
//     );
//   };

//   const renderStatus = (m) => {
//     const s = m.status || "sent";
//     if (m.incoming) {
//       if (s === "read") return <span className="text-xs">👁 read</span>;
//       if (s === "delivered")
//         return <span className="text-xs">✓ delivered</span>;
//       return <span className="text-xs">• sent</span>;
//     } else {
//       if (s === "read") return <span className="text-xs">👁 read</span>;
//       if (s === "delivered")
//         return <span className="text-xs">✓ delivered</span>;
//       return <span className="text-xs">• sent</span>;
//     }
//   };

//   const isOwner = message.senderId === userId;
//   const isEditing = editingMessageId === message.messageId;

//   return (
//     <div
//       className="flex items-start space-x-2"
//       onClick={() => message.incoming && handleIncomingClick(message)}
//     >
//       <div>
//         <input
//           type="checkbox"
//           checked={selectedMessageIds.includes(message.messageId)}
//           onChange={() => toggleSelectMessage(message.messageId)}
//         />
//       </div>
//       <div
//         className={`p-3 rounded shadow text-sm cursor-pointer ${
//           isOwner
//             ? "bg-blue-500 text-white ml-auto text-right"
//             : "bg-gray-200 text-left"
//         }`}
//         style={{ maxWidth: "70%" }}
//       >
//         {isEditing ? (
//           <>
//             <textarea
//               value={editingText}
//               onChange={(e) => setEditingText(e.target.value)}
//               className="w-full p-2 rounded mb-2 text-black"
//             />
//             <div className="flex justify-end space-x-2">
//               <button
//                 onClick={cancelEditing}
//                 className="px-2 py-1 bg-gray-200 text-black rounded"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={submitEdit}
//                 className="px-2 py-1 bg-green-600 text-white rounded"
//               >
//                 Save
//               </button>
//             </div>
//           </>
//         ) : (
//           <>
//             {renderMessageContent(message)}
//             <div className="flex items-center justify-between mt-1">
//               <div className="text-xs opacity-70">
//                 {message.createdAt
//                   ? formatTime(message.createdAt)
//                   : formatTime(new Date().toISOString())}
//               </div>
//               <div className="ml-2 opacity-90 text-xs">
//                 {isLive ? renderStatus(message) : renderStatus(message)}
//               </div>
//             </div>
//             <div className="mt-2 flex justify-end space-x-2 text-xs">
//               {/* NEW: Reply button (available for all messages) */}
//               {!message.isDeletedForEveryone && (
//                 <button
//                   onClick={() => handleReply(message)}
//                   className="px-2 py-1 bg-green-200 text-black rounded hover:bg-green-300"
//                 >
//                   Reply
//                 </button>
//               )}
              
//               {isOwner && !message.isDeletedForEveryone && (
//                 <>
//                   <button
//                     onClick={() => startEditing(message)}
//                     className="px-2 py-1 bg-yellow-200 text-black rounded"
//                   >
//                     Edit
//                   </button>
//                   <button
//                     onClick={() => deleteForEveryone(message)}
//                     className="px-2 py-1 bg-red-600 text-white rounded"
//                   >
//                     Unsend
//                   </button>
//                 </>
//               )}
//               <button
//                 onClick={() => deleteForMe(message)}
//                 className="px-2 py-1 bg-gray-200 text-black rounded"
//               >
//                 Delete for me
//               </button>
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }


import { Link } from "react-router-dom"; // INVITE LINK CHANGE: Import Link for client-side routing
import Linkify from "react-linkify";

export default function Message({
  message,
  userId,
  editingMessageId,
  editingText,
  setEditingText,
  selectedMessageIds,
  formatTime,
  handlers,
  isLive = false,
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

  const renderAttachments = (attachments) => {
    if (!attachments || attachments.length === 0) return null;

    const formatFileSize = (bytes) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
      <div className="mt-2 space-y-2">
        {attachments.map((attachment, index) => (
          <div
            key={index}
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
          {replyTo.content || (
            replyTo.attachmentPreview 
              ? `${replyTo.attachmentPreview.fileType} ${replyTo.attachmentPreview.count > 1 ? `(${replyTo.attachmentPreview.count} files)` : ''}`
              : "Message"
          )}
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

    // INVITE LINK CHANGE: Custom parser for invite links
    const renderContentWithLinks = (content) => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = content.split(urlRegex);
      return parts.map((part, index) => {
        if (urlRegex.test(part) && part.includes("/groups/invite/")) {
          const path = part.replace(/^https?:\/\/[^\/]+/, ""); // Extract path (e.g., /groups/invite/<token>/join)
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
        return part;
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
          </div>
        )}
        {hasAttachments && renderAttachments(msg.attachments)}
      </div>
    );
  };

  const renderStatus = (m) => {
    const s = m.status || "sent";
    if (m.incoming) {
      if (s === "read") return <span className="text-xs">👁 read</span>;
      if (s === "delivered")
        return <span className="text-xs">✓ delivered</span>;
      return <span className="text-xs">• sent</span>;
    } else {
      if (s === "read") return <span className="text-xs">👁 read</span>;
      if (s === "delivered")
        return <span className="text-xs">✓ delivered</span>;
      return <span className="text-xs">• sent</span>;
    }
  };

  const isOwner = message.senderId === userId;
  const isEditing = editingMessageId === message.messageId;

  return (
    <div
      className="flex items-start space-x-2"
      onClick={() => message.incoming && handleIncomingClick(message)}
    >
      <div>
        <input
          type="checkbox"
          checked={selectedMessageIds.includes(message.messageId)}
          onChange={() => toggleSelectMessage(message.messageId)}
        />
      </div>
      <div
        className={`p-3 rounded shadow text-sm cursor-pointer ${
          isOwner
            ? "bg-blue-500 text-white ml-auto text-right"
            : "bg-gray-200 text-left"
        }`}
        style={{ maxWidth: "70%" }}
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
                onClick={cancelEditing}
                className="px-2 py-1 bg-gray-200 text-black rounded"
              >
                Cancel
              </button>
              <button
                onClick={submitEdit}
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
              <div className="ml-2 opacity-90 text-xs">
                {isLive ? renderStatus(message) : renderStatus(message)}
              </div>
            </div>
            <div className="mt-2 flex justify-end space-x-2 text-xs">
              {!message.isDeletedForEveryone && (
                <button
                  onClick={() => handleReply(message)}
                  className="px-2 py-1 bg-green-200 text-black rounded hover:bg-green-300"
                >
                  Reply
                </button>
              )}
              {isOwner && !message.isDeletedForEveryone && (
                <>
                  <button
                    onClick={() => startEditing(message)}
                    className="px-2 py-1 bg-yellow-200 text-black rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteForEveryone(message)}
                    className="px-2 py-1 bg-red-600 text-white rounded"
                  >
                    Unsend
                  </button>
                </>
              )}
              <button
                onClick={() => deleteForMe(message)}
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