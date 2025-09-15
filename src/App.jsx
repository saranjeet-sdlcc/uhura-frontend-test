// import React, { useState, useEffect, useRef } from "react";
// import * as signalR from "@microsoft/signalr";

// import "./App.css";

// export default function App() {
//   const [jwt, setJwt] = useState("");
//   const [userId, setUserId] = useState("");
//   const [recipientId, setRecipientId] = useState("");
//   const [message, setMessage] = useState("");
//   const [connection, setConnection] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [connected, setConnected] = useState(false);
//   const [conversations, setConversations] = useState([]);
//   const [selectedConversation, setSelectedConversation] = useState(null);
//   const [showConversations, setShowConversations] = useState(false);
//   const [conversationMessages, setConversationMessages] = useState([]);
//   const [loadingConversations, setLoadingConversations] = useState(false);
//   const [loadingMessages, setLoadingMessages] = useState(false);

//   // Media states
//   const [selectedFiles, setSelectedFiles] = useState([]);
//   const [uploadingMedia, setUploadingMedia] = useState(false);
//   const [showFilePicker, setShowFilePicker] = useState(false);

//   const messagesEndRef = useRef(null);
//   const fileInputRef = useRef(null);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//     console.log("Message state: ", messages);
//   }, [messages]);

//   const postReceipt = async (endpoint, body) => {
//     try {
//       console.log("Endpoint of send/read api:", endpoint);
//       console.log("Body of send/read api:", body);
//       const res = await fetch(`http://localhost:4002/chat/${endpoint}`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${jwt}`,
//         },
//         body: JSON.stringify(body),
//       });
//       const data = await res.json();
//       console.log("Getting on read:", data);
//       if (!res.ok) {
//         console.log("GETTING INTO THIS BLOCK");
//         console.warn(`${endpoint} request failed`, data);
//       }
//       return data;
//     } catch (err) {
//       console.error(`❌ ${endpoint} error:`, err);
//       return null;
//     }
//   };

//   const updateMessageById = (messageId, patch) => {
//     setMessages((prev) =>
//       prev.map((m) => (m.messageId === messageId ? { ...m, ...patch } : m))
//     );
//   };

//   // File handling functions
//   const handleFileSelect = (event) => {
//     const files = Array.from(event.target.files);

//     // Validate file count
//     if (files.length > 10) {
//       alert("Maximum 10 files allowed per message");
//       return;
//     }

//     // Validate file sizes and types
//     const maxSize = 100 * 1024 * 1024; // 100MB
//     const allowedTypes = [
//       "image/jpeg",
//       "image/jpg",
//       "image/png",
//       "image/gif",
//       "image/webp",
//       "video/mp4",
//       "video/avi",
//       "video/mov",
//       "video/wmv",
//       "video/webm",
//       "audio/mp3",
//       "audio/wav",
//       "audio/aac",
//       "audio/ogg",
//       "audio/mpeg",
//       "application/pdf",
//       "text/plain",
//     ];

//     const validFiles = [];
//     const errors = [];

//     files.forEach((file, index) => {
//       if (file.size > maxSize) {
//         errors.push(`${file.name}: File too large (max 100MB)`);
//       } else if (!allowedTypes.includes(file.type.toLowerCase())) {
//         errors.push(`${file.name}: File type not supported`);
//       } else {
//         validFiles.push(file);
//       }
//     });

//     if (errors.length > 0) {
//       alert(`File validation errors:\n${errors.join("\n")}`);
//     }

//     if (validFiles.length > 0) {
//       setSelectedFiles(validFiles);
//       setShowFilePicker(true);
//     }
//   };

//   const removeFile = (index) => {
//     setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
//   };

//   const getFileIcon = (fileType) => {
//     if (fileType.startsWith("image/")) return "🖼️";
//     if (fileType.startsWith("video/")) return "🎥";
//     if (fileType.startsWith("audio/")) return "🎵";
//     if (fileType.includes("pdf")) return "📄";
//     return "📎";
//   };

//   const formatFileSize = (bytes) => {
//     if (bytes === 0) return "0 Bytes";
//     const k = 1024;
//     const sizes = ["Bytes", "KB", "MB", "GB"];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
//   };

//   // Send multiple media files
//   const sendMediaFiles = async () => {
//     if (selectedFiles.length === 0) return;

//     setUploadingMedia(true);
//     try {
//       const formData = new FormData();

//       // Add files to form data
//       selectedFiles.forEach((file) => {
//         formData.append("media", file);
//       });

//       formData.append("recipientId", recipientId);
//       if (message.trim()) {
//         formData.append("content", message.trim());
//       }

//       const endpoint =
//         selectedFiles.length === 1 ? "send-media" : "send-multiple-media";

//       const res = await fetch(`http://localhost:4002/chat/${endpoint}`, {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${jwt}`,
//         },
//         body: formData,
//       });

//       const data = await res.json();
//       console.log("Media send response:", data);

//       if (data.success) {
//         const outgoing = {
//           ...data.message,
//           incoming: false,
//           status: data.message?.status || "sent",
//         };
//         setMessages((prev) => [...prev, outgoing]);

//         // Clear form
//         setMessage("");
//         setSelectedFiles([]);
//         setShowFilePicker(false);
//         if (fileInputRef.current) {
//           fileInputRef.current.value = "";
//         }

//         if (data.uploadResults && data.uploadResults.failed > 0) {
//           alert(
//             `Message sent but ${data.uploadResults.failed} files failed to upload`
//           );
//         }
//       } else {
//         throw new Error(data.error || "Failed to send media");
//       }
//     } catch (err) {
//       console.error("❌ Media send error:", err);
//       alert("❌ Failed to send media files");
//     } finally {
//       setUploadingMedia(false);
//     }
//   };

//   // NEW API: Get all conversations for the user
//   const fetchConversations = async () => {
//     try {
//       setLoadingConversations(true);
//       console.log("🔄 Fetching conversations for user:", userId);

//       const res = await fetch(
//         `http://localhost:4002/chat/conversations?page=1&limit=20`,
//         {
//           method: "GET",
//           headers: { Authorization: `Bearer ${jwt}` },
//         }
//       );

//       const data = await res.json();
//       console.log("✅ Conversations response:", data);

//       if (data.success) {
//         setConversations(data.conversations);
//         setShowConversations(true);
//       } else {
//         throw new Error(data.error || "Failed to fetch conversations");
//       }
//     } catch (err) {
//       console.error("❌ Fetch conversations error:", err);
//       alert("❌ Failed to fetch conversations");
//     } finally {
//       setLoadingConversations(false);
//     }
//   };

//   // NEW API: Get messages between two users
//   const fetchConversationMessages = async (otherUserId) => {
//     try {
//       setLoadingMessages(true);
//       console.log("🔄 Fetching messages between:", userId, "and", otherUserId);

//       const res = await fetch(
//         `http://localhost:4002/chat/messages?otherUserId=${otherUserId}&page=1&limit=50`,
//         {
//           method: "GET",
//           headers: { Authorization: `Bearer ${jwt}` },
//         }
//       );

//       const data = await res.json();
//       console.log("✅ Messages response:", data);

//       if (data.success) {
//         const messagesOldestFirst = data.messages.reverse();
//         setConversationMessages(messagesOldestFirst);
//         setSelectedConversation(otherUserId);
//       } else {
//         throw new Error(data.error || "Failed to fetch messages");
//       }
//     } catch (err) {
//       console.error("❌ Fetch messages error:", err);
//       alert("❌ Failed to fetch messages");
//     } finally {
//       setLoadingMessages(false);
//     }
//   };

//   const connectToSignalR = async () => {
//     try {
//       const res = await fetch("http://localhost:4002/negotiate", {
//         method: "GET",
//         headers: { Authorization: `Bearer ${jwt}` },
//       });
//       console.log("Negotiate api response:", res);
//       if (!res.ok) throw new Error("Negotiate failed");
//       const { url, accessToken } = await res.json();
//       const newConnection = new signalR.HubConnectionBuilder()
//         .withUrl(url, {
//           accessTokenFactory: () => accessToken,
//         })
//         .withAutomaticReconnect()
//         .configureLogging(signalR.LogLevel.Information)
//         .build();

//       newConnection.on("newMessage", async (msg) => {
//         console.log("📥 Received newMessage:", msg);
//         const incomingMsg = {
//           ...msg,
//           incoming: true,
//           status: msg.status || "sent",
//         };
//         setMessages((prev) => [...prev, incomingMsg]);

//         if (incomingMsg.messageId) {
//           console.log("DELIVERD BLOCK DATA", incomingMsg);
//           postReceipt("delivered", {
//             messageId: incomingMsg.messageId,
//             recipientId: userId,
//           }).catch((e) =>
//             console.warn("Failed to post delivered receipt (non-fatal):", e)
//           );
//           updateMessageById(incomingMsg.messageId, {
//             status: "delivered",
//             deliveredAt: new Date().toISOString(),
//           });
//         }
//       });

//       newConnection.on("messageReceipt", (receipt) => {
//         console.log("📣 Received messageReceipt:", receipt);
//         if (!receipt || !receipt.messageId) return;
//         updateMessageById(receipt.messageId, {
//           status: receipt.status,
//           ...(receipt.timestamp ? { statusAt: receipt.timestamp } : {}),
//         });
//       });

//       await newConnection.start();
//       setConnection(newConnection);
//       setConnected(true);
//       alert("✅ Connected to SignalR!");
//     } catch (err) {
//       console.error("❌ Connection error:", err);
//       alert("❌ Failed to connect to SignalR.");
//     }
//   };

//   const sendMessage = async () => {
//     if (selectedFiles.length > 0) {
//       await sendMediaFiles();
//       return;
//     }

//     if (!message.trim()) {
//       alert("Please enter a message");
//       return;
//     }

//     try {
//       const res = await fetch("http://localhost:4002/chat/send", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${jwt}`,
//         },
//         body: JSON.stringify({ recipientId, content: message }),
//       });
//       const data = await res.json();
//       console.log("Send response:", data);
//       if (data.success) {
//         const outgoing = {
//           ...data.message,
//           incoming: false,
//           status: data.message?.status || "sent",
//         };
//         setMessages((prev) => [...prev, outgoing]);
//         setMessage("");
//       } else {
//         throw new Error(data.error || "Failed to send");
//       }
//     } catch (err) {
//       console.error("❌ Send error:", err);
//       alert("❌ Failed to send message");
//     }
//   };

//   const handleIncomingClick = async (msg) => {
//     if (!msg || !msg.messageId) return;
//     if (msg.status === "read") return;
//     updateMessageById(msg.messageId, {
//       status: "read",
//       readAt: new Date().toISOString(),
//     });
//     await postReceipt("read", {
//       messageId: msg.messageId,
//       recipientId: userId,
//     });
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

//   // Render media attachments
//   const renderAttachments = (attachments) => {
//     if (!attachments || attachments.length === 0) return null;

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

//   const renderMessage = (msg) => {
//     const hasContent = msg.content && msg.content.trim();
//     const hasAttachments = msg.attachments && msg.attachments.length > 0;

//     return (
//       <div className="space-y-1">
//         {hasContent && <div>{msg.content}</div>}
//         {hasAttachments && renderAttachments(msg.attachments)}
//       </div>
//     );
//   };

//   const formatTime = (timestamp) => {
//     return new Date(timestamp).toLocaleTimeString();
//   };

//   const formatDate = (timestamp) => {
//     return new Date(timestamp).toLocaleDateString();
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 p-4">
//       <div className="max-w-4xl mx-auto bg-white shadow p-6 rounded">
//         <h1 className="text-2xl font-bold mb-4">
//           🔗 SignalR Chat Tester (with Media Support)
//         </h1>

//         {!connected ? (
//           <>
//             <div className="mb-4">
//               <label className="block text-sm font-medium mb-1">
//                 🔐 JWT Token
//               </label>
//               <textarea
//                 rows={3}
//                 className="w-full border rounded px-3 py-2"
//                 value={jwt}
//                 onChange={(e) => setJwt(e.target.value)}
//               />
//             </div>
//             <button
//               onClick={connectToSignalR}
//               className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
//             >
//               Connect
//             </button>
//           </>
//         ) : (
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//             {/* Left Panel - Controls and Chat List */}
//             <div className="lg:col-span-1 space-y-6">
//               {/* User Controls */}
//               <div className="space-y-4 p-4 bg-gray-50 rounded">
//                 <div>
//                   <label className="block text-sm font-medium mb-1">
//                     👤 Your User ID
//                   </label>
//                   <input
//                     className="w-full border rounded px-3 py-2"
//                     value={userId}
//                     onChange={(e) => setUserId(e.target.value)}
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium mb-1">
//                     🎯 Recipient ID
//                   </label>
//                   <input
//                     className="w-full border rounded px-3 py-2"
//                     value={recipientId}
//                     onChange={(e) => setRecipientId(e.target.value)}
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm font-medium mb-1">
//                     💬 Message
//                   </label>
//                   <input
//                     className="w-full border rounded px-3 py-2"
//                     value={message}
//                     onChange={(e) => setMessage(e.target.value)}
//                     onKeyDown={(e) => e.key === "Enter" && sendMessage()}
//                   />
//                 </div>

//                 {/* File Selection */}
//                 <div className="space-y-2">
//                   <input
//                     type="file"
//                     ref={fileInputRef}
//                     multiple
//                     accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
//                     onChange={handleFileSelect}
//                     className="hidden"
//                   />
//                   <button
//                     onClick={() => fileInputRef.current?.click()}
//                     className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center justify-center space-x-2"
//                   >
//                     <span>📎</span>
//                     <span>Add Files</span>
//                   </button>

//                   {selectedFiles.length > 0 && (
//                     <div className="text-sm text-gray-600">
//                       {selectedFiles.length} file(s) selected
//                     </div>
//                   )}
//                 </div>

//                 <button
//                   onClick={sendMessage}
//                   disabled={uploadingMedia}
//                   className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
//                 >
//                   {uploadingMedia
//                     ? "Sending..."
//                     : selectedFiles.length > 0
//                       ? "Send Media"
//                       : "Send Message"}
//                 </button>
//               </div>

//               {/* File Preview */}
//               {showFilePicker && selectedFiles.length > 0 && (
//                 <div className="p-4 bg-yellow-50 rounded border">
//                   <div className="flex justify-between items-center mb-3">
//                     <h4 className="font-medium text-sm">Selected Files</h4>
//                     <button
//                       onClick={() => {
//                         setSelectedFiles([]);
//                         setShowFilePicker(false);
//                         if (fileInputRef.current)
//                           fileInputRef.current.value = "";
//                       }}
//                       className="text-red-600 text-sm hover:underline"
//                     >
//                       Clear All
//                     </button>
//                   </div>
//                   <div className="space-y-2 max-h-32 overflow-y-auto">
//                     {selectedFiles.map((file, index) => (
//                       <div
//                         key={index}
//                         className="flex items-center justify-between text-xs bg-white p-2 rounded"
//                       >
//                         <div className="flex items-center space-x-2 flex-1">
//                           <span>{getFileIcon(file.type)}</span>
//                           <span className="truncate">{file.name}</span>
//                           <span className="text-gray-500">
//                             ({formatFileSize(file.size)})
//                           </span>
//                         </div>
//                         <button
//                           onClick={() => removeFile(index)}
//                           className="text-red-600 hover:text-red-800 ml-2"
//                         >
//                           ✕
//                         </button>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {/* New Chat List Feature */}
//               <div className="p-4 bg-gray-50 rounded">
//                 <div className="flex justify-between items-center mb-4">
//                   <h3 className="text-lg font-semibold">💬 Chat List</h3>
//                   <button
//                     onClick={fetchConversations}
//                     disabled={loadingConversations || !userId}
//                     className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 disabled:bg-gray-400"
//                   >
//                     {loadingConversations ? "Loading..." : "Refresh"}
//                   </button>
//                 </div>

//                 {showConversations && (
//                   <div className="max-h-64 overflow-y-auto space-y-2">
//                     {conversations.length === 0 ? (
//                       <p className="text-gray-500 text-sm">
//                         No conversations found
//                       </p>
//                     ) : (
//                       conversations.map((conv) => (
//                         <div
//                           key={conv.conversationId}
//                           onClick={() =>
//                             fetchConversationMessages(conv.otherUser?.userId)
//                           }
//                           className={`p-3 border rounded cursor-pointer hover:bg-blue-50 ${
//                             selectedConversation === conv.otherUser?.userId
//                               ? "bg-blue-100 border-blue-300"
//                               : "bg-white"
//                           }`}
//                         >
//                           <div className="flex justify-between items-start">
//                             <div className="flex-1">
//                               <div className="font-medium text-sm">
//                                 {conv.otherUser?.firstName}{" "}
//                                 {conv.otherUser?.lastName}
//                               </div>
//                               <div className="text-xs text-gray-500">
//                                 @{conv.otherUser?.username}
//                               </div>
//                               {conv.lastMessage && (
//                                 <div className="text-xs text-gray-600 mt-1 truncate">
//                                   {conv.lastMessage.content ||
//                                     (conv.lastMessage.attachments?.length > 0
//                                       ? "📎 Media"
//                                       : "Message")}
//                                 </div>
//                               )}
//                             </div>
//                             <div className="text-xs text-gray-400 ml-2">
//                               {formatTime(conv.lastActivityAt)}
//                             </div>
//                           </div>
//                         </div>
//                       ))
//                     )}
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Right Panel - Messages */}
//             <div className="lg:col-span-2">
//               {/* Selected Conversation Messages */}
//               {selectedConversation && (
//                 <div className="mb-6 p-4 bg-blue-50 rounded">
//                   <h3 className="text-lg font-semibold mb-2">
//                     📨 Messages with {selectedConversation}
//                   </h3>
//                   {loadingMessages ? (
//                     <p className="text-gray-500">Loading messages...</p>
//                   ) : (
//                     <div className="max-h-64 overflow-y-auto space-y-2 bg-white p-3 rounded">
//                       {conversationMessages.length === 0 ? (
//                         <p className="text-gray-500 text-sm">
//                           No messages found
//                         </p>
//                       ) : (
//                         conversationMessages.map((msg, i) => (
//                           <div
//                             key={i}
//                             className={`p-3 rounded shadow text-sm ${
//                               msg.senderId === userId
//                                 ? "bg-blue-500 text-white text-right ml-auto max-w-xs"
//                                 : "bg-gray-200 text-left max-w-xs"
//                             }`}
//                           >
//                             {renderMessage(msg)}
//                             <div className="flex items-center justify-between mt-1">
//                               <div className="text-xs opacity-70">
//                                 {formatTime(msg.createdAt)}
//                               </div>
//                               <div className="ml-2 opacity-90 text-xs">
//                                 {msg.status === "read"
//                                   ? "👁 read"
//                                   : msg.status === "delivered"
//                                     ? "✓ delivered"
//                                     : "• sent"}
//                               </div>
//                             </div>
//                           </div>
//                         ))
//                       )}
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* Original Live Chat */}
//               <div className="border-t pt-4 max-h-64 overflow-y-auto">
//                 <h2 className="text-lg font-semibold mb-2">📨 Live Messages</h2>
//                 <div className="space-y-2">
//                   {messages.map((msg, i) => (
//                     <div
//                       key={i}
//                       onClick={() => msg.incoming && handleIncomingClick(msg)}
//                       className={`p-3 rounded shadow text-sm cursor-pointer ${
//                         msg.incoming
//                           ? "bg-gray-200 text-left max-w-xs"
//                           : "bg-blue-500 text-white text-right ml-auto max-w-xs"
//                       }`}
//                     >
//                       {renderMessage(msg)}
//                       <div className="flex items-center justify-between mt-1">
//                         <div className="text-xs opacity-70">
//                           {msg.createdAt
//                             ? new Date(msg.createdAt).toLocaleTimeString()
//                             : new Date(
//                                 msg?.createdAt || Date.now()
//                               ).toLocaleTimeString()}
//                         </div>
//                         <div className="ml-2 opacity-90">
//                           {renderStatus(msg)}
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                   <div ref={messagesEndRef} />
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


import { useEffect, useState, useRef } from "react";
import * as signalR from "@microsoft/signalr";

import "./App.css"

export default function App() {
  const [jwt, setJwt] = useState("");
  const [userId, setUserId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [connection, setConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showConversations, setShowConversations] = useState(false);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Media states
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);

  // Edit / selection states
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    console.log("Message state: ", messages);
  }, [messages]);

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
      console.error(`❌ ${endpoint} error:`, err);
      return null;
    }
  };

  const updateMessageById = (messageId, patch) => {
    setMessages((prev) =>
      prev.map((m) => (m.messageId === messageId ? { ...m, ...patch } : m))
    );
    setConversationMessages((prev) =>
      prev.map((m) => (m.messageId === messageId ? { ...m, ...patch } : m))
    );
  };

  // File handling functions (unchanged)
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

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith("image/")) return "🖼️";
    if (fileType.startsWith("video/")) return "🎥";
    if (fileType.startsWith("audio/")) return "🎵";
    if (fileType.includes("pdf")) return "📄";
    return "📎";
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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

      const res = await fetch(`http://localhost:4002/chat/${endpoint}`, {
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

  // NEW API: Get all conversations for the user
  const fetchConversations = async () => {
    try {
      setLoadingConversations(true);
      const res = await fetch(
        `http://localhost:4002/chat/conversations?page=1&limit=20`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${jwt}` },
        }
      );

      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations || []);
        setShowConversations(true);
      } else {
        throw new Error(data.error || "Failed to fetch conversations");
      }
    } catch (err) {
      console.error("❌ Fetch conversations error:", err);
      alert("❌ Failed to fetch conversations");
    } finally {
      setLoadingConversations(false);
    }
  };

  // NEW API: Get messages between two users
  const fetchConversationMessages = async (otherUserId) => {
    try {
      setLoadingMessages(true);

      const res = await fetch(
        `http://localhost:4002/chat/messages?otherUserId=${otherUserId}&page=1&limit=50`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${jwt}` },
        }
      );

      const data = await res.json();
      if (data.success) {
        // Server returns newest-first; we want oldest-first for UI
        const messagesOldestFirst = (data.messages || []).reverse();
        setConversationMessages(messagesOldestFirst);
        setSelectedConversation(otherUserId);
      } else {
        throw new Error(data.error || "Failed to fetch messages");
      }
    } catch (err) {
      console.error("❌ Fetch messages error:", err);
      alert("❌ Failed to fetch messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  const connectToSignalR = async () => {
    try {
      const res = await fetch("http://localhost:4002/negotiate", {
        method: "GET",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!res.ok) throw new Error("Negotiate failed");
      const { url, accessToken } = await res.json();
      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(url, {
          accessTokenFactory: () => accessToken,
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Handle new incoming message
      newConnection.on("newMessage", async (msg) => {
        console.log("📥 Received newMessage:", msg);
        const incomingMsg = {
          ...msg,
          incoming: true,
          status: msg.status || "sent",
        };
        setMessages((prev) => [...prev, incomingMsg]);

        // append to conversation view if matches
        if (
          selectedConversation === incomingMsg.senderId ||
          selectedConversation === incomingMsg.recipientId
        ) {
          setConversationMessages((prev) => [...prev, incomingMsg]);
        }

        if (incomingMsg.messageId) {
          postReceipt("delivered", {
            messageId: incomingMsg.messageId,
            recipientId: userId,
          }).catch((e) =>
            console.warn("Failed to post delivered receipt (non-fatal):", e)
          );
          updateMessageById(incomingMsg.messageId, {
            status: "delivered",
            deliveredAt: new Date().toISOString(),
          });
        }
      });

      // Handle receipts
      newConnection.on("messageReceipt", (receipt) => {
        if (!receipt || !receipt.messageId) return;
        updateMessageById(receipt.messageId, {
          status: receipt.status,
          ...(receipt.timestamp ? { statusAt: receipt.timestamp } : {}),
        });
      });

      // Handle updates (edits)
      newConnection.on("messageUpdated", (payload) => {
        console.log("🔧 Received messageUpdated:", payload);
        if (!payload || !payload.messageId) return;
        updateMessageById(payload.messageId, {
          content: payload.content,
          isEdited: payload.isEdited || true,
          editedAt: payload.editedAt || new Date().toISOString(),
          updatedAt: payload.updatedAt || new Date().toISOString(),
        });
      });

      // Handle deletes for everyone
      newConnection.on("messageDeleted", (payload) => {
        console.log("🗑 Received messageDeleted:", payload);
        if (!payload || !payload.messageId) return;
        // mark as deleted for everyone locally
        updateMessageById(payload.messageId, {
          content: "",
          attachments: [],
          isDeletedForEveryone: true,
          deletedForEveryoneAt: payload.deletedAt || new Date().toISOString(),
          deletedForEveryoneBy: payload.deletedBy,
        });
      });

      await newConnection.start();
      setConnection(newConnection);
      setConnected(true);
      alert("✅ Connected to SignalR!");
    } catch (err) {
      console.error("❌ Connection error:", err);
      alert("❌ Failed to connect to SignalR.");
    }
  };

  const sendMessage = async () => {
    if (selectedFiles.length > 0) {
      await sendMediaFiles();
      return;
    }

    if (!message.trim()) {
      alert("Please enter a message");
      return;
    }

    try {
      const res = await fetch("http://localhost:4002/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ recipientId, content: message }),
      });
      const data = await res.json();
      if (data.success) {
        const outgoing = {
          ...data.message,
          incoming: false,
          status: data.message?.status || "sent",
        };
        setMessages((prev) => [...prev, outgoing]);
        if (selectedConversation === recipientId) {
          setConversationMessages((prev) => [...prev, outgoing]);
        }
        setMessage("");
      } else {
        throw new Error(data.error || "Failed to send");
      }
    } catch (err) {
      console.error("❌ Send error:", err);
      alert("❌ Failed to send message");
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

  // Render attachments (unchanged)
  const renderAttachments = (attachments) => {
    if (!attachments || attachments.length === 0) return null;

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

  const renderMessageContent = (msg) => {
    // If deleted for everyone show placeholder
    if (msg.isDeletedForEveryone) {
      return <i className="opacity-80">This message was deleted</i>;
    }

    const hasContent = msg.content && msg.content.trim();
    const hasAttachments = msg.attachments && msg.attachments.length > 0;

    return (
      <div className="space-y-1">
        {hasContent && (
          <div>
            {msg.content}{" "}
            {msg.isEdited && (
              <span className="text-xs opacity-70"> (edited)</span>
            )}
          </div>
        )}
        {hasAttachments && renderAttachments(msg.attachments)}
      </div>
    );
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  // ---------- NEW: Edit / Delete / Multi-delete UI handlers ----------

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
        // update locally
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
      console.error("❌ Edit error:", err);
      alert("❌ Failed to edit message");
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
        // Remove locally from conversation and live messages
        setMessages((prev) =>
          prev.filter((m) => m.messageId !== msg.messageId)
        );
        setConversationMessages((prev) =>
          prev.filter((m) => m.messageId !== msg.messageId)
        );
        // Also clear checkbox if present
        setSelectedMessageIds((prev) =>
          prev.filter((id) => id !== msg.messageId)
        );
      } else {
        throw new Error(data.error || "Delete for me failed");
      }
    } catch (err) {
      console.error("❌ Delete for me error:", err);
      alert("❌ Failed to delete message for you");
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
        // mark locally as deleted for everyone
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
      console.error("❌ Delete for everyone error:", err);
      alert("❌ Failed to delete message for everyone");
    }
  };

  const toggleSelectMessage = (messageId) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
  };

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
      console.error("❌ Bulk delete error:", err);
      alert("❌ Failed to delete selected messages");
    }
  };

  // ---------- RENDER ----------
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto bg-white shadow p-6 rounded">
        <h1 className="text-2xl font-bold mb-4">
          🔗 SignalR Chat Tester (with Media & Edit/Unsend)
        </h1>

        {!connected ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                🔐 JWT Token
              </label>
              <textarea
                rows={3}
                className="w-full border rounded px-3 py-2"
                value={jwt}
                onChange={(e) => setJwt(e.target.value)}
              />
            </div>
            <button
              onClick={connectToSignalR}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Connect
            </button>
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel */}
            <div className="lg:col-span-1 space-y-6">
              <div className="space-y-4 p-4 bg-gray-50 rounded">
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
                  <label className="block text-sm font-medium mb-1">
                    💬 Message
                  </label>
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
              {showFilePicker && selectedFiles.length > 0 && (
                <div className="p-4 bg-yellow-50 rounded border">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-sm">Selected Files</h4>
                    <button
                      onClick={() => {
                        setSelectedFiles([]);
                        setShowFilePicker(false);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-xs bg-white p-2 rounded"
                      >
                        <div className="flex items-center space-x-2 flex-1">
                          <span>{getFileIcon(file.type)}</span>
                          <span className="truncate">{file.name}</span>
                          <span className="text-gray-500">
                            ({formatFileSize(file.size)})
                          </span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-800 ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat List */}
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
                      <p className="text-gray-500 text-sm">
                        No conversations found
                      </p>
                    ) : (
                      conversations.map((conv) => (
                        <div
                          key={conv.conversationId}
                          onClick={() =>
                            fetchConversationMessages(conv.otherUser?.userId)
                          }
                          className={`p-3 border rounded cursor-pointer hover:bg-blue-50 ${selectedConversation === conv.otherUser?.userId ? "bg-blue-100 border-blue-300" : "bg-white"}`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {conv.otherUser?.firstName}{" "}
                                {conv.otherUser?.lastName}
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

              {/* Bulk actions */}
              <div className="p-4 bg-gray-50 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    Selected: {selectedMessageIds.length}
                  </div>
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
            </div>

            {/* Right Panel - Messages */}
            <div className="lg:col-span-2">
              {/* Selected Conversation Messages */}
              {selectedConversation && (
                <div className="mb-6 p-4 bg-blue-50 rounded">
                  <h3 className="text-lg font-semibold mb-2">
                    📨 Messages with {selectedConversation}
                  </h3>
                  {loadingMessages ? (
                    <p className="text-gray-500">Loading messages...</p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-2 bg-white p-3 rounded">
                      {conversationMessages.length === 0 ? (
                        <p className="text-gray-500 text-sm">
                          No messages found
                        </p>
                      ) : (
                        conversationMessages.map((msg, i) => (
                          <div
                            key={msg.messageId || i}
                            className="flex items-start space-x-2"
                          >
                            <div>
                              <input
                                type="checkbox"
                                checked={selectedMessageIds.includes(
                                  msg.messageId
                                )}
                                onChange={() =>
                                  toggleSelectMessage(msg.messageId)
                                }
                              />
                            </div>
                            <div
                              className={`p-3 rounded shadow text-sm ${msg.senderId === userId ? "bg-blue-500 text-white ml-auto text-right" : "bg-gray-200 text-left"}`}
                              style={{ maxWidth: "70%" }}
                            >
                              {editingMessageId === msg.messageId ? (
                                <>
                                  <textarea
                                    value={editingText}
                                    onChange={(e) =>
                                      setEditingText(e.target.value)
                                    }
                                    className="w-full p-2 rounded mb-2"
                                  />
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={cancelEditing}
                                      className="px-2 py-1 bg-gray-200 rounded"
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
                                  {renderMessageContent(msg)}
                                  <div className="flex items-center justify-between mt-1">
                                    <div className="text-xs opacity-70">
                                      {formatTime(msg.createdAt)}
                                    </div>
                                    <div className="ml-2 opacity-90 text-xs">
                                      {msg.status === "read"
                                        ? "👁 read"
                                        : msg.status === "delivered"
                                          ? "✓ delivered"
                                          : "• sent"}
                                    </div>
                                  </div>
                                  <div className="mt-2 flex justify-end space-x-2 text-xs">
                                    {msg.senderId === userId &&
                                      !msg.isDeletedForEveryone && (
                                        <>
                                          <button
                                            onClick={() => startEditing(msg)}
                                            className="px-2 py-1 bg-yellow-200 rounded"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() =>
                                              deleteForEveryone(msg)
                                            }
                                            className="px-2 py-1 bg-red-600 text-white rounded"
                                          >
                                            Unsend
                                          </button>
                                        </>
                                      )}
                                    <button
                                      onClick={() => deleteForMe(msg)}
                                      className="px-2 py-1 bg-gray-200 rounded"
                                    >
                                      Delete for me
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Original Live Chat */}
              <div className="border-t pt-4 max-h-64 overflow-y-auto">
                <h2 className="text-lg font-semibold mb-2">📨 Live Messages</h2>
                <div className="space-y-2">
                  {messages.map((msg, i) => (
                    <div
                      key={msg.messageId || i}
                      onClick={() => msg.incoming && handleIncomingClick(msg)}
                      className={`p-3 rounded shadow text-sm cursor-pointer ${msg.incoming ? "bg-gray-200 text-left max-w-xs" : "bg-blue-500 text-white text-right ml-auto max-w-xs"}`}
                    >
                      {/* Small checkbox for selecting from live messages too */}
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedMessageIds.includes(msg.messageId)}
                          onChange={() => toggleSelectMessage(msg.messageId)}
                        />
                        <div style={{ flex: 1 }}>
                          {editingMessageId === msg.messageId ? (
                            <>
                              <textarea
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                className="w-full p-2 rounded mb-2"
                              />
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={cancelEditing}
                                  className="px-2 py-1 bg-gray-200 rounded"
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
                              {renderMessageContent(msg)}
                              <div className="flex items-center justify-between mt-1">
                                <div className="text-xs opacity-70">
                                  {msg.createdAt
                                    ? new Date(
                                        msg.createdAt
                                      ).toLocaleTimeString()
                                    : new Date().toLocaleTimeString()}
                                </div>
                                <div className="ml-2 opacity-90">
                                  {renderStatus(msg)}
                                </div>
                              </div>
                              <div className="mt-2 flex justify-end space-x-2 text-xs">
                                {msg.senderId === userId &&
                                  !msg.isDeletedForEveryone && (
                                    <>
                                      <button
                                        onClick={() => startEditing(msg)}
                                        className="px-2 py-1 bg-yellow-200 rounded"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => deleteForEveryone(msg)}
                                        className="px-2 py-1 bg-red-600 text-white rounded"
                                      >
                                        Unsend
                                      </button>
                                    </>
                                  )}
                                <button
                                  onClick={() => deleteForMe(msg)}
                                  className="px-2 py-1 bg-gray-200 rounded"
                                >
                                  Delete for me
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
