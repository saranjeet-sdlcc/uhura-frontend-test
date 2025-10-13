// src/components/GroupChat.jsx
// import { useEffect, useState, useRef, useCallback, useMemo } from "react";
// import FilePreview from "./FilePreview";
// // import { useParams } from "react-router-dom";

// import * as signalR from "@microsoft/signalr";

// export default function GroupChat({ jwt, userId }) {
//   const [connection, setConnection] = useState(null);

//   // Groups & selection
//   const [groups, setGroups] = useState([]);
//   const [selectedGroup, setSelectedGroup] = useState(null);
//   const selectedGroupRef = useRef(null);

//   // Messages for the selected group only (live via SignalR)
//   const [messages, setMessages] = useState([]);

//   // Composer state
//   const [text, setText] = useState("");
//   const [selectedFiles, setSelectedFiles] = useState([]);
//   const [showFilePicker, setShowFilePicker] = useState(false);
// const [isPinning, setIsPinning] = useState(false);
// const [searchQuery, setSearchQuery] = useState("");
// const [showStarred, setShowStarred] = useState(false);
// const [starredMessages, setStarredMessages] = useState([]);
//   const [replyingTo, setReplyingTo] = useState(null);

//   // Create/Edit group state
//   const [groupName, setGroupName] = useState("");
//   const [memberCsv, setMemberCsv] = useState("");
//   const [description, setDescription] = useState("");
//   const [editName, setEditName] = useState("");
//   const [editDesc, setEditDesc] = useState("");

//   // Members drawer
//   const [drawerOpen, setDrawerOpen] = useState(false);
//   const [addMembersInput, setAddMembersInput] = useState("");

//   // Optional typing indicator (will show if backend emits `typing` events)
//   const [typingBy, setTypingBy] = useState(new Set());

//   // Permissions (keep existing flag + infer from membership)
//   const [canPost, setCanPost] = useState(false);

//   // Refs
//   const messagesEndRef = useRef(null);
//   const fileInputRef = useRef(null);
//   const observerRef = useRef(null);
//   const visibleMsgIdsRef = useRef(new Set());

//   // For optimistic send & reconciliation
//   const pendingLocalIdsRef = useRef({}); // tempId -> { content, createdAt }

//   /* ------------------ Helpers ------------------ */

//   const currentGroupId = useMemo(
//     () => selectedGroup?.groupId || null,
//     [selectedGroup]
//   );

//   const isAdmin = useMemo(() => {
//     if (!selectedGroup) return false;
//     return Array.isArray(selectedGroup.admins) && selectedGroup.admins.includes(userId);
//   }, [selectedGroup, userId]);

//   const isMember = useMemo(() => {
//     if (!selectedGroup) return false;
//     return Array.isArray(selectedGroup.members) && selectedGroup.members.includes(userId);
//   }, [selectedGroup, userId]);

//   const scrollToBottom = () =>
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

//   useEffect(() => {
//     scrollToBottom();
//   }, [messages]);

//   // Keep a ref for the currently selected group to avoid stale closures in SignalR handlers
//   useEffect(() => {
//     selectedGroupRef.current = selectedGroup;
//     // If you were removed, you can’t post anymore
//     setCanPost(selectedGroup?.canPost !== false && isMember);
//   }, [selectedGroup, isMember]);

//   // Create an IntersectionObserver to mark messages as READ when visible
//   useEffect(() => {
//     if (!jwt) return;

//     // Cleanup previous observer
//     if (observerRef.current) {
//       observerRef.current.disconnect();
//       observerRef.current = null;
//     }

//     const observer = new IntersectionObserver(
//       (entries) => {
//         entries.forEach(async (entry) => {
//           const el = entry.target;
//           const mid = el.getAttribute("data-mid");
//           const sender = el.getAttribute("data-sender");
//           const status = el.getAttribute("data-status");

//           // Only mark as read for others' messages that are not already read
//           if (
//             entry.isIntersecting &&
//             mid &&
//             sender &&
//             sender !== userId &&
//             status !== "read"
//           ) {
//             if (!visibleMsgIdsRef.current.has(mid)) {
//               visibleMsgIdsRef.current.add(mid);
//               try {
//                 await fetch(`http://localhost:4002/groups/messages/read`, {
//                   method: "POST",
//                   headers: {
//                     "Content-Type": "application/json",
//                     Authorization: `Bearer ${jwt}`,
//                   },
//                   body: JSON.stringify({ messageId: mid }),
//                 });
//               } catch (e) {
//                 console.warn("mark read failed:", e);
//               }
//             }
//           }
//         });
//       },
//       { threshold: 0.6 }
//     );
//     observerRef.current = observer;

//     // Observe current messages
//     setTimeout(() => {
//       document
//         .querySelectorAll("[data-mid]")
//         .forEach((el) => observer.observe(el));
//     }, 0);

//     return () => observer.disconnect();
//   }, [messages, jwt, userId]);

//   /* ------------------ SignalR connect ------------------ */
//   const connect = useCallback(async () => {
//     try {
//       const res = await fetch("http://localhost:4002/negotiate", {
//         headers: { Authorization: `Bearer ${jwt}` },
//       });
//       const { url, accessToken } = await res.json();

//       const conn = new signalR.HubConnectionBuilder()
//         .withUrl(url, { accessTokenFactory: () => accessToken })
//         .withAutomaticReconnect()
//         .configureLogging(signalR.LogLevel.Information)
//         .build();

//       // 🔔 New message (group + 1:1 share same channel)
//       conn.on("newMessage", async (msg) => {
//         if (!msg?.isGroup || !msg?.groupId) return;

//         // Only show in the currently open chat
//         const openGroupId = selectedGroupRef.current?.groupId;
//         if (msg.groupId !== openGroupId) return;

//         // If this message came from someone else, mark delivered immediately
//         if (msg.senderId !== userId && msg.status === "sent") {
//           try {
//             await fetch(`http://localhost:4002/groups/messages/delivered`, {
//               method: "POST",
//               headers: {
//                 "Content-Type": "application/json",
//                 Authorization: `Bearer ${jwt}`,
//               },
//               body: JSON.stringify({ messageId: msg.messageId }),
//             });
//           } catch (e) {
//             console.warn("mark delivered failed:", e);
//           }
//         }

//         // Reconcile optimistic local message (same sender + same content within short window)
//         let replaced = false;
//         const tempIds = Object.keys(pendingLocalIdsRef.current);
//         if (msg.senderId === userId && tempIds.length) {
//           const candidateId = tempIds.find((k) => {
//             const item = pendingLocalIdsRef.current[k];
//             if (!item) return false;
//             const timeGap = Math.abs(new Date(msg.createdAt) - new Date(item.createdAt));
//             return item.content === msg.content && timeGap < 8000; // 8s window
//           });
//           if (candidateId) {
//             setMessages((prev) =>
//               prev.map((m) =>
//                 m.messageId === candidateId
//                   ? { ...msg, isLocal: false } // replace temp with real server msg
//                   : m
//               )
//             );
//             delete pendingLocalIdsRef.current[candidateId];
//             replaced = true;
//           }
//         }

//         if (!replaced) {
//           setMessages((prev) => {
//             // 🧩 Prevent duplicates (same messageId already exists)
//             if (prev.some((m) => m.messageId === msg.messageId)) return prev;
//             // Ensure atomic update
//             const updated = [...prev, msg];
//             return updated;
//           });
//         }

//       });

//       // ✏️ Edited
//       conn.on("messageEdited", (msg) => {
//         if (!msg?.groupId) return;
//         if (msg.groupId !== selectedGroupRef.current?.groupId) return;
//         setMessages((prev) =>
//           prev.map((m) => (m.messageId === msg.messageId ? { ...m, ...msg } : m))
//         );
//       });

//       // 🗑️ Deleted
//       conn.on("messageDeleted", ({ messageId, forEveryone, groupId }) => {
//         if (groupId && groupId !== selectedGroupRef.current?.groupId) return;
//         setMessages((prev) =>
//           prev.map((m) =>
//             m.messageId === messageId
//               ? {
//                 ...m,
//                 content: forEveryone ? "🗑️ message deleted" : "",
//                 deleted: true,
//               }
//               : m
//           )
//         );
//       });

//       conn.on("reactionUpdated", ({ groupId, messageId, emoji, users }) => {
//         if (groupId !== selectedGroupRef.current?.groupId) return;
//         setMessages((prev) =>
//           prev.map((m) =>
//             m.messageId === messageId
//               ? {
//                 ...m,
//                 reactions: { ...(m.reactions || {}), [emoji]: users },
//               }
//               : m
//           )
//         );
//       });

// conn.on("messageStarred", ({ groupId, messageId, action }) => {
//   if (groupId !== selectedGroupRef.current?.groupId) return;
//   setMessages((prev) =>
//     prev.map((m) =>
//       m.messageId === messageId ? { ...m, isStarred: action === "starred" } : m
//     )
//   );
// });

//       // ✓ receipts
//  conn.on("messageReceipt", ({ messageId, status, from, groupId, timestamp }) => {
//   if (groupId && groupId !== selectedGroupRef.current?.groupId) return;
//   setMessages((prev) => {
//     const messageExists = prev.some((m) => m.messageId === messageId);
//     if (!messageExists) return prev; // Skip if message isn’t in current view
//     return prev.map((m) =>
//       m.messageId === messageId
//         ? {
//             ...m,
//             status,
//             deliveredTo:
//               status === "delivered"
//                 ? [...(m.deliveredTo || []), { userId: from, timestamp }]
//                 : m.deliveredTo,
//             readBy:
//               status === "read"
//                 ? [...(m.readBy || []), { userId: from, timestamp }]
//                 : m.readBy,
//           }
//         : m
//     );
//   });
// });

//       // Optional typing indicator (no backend change required, but server must emit)
//       conn.on("typing", ({ groupId, userId: who, isTyping }) => {
//   if (!groupId || groupId !== selectedGroupRef.current?.groupId) return;
//   setTypingBy((prev) => {
//     const next = new Set(Array.from(prev));
//     if (isTyping) next.add(who);
//     else next.delete(who);
//     return next;
//   });
//   // Clear existing timeout for this user
//   const timeoutKey = `typingTimeout_${who}`;
//   clearTimeout(window[timeoutKey]);
//   // Set auto-clear only for typing start
//   if (isTyping) {
//     window[timeoutKey] = setTimeout(() => {
//       setTypingBy((prev) => {
//         const next = new Set(Array.from(prev));
//         next.delete(who);
//         return next;
//       });
//     }, 4000);
//   }
// });

//       // Group meta updates
//       conn.on("groupUpdated", async (evt) => {
//         // server should emit { type: "...", groupId, memberId? }
//         const openGroupId = selectedGroupRef.current?.groupId;

//         if (evt.type === "groupDeleted" && evt.groupId === openGroupId) {
//           alert("🚨 Group deleted by admin");
//           setSelectedGroup(null);
//           setMessages([]);
//           return;
//         }

//         if (evt.type === "memberRemoved" && evt.groupId === openGroupId && evt.memberId === userId) {
//           alert("🚫 You were removed from this group");
//           setSelectedGroup(null);
//           setMessages([]);
//           return;
//         }

//         if (evt.type === "messagePinned" && evt.groupId === openGroupId) {
//           setSelectedGroup((prev) => ({
//             ...prev,
//             pinnedMessage: evt.pinned,
//           }));
//         }

//         if (evt.type === "unpinned" && evt.groupId === openGroupId) {
//           setSelectedGroup((prev) => ({
//             ...prev,
//             pinnedMessage: null,
//           }));
//         }

//         // Re-fetch group info only for metadata changes (name, description, members)
//         if (["groupDeleted", "memberAdded", "memberRemoved", "groupUpdated"].includes(evt.type)) {
//           await fetchGroupDetails(openGroupId);
//         }

//         fetchGroups(); // refresh sidebar list
//       });


//       await conn.start();
//       setConnection(conn);
//       console.log("✅ Connected to chat hub");
//     } catch (err) {
//       console.error("❌ SignalR connection error:", err);
//     }
//   }, [jwt, userId]);

//   /* ------------------ Groups ------------------ */
//   const fetchGroups = async () => {
//     try {
//       const res = await fetch("http://localhost:4002/groups", {
//         headers: { Authorization: `Bearer ${jwt}` },
//       });
//       const data = await res.json();
//       setGroups(data.groups || []);
//     } catch (e) {
//       console.error("fetchGroups error:", e);
//     }
//   };

//   //   const fetchGroupDetails = async (groupId) => {
//   //     try {
//   //       const g = await fetch(`http://localhost:4002/groups/${groupId}`, {
//   //         headers: { Authorization: `Bearer ${jwt}` },
//   //       });
//   //       const gd = await g.json();
//   //       if (!gd.success) return;

//   //       setSelectedGroup(gd.group);
//   //       setEditName(gd.group.name);
//   //       setEditDesc(gd.group.description);

//   //       // You can post only if you're still a member & canPost isn’t disabled by server
//   // const allowed = gd.group.canPost !== false && Array.isArray(gd.group.members) && gd.group.members.includes(userId);
//   //       setCanPost(allowed);

//   //       // Clear messages; from now, only real-time flow fills them
//   //       setMessages([]);
//   //       setDrawerOpen(false); // close drawer when switching groups
//   //     } catch (e) {
//   //       console.error("fetchGroupDetails error:", e);
//   //     }
//   //   };


//   const fetchGroupDetails = async (groupId) => {
//     try {
//       const g = await fetch(`http://localhost:4002/groups/${groupId}`, {
//         headers: { Authorization: `Bearer ${jwt}` },
//       });
//       const gd = await g.json();
//       if (!gd.success) return;

//       setSelectedGroup(gd.group);
//       setEditName(gd.group.name);
//       setEditDesc(gd.group.description);

//       // You can post only if you're still a member & canPost isn’t disabled by server
//       const allowed = gd.group.canPost !== false && Array.isArray(gd.group.members) && gd.group.members.includes(userId);
//       setCanPost(allowed);

//       setDrawerOpen(false); // close drawer when switching groups
//     } catch (e) {
//       console.error("fetchGroupDetails error:", e);
//     }
//   };


//   /* ------------------ Admin actions (EXISTING endpoints) ------------------ */
//   // ADD members: POST /groups/:groupId/members  { memberIds: [] }
//   const addMembers = async (ids) => {
//     if (!selectedGroup) return;
//     const memberIds =
//       Array.isArray(ids) && ids.length
//         ? ids
//         : addMembersInput.split(",").map((x) => x.trim()).filter(Boolean);
//     if (!memberIds.length) return;

//     try {
//       await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/members`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
//         body: JSON.stringify({ memberIds }),
//       });
//       setAddMembersInput("");
//       fetchGroupDetails(selectedGroup.groupId);
//     } catch (e) {
//       console.error("addMembers error:", e);
//     }
//   };

//   // REMOVE single member: DELETE /groups/:groupId/members  { memberId: "..." }
//   const removeMember = async (memberId) => {
//     if (!selectedGroup || !memberId) return;

//     // Front-end guards per your rules:
//     const isTargetAdmin = selectedGroup.admins?.includes(memberId);
//     const isCreator = selectedGroup.createdBy === memberId;

//     if (isTargetAdmin) {
//       alert("Admins cannot remove other admins.");
//       return;
//     }
//     if (isCreator) {
//       alert("No one can remove the group creator.");
//       return;
//     }

//     try {
//       await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/members`, {
//         method: "DELETE",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
//         body: JSON.stringify({ memberId }),
//       });

//       // If you removed yourself, leave the view
//       if (memberId === userId) {
//         setSelectedGroup(null);
//         setMessages([]);
//       } else {
//         fetchGroupDetails(selectedGroup.groupId);
//       }
//     } catch (e) {
//       console.error("removeMember error:", e);
//     }
//   };

//   // MAKE ADMIN (if your backend route exists)
//   const makeAdmin = async (memberId) => {
//     if (!selectedGroup || !memberId) return;
//     try {
//       await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/make-admin`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
//         body: JSON.stringify({ memberId }),
//       });
//       fetchGroupDetails(selectedGroup.groupId);
//     } catch (e) {
//       console.error("makeAdmin error:", e);
//     }
//   };

//   // 🆕 Remove Admin
//   const removeAdmin = async (memberId) => {
//     if (!selectedGroup) return;
//     if (!window.confirm("Remove this member as admin?")) return;
//     try {
//       await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/remove-admin`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
//         body: JSON.stringify({ memberId }),
//       });
//       fetchGroupDetails(selectedGroup.groupId);
//     } catch (e) {
//       console.error("removeAdmin error:", e);
//     }
//   };


//   // LEAVE group: POST /groups/:groupId/leave
//   const leaveGroup = async () => {
//     if (!selectedGroup) return;
//     if (!window.confirm("Are you sure you want to leave this group?")) return;
//     try {
//       await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/leave`, {
//         method: "POST",
//         headers: { Authorization: `Bearer ${jwt}` },
//       });
//       setSelectedGroup(null);
//       setMessages([]);
//       fetchGroups();
//     } catch (e) {
//       console.error("leaveGroup error:", e);
//     }
//   };

//   /* ------------------ Create / Update Group ------------------ */
//   const createGroup = async () => {
//     const body = {
//       name: groupName,
//       description,
//       memberIds: memberCsv.split(",").map((x) => x.trim()).filter(Boolean),
//     };
//     try {
//       await fetch("http://localhost:4002/groups", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${jwt}`,
//         },
//         body: JSON.stringify(body),
//       });
//       setGroupName("");
//       setDescription("");
//       setMemberCsv("");
//       fetchGroups();
//     } catch (e) {
//       console.error("createGroup error:", e);
//     }
//   };

//   const updateGroup = async () => {
//     if (!selectedGroup) return;
//     try {
//       await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}`, {
//         method: "PATCH",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${jwt}`,
//         },
//         body: JSON.stringify({ name: editName, description: editDesc }),
//       });
//       fetchGroupDetails(selectedGroup.groupId);
//     } catch (e) {
//       console.error("updateGroup error:", e);
//     }
//   };

//   // File validation (reuse from one-to-one chat)
//   const handleFileSelect = (event) => {
//     const files = Array.from(event.target.files);
//     const maxSize = 100 * 1024 * 1024;
//     const allowedTypes = [
//       "image/jpeg",
//       "image/jpg",
//       "image/png",
//       "image/gif",
//       "image/webp",
//       "video/mp4",
//       "video/mov",
//       "video/webm",
//       "audio/mp3",
//       "audio/wav",
//       "audio/aac",
//       "application/pdf",
//       "text/plain",
//     ];

//     const validFiles = [];
//     const errors = [];

//     files.forEach((file) => {
//       if (file.size > maxSize) {
//         errors.push(`${file.name}: Too large (>100MB)`);
//       } else if (!allowedTypes.includes(file.type.toLowerCase())) {
//         errors.push(`${file.name}: Not supported`);
//       } else {
//         validFiles.push(file);
//       }
//     });

//     if (errors.length > 0) alert(errors.join("\n"));
//     if (validFiles.length > 0) {
//       setSelectedFiles(validFiles);
//       setShowFilePicker(true);
//     }
//   };
//   // 🆕 Reply to message (set or cancel reply target)
//   const startReply = (msg) => {
//     setReplyingTo(msg);
//     scrollToBottom();
//   };

//   const cancelReply = () => setReplyingTo(null);


//   /* ------------------ Messaging ------------------ */
//   // const sendMessage = async () => {
//   //   if (!selectedGroup || !canPost) {
//   //     if (!isMember) alert("You are not a member of this group.");
//   //     return;
//   //   }
//   //   if (!text.trim() && selectedFiles.length === 0) return;

//   //   const headers = { Authorization: `Bearer ${jwt}` };
//   //   let body;
//   //   let endpoint = `http://localhost:4002/groups/${selectedGroup.groupId}/messages`;

//   //   // Optimistic bubble for sender
//   //   const tempId = "local-" + Date.now();
//   //   const now = new Date().toISOString();
//   //   const optimistic = {
//   //     messageId: tempId,
//   //     groupId: selectedGroup.groupId,
//   //     isGroup: true,
//   //     senderId: userId,
//   //     content: text,
//   //     attachments: [],
//   //     createdAt: now,
//   //     status: "sent",
//   //     isLocal: true,
//   //   };
//   //   setMessages((prev) => [...prev, optimistic]);
//   //   pendingLocalIdsRef.current[tempId] = { content: text, createdAt: now };

//   //   try {
//   //     if (selectedFiles.length > 0) {
//   //       const fd = new FormData();
//   //       fd.append("content", text);
//   //       selectedFiles.forEach((file) => {
//   //         fd.append("media", file);
//   //       });

//   //       // choose correct endpoint
//   //       endpoint += selectedFiles.length > 1 ? "/multiple-media" : "/media";
//   //       body = fd;
//   //     }
//   //     else {
//   //       headers["Content-Type"] = "application/json";
//   //       body = JSON.stringify({
//   //         content: text,
//   //         ...(replyingTo && { replyToMessageId: replyingTo.messageId }),
//   //       });
//   //     }

//   //     await fetch(endpoint, { method: "POST", headers, body });
//   //     // server broadcast will replace/append the final message
//   //   } catch (e) {
//   //     console.error("sendMessage error:", e);
//   //     // mark optimistic as failed
//   //     setMessages((prev) =>
//   //       prev.map((m) => (m.messageId === tempId ? { ...m, status: "failed" } : m))
//   //     );
//   //   } finally {
//   //     setShowFilePicker(false);
//   //     if (fileInputRef.current) fileInputRef.current.value = "";
//   //     setText("");
//   //     setSelectedFiles([]);
//   //     setReplyingTo(null);
//   //   }
//   // };

// const searchMessages = async () => {
//   if (!searchQuery.trim() || !selectedGroup) return;
//   try {
//     const res = await fetch(
//       `http://localhost:4002/groups/${selectedGroup.groupId}/messages/search?query=${encodeURIComponent(
//         searchQuery
//       )}`,
//       {
//         headers: { Authorization: `Bearer ${jwt}` },
//       }
//     );
//     const data = await res.json();
//     if (data.success && Array.isArray(data.messages)) {
//       setMessages(data.messages);
//     } else {
//       alert("Failed to search messages: " + (data.error || "No results found"));
//     }
//   } catch (e) {
//     console.error("searchMessages error:", e);
//     alert("Error searching messages");
//   }
// };

// const toggleStar = async (msgId) => {
//   const message = messages.find(m => m.messageId === msgId);
//   const wasStarred = message?.isStarred || false;
//   // Optimistic update
//   setMessages(prev =>
//     prev.map(m =>
//       m.messageId === msgId ? { ...m, isStarred: !wasStarred } : m
//     )
//   );
//   try {
//     const res = await fetch(`http://localhost:4002/groups/messages/${msgId}/star`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
//     });
//     const data = await res.json();
//     if (!data.success) {
//       // Revert on failure
//       setMessages(prev =>
//         prev.map(m =>
//           m.messageId === msgId ? { ...m, isStarred: wasStarred } : m
//         )
//       );
//       alert("Failed to star/unstar message: " + data.error);
//     }
//   } catch (e) {
//     console.error("toggleStar error:", e);
//     // Revert on error
//     setMessages(prev =>
//       prev.map(m =>
//         m.messageId === msgId ? { ...m, isStarred: wasStarred } : m
//       )
//     );
//     alert("Error starring/unstarring message");
//   }
// };
// const loadStarredMessages = async () => {
//   try {
//     const res = await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/starred`, {
//       headers: { Authorization: `Bearer ${jwt}` },
//     });
//     const data = await res.json();
//     if (data.success) {
//       setStarredMessages(data.starredMessages || []);
//       setShowStarred(true);
//     } else {
//       alert("Failed to load starred messages: " + data.error);
//     }
//   } catch (e) {
//     console.error("loadStarredMessages error:", e);
//     alert("Error loading starred messages");
//   }
// };


//   // const sendMessage = async () => {
//   //   if (!selectedGroup || !canPost) {
//   //     if (!isMember) alert("You are not a member of this group.");
//   //     return;
//   //   }
//   //   if (!text.trim() && selectedFiles.length === 0) return;

//   //   const headers = { Authorization: `Bearer ${jwt}` };
//   //   let body;
//   //   let endpoint = `http://localhost:4002/groups/${selectedGroup.groupId}/messages`;

//   //   // Optimistic bubble for sender
//   //   const tempId = "local-" + Date.now();
//   //   const now = new Date().toISOString();
//   //   const optimistic = {
//   //     messageId: tempId,
//   //     groupId: selectedGroup.groupId,
//   //     isGroup: true,
//   //     senderId: userId,
//   //     content: text,
//   //     attachments: selectedFiles.map((file) => ({
//   //       fileName: file.name,
//   //       fileType: file.type.split("/")[0],
//   //       url: URL.createObjectURL(file), // Temporary URL for optimistic preview
//   //     })),
//   //     createdAt: now,
//   //     status: "sending",
//   //     isLocal: true,
//   //   };
//   //   setMessages((prev) => [...prev, optimistic]);
//   //   pendingLocalIdsRef.current[tempId] = { content: text, createdAt: now };

//   //   // Clear inputs immediately for snappy UI
//   //   setText("");
//   //   setSelectedFiles([]);
//   //   setShowFilePicker(false);
//   //   if (fileInputRef.current) fileInputRef.current.value = "";
//   //   setReplyingTo(null);

//   //   try {
//   //     if (selectedFiles.length > 0) {
//   //       const fd = new FormData();
//   //       fd.append("content", text);
//   //       selectedFiles.forEach((file) => {
//   //         fd.append("media", file);
//   //       });
//   //       endpoint += selectedFiles.length > 1 ? "/multiple-media" : "/media";
//   //       body = fd;
//   //     } else {
//   //       headers["Content-Type"] = "application/json";
//   //       body = JSON.stringify({
//   //         content: text,
//   //         ...(replyingTo && { replyToMessageId: replyingTo.messageId }),
//   //       });
//   //     }

//   //     const res = await fetch(endpoint, { method: "POST", headers, body });
//   //     if (!res.ok) throw new Error("Failed to send message");
//   //     // Server broadcast will replace/append the final message
//   //   } catch (e) {
//   //     console.error("sendMessage error:", e);
//   //     setMessages((prev) =>
//   //       prev.map((m) => (m.messageId === tempId ? { ...m, status: "failed" } : m))
//   //     );
//   //   }
//   // };


// const sendMessage = async () => {
//   if (!selectedGroup || !canPost) {
//     if (!isMember) alert("You are not a member of this group.");
//     return;
//   }
//   if (!text.trim() && selectedFiles.length === 0) return;

//   const headers = { Authorization: `Bearer ${jwt}` };
//   let body;
//   let endpoint = `http://localhost:4002/groups/${selectedGroup.groupId}/messages`;

//   // Optimistic bubble for sender
//   const tempId = "local-" + Date.now();
//   const now = new Date().toISOString();
//   const tempUrls = selectedFiles.map((file) => URL.createObjectURL(file));
//   const optimistic = {
//     messageId: tempId,
//     groupId: selectedGroup.groupId,
//     isGroup: true,
//     senderId: userId,
//     content: text,
//     attachments: selectedFiles.map((file, idx) => ({
//       fileName: file.name,
//       fileType: file.type.split("/")[0],
//       url: tempUrls[idx],
//     })),
//     createdAt: now,
//     status: "sending",
//     isLocal: true,
//     replyTo: replyingTo,
//   };
//   setMessages((prev) => [...prev, optimistic]);
//   pendingLocalIdsRef.current[tempId] = { content: text, createdAt: now, files: selectedFiles, replyTo: replyingTo, tempUrls };

//   try {
//     if (selectedFiles.length > 0) {
//       const fd = new FormData();
//       fd.append("content", text);
//       selectedFiles.forEach((file) => {
//         fd.append("media", file);
//       });
//       endpoint += selectedFiles.length > 1 ? "/multiple-media" : "/media";
//       body = fd;
//     } else {
//       headers["Content-Type"] = "application/json";
//       body = JSON.stringify({
//         content: text,
//         ...(replyingTo && { replyToMessageId: replyingTo.messageId }),
//       });
//     }

//     const res = await fetch(endpoint, { method: "POST", headers, body });
//     if (!res.ok) throw new Error("Failed to send message");
//     // Clear inputs on success
//     setText("");
//     setSelectedFiles([]);
//     setShowFilePicker(false);
//     setReplyingTo(null);
//     // Server broadcast will replace/append the final message
//   } catch (e) {
//     console.error("sendMessage error:", e);
//     setMessages((prev) =>
//       prev.map((m) => (m.messageId === tempId ? { ...m, status: "failed" } : m))
//     );
//     // Restore inputs on failure
//     const pending = pendingLocalIdsRef.current[tempId];
//     if (pending) {
//       setText(pending.content);
//       setSelectedFiles(pending.files || []);
//       setShowFilePicker(pending.files?.length > 0);
//       setReplyingTo(pending.replyTo || null);
//     }
//   } finally {
//     // Revoke temporary URLs
//     const pending = pendingLocalIdsRef.current[tempId];
//     if (pending?.tempUrls) {
//       pending.tempUrls.forEach((url) => URL.revokeObjectURL(url));
//     }
//     delete pendingLocalIdsRef.current[tempId];
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   }
// };


//   const editMessage = async (msgId, newText) => {
//     if (!newText) return;
//     try {
//       await fetch(`http://localhost:4002/groups/messages/${msgId}/edit`, {
//         method: "PATCH",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
//         body: JSON.stringify({ newContent: newText }),
//       });
//     } catch (e) {
//       console.error("editMessage error:", e);
//     }
//   };

//   const deleteMessage = async (msgId) => {
//     if (!window.confirm("Delete this message for everyone?")) return;
//     try {
//       await fetch(`http://localhost:4002/groups/messages/${msgId}/delete`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
//         body: JSON.stringify({ forEveryone: true }),
//       });
//     } catch (e) {
//       console.error("deleteMessage error:", e);
//     }
//   };

//   // 🆕 Delete for Me (local delete)
//   const deleteMessageForMe = async (msgId) => {
//     if (!window.confirm("Delete this message only for you?")) return;
//     try {
//       await fetch(`http://localhost:4002/groups/messages/${msgId}/delete-for-me`, {
//         method: "DELETE",
//         headers: { Authorization: `Bearer ${jwt}` },
//       });
//       // locally hide
//       setMessages((prev) => prev.filter((m) => m.messageId !== msgId));
//     } catch (e) {
//       console.error("deleteMessageForMe error:", e);
//     }
//   };


//   const reactToMessage = async (msgId, emoji) => {
//     try {
//       await fetch(`http://localhost:4002/groups/messages/${msgId}/react`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
//         body: JSON.stringify({ emoji }),
//       });
//     } catch (e) {
//       console.error("reactToMessage error:", e);
//     }
//   };


//   // 🆕 Get info (who delivered/read)
//  const viewMessageInfo = async (msgId) => {
//   try {
//     const res = await fetch(`http://localhost:4002/groups/messages/${msgId}/info`, {
//       headers: { Authorization: `Bearer ${jwt}` },
//     });
//     const data = await res.json();
//     const formatTimestamp = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
//     const deliveredText = data.deliveredTo?.map(d => `${d.userId} at ${formatTimestamp(d.timestamp)}`).join("\n") || "none";
//     const readText = data.readBy?.map(r => `${r.userId} at ${formatTimestamp(r.timestamp)}`).join("\n") || "none";
//     alert(
//       `📨 Delivered to:\n${deliveredText}\n\n👀 Read by:\n${readText}`
//     );
//   } catch (e) {
//     console.error("viewMessageInfo error:", e);
//     alert("Error fetching message info");
//   }
// };

// const pinMessage = async (msgId) => {
//   setIsPinning(true);
//   try {
//     const res = await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/messages/pin`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
//       body: JSON.stringify({ messageId: msgId }),
//     });
//     const data = await res.json();
//     if (data.success) {
//       if (data.unpinned) {
//         setSelectedGroup((prev) => ({ ...prev, pinnedMessage: null }));
//       } else {
//         setSelectedGroup((prev) => ({ ...prev, pinnedMessage: data.pinned }));
//       }
//     } else {
//       alert("Failed to pin/unpin message: " + data.error);
//     }
//   } catch (e) {
//     console.error("pinMessage error:", e);
//     alert("Error pinning/unpinning message");
//   } finally {
//     setIsPinning(false);
//   }
// };

//   /* ------------------ Mount ------------------ */

//   // useEffect(() => {
//   //   if (!jwt) return;
//   //   connect();
//   //   fetchGroups();
//   //   if (Notification.permission !== "granted") Notification.requestPermission();
//   //   // eslint-disable-next-line react-hooks/exhaustive-deps
//   // }, [jwt]);

//   useEffect(() => {
//   if (!jwt) return;
//   connect();
//   fetchGroups();
//   if (Notification.permission !== "granted") Notification.requestPermission();
// }, [jwt, connect, fetchGroups]);

// useEffect(() => {
//   if (!jwt || !groupId) return;
//   fetchGroupDetails(groupId);
// }, [jwt, groupId, fetchGroupDetails]);

//   /* ------------------ UI ------------------ */
//   return (
//     <div className="flex h-[600px] border rounded overflow-hidden">
//       {/* Sidebar */}
//       <div className="w-1/4 bg-gray-100 border-r p-3 overflow-y-auto">
//         <h3 className="font-bold mb-3">Groups</h3>
//         {groups.map((g) => (
//           <div
//             key={g.groupId}
//             onClick={() => fetchGroupDetails(g.groupId)}
//             className={`p-2 rounded cursor-pointer mb-2 ${selectedGroup?.groupId === g.groupId
//               ? "bg-blue-500 text-white"
//               : "hover:bg-gray-200"
//               }`}
//           >
//             {g.name}
//           </div>
//         ))}

//         {/* Create Group */}
//         <div className="mt-6">
//           <h4 className="font-semibold mb-2">➕ Create Group</h4>
//           <input
//             className="w-full border mb-2 p-1"
//             placeholder="Group Name"
//             value={groupName}
//             onChange={(e) => setGroupName(e.target.value)}
//           />
//           <input
//             className="w-full border mb-2 p-1"
//             placeholder="Description"
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//           />
//           <input
//             className="w-full border mb-2 p-1"
//             placeholder="Member IDs (comma)"
//             value={memberCsv}
//             onChange={(e) => setMemberCsv(e.target.value)}
//           />
//           <button
//             className="bg-green-600 text-white w-full py-1 rounded"
//             onClick={createGroup}
//           >
//             Create
//           </button>
//         </div>
//       </div>

//       {/* Chat Panel */}
//       <div className="flex-1 flex flex-col relative">
//         {selectedGroup ? (
//           <>
//             {/* Header */}
//             <div className="p-3 border-b bg-white flex justify-between items-center">
//               {selectedGroup.pinnedMessage && (
//   <div
//     className="bg-yellow-100 border-b border-yellow-300 text-sm p-2 flex justify-between items-center cursor-pointer hover:bg-yellow-200"
//     onClick={() =>
//       document
//         .getElementById(`msg-${selectedGroup.pinnedMessage.messageId}`)
//         ?.scrollIntoView({ behavior: "smooth" })
//     }
//   >
//     <span>
//       📌 <b>{selectedGroup.pinnedMessage.senderId}</b>:{" "}
//       {selectedGroup.pinnedMessage.content}
//     </span>
//     <button
//       onClick={async (e) => {
//         e.stopPropagation();
//         await pinMessage(selectedGroup.pinnedMessage.messageId);
//       }}
//       className="text-xs text-gray-600 hover:text-red-500"
//       disabled={isPinning}
//     >
//       {isPinning ? "Unpinning..." : "Unpin ✖"}
//     </button>
//   </div>
// )}

//               <div className="min-w-0">
//                 <h2 className="font-bold truncate">{selectedGroup.name}</h2>
//                 <p className="text-sm text-gray-500 truncate">
//                   {selectedGroup.description}
//                 </p>
//                 {/* Typing indicator (shows if server emits `typing`) */}
//                 {typingBy.size > 0 && (
//                   <p className="text-xs text-blue-500 mt-1">
//                     {typingBy.size === 1
//                       ? `${Array.from(typingBy)[0]} is typing…`
//                       : "Several people are typing…"}
//                   </p>
//                 )}
//                 <div className="flex items-center gap-2">
//   <input
//   type="text"
//   value={searchQuery}
//   onChange={(e) => setSearchQuery(e.target.value)}
//   onKeyDown={(e) => e.key === "Enter" && searchMessages()}
//   placeholder="Search messages..."
//   className="border px-2 py-1 rounded text-sm max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all duration-200 hover:border-blue-400"
// />

//  {searchQuery && (
//   <button
//     onClick={async () => {
//       setSearchQuery("");
//       try {
//         const res = await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/messages`, {
//           headers: { Authorization: `Bearer ${jwt}` },
//         });
//         const data = await res.json();
//         if (data.success && Array.isArray(data.messages)) {
//           setMessages(data.messages);
//         } else {
//           console.error("Clear search error: Failed to fetch messages - " + (data.error || "No messages returned"));
//           setMessages([]);
//         }
//       } catch (e) {
//         console.error("Clear search error:", e);
//         setMessages([]);
//       }
//     }}
//     className="text-xs text-gray-500 hover:text-red-500"
//   >
//     Clear
//   </button>
// )}
// </div>
//               </div>

//               <div className="flex items-center gap-2">
//                 <button
//                   className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
//                   onClick={() => setDrawerOpen(true)}
//                 >
//                   Group Info
//                 </button>
//                 <button
//                   onClick={leaveGroup}
//                   className="text-red-600 border border-red-400 px-3 py-1 rounded text-sm hover:bg-red-50"
//                 >
//                   Leave
//                 </button>
//               </div>
//             </div>

//             {/* Messages */}
//             <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
// {messages.map((m) => (
//                  <div
//                   key={m.messageId}
//                   data-mid={m.messageId}
//                   data-sender={m.senderId}
//                   data-status={m.status}
//                   id={`msg-${m.messageId}`}
//                   className={`mb-3 flex ${m.senderId === userId ? "justify-end" : "justify-start"
//                     }`}
//                 >
//                   <div
//                     className={`max-w-xs px-3 py-2 rounded-lg shadow ${m.messageType === "system"
//                       ? "bg-gray-300 text-gray-800 italic text-center"
//                       : m.senderId === userId
//                         ? "bg-blue-500 text-white"
//                         : "bg-white border"
//                       }`}
//                   >

//                     {/* Sender name for others */}
//                     {m.senderId !== userId && (
//                       <div className="text-xs font-bold mb-1">
//                         {m.senderName || m.senderId}
//                       </div>
//                     )}

//                     {/* Reply preview */}
//                     {m.replyTo && (
//                       <div
//                         className="text-xs italic text-gray-400 border-l-2 pl-2 mb-1 cursor-pointer hover:bg-gray-100"
//                         onClick={() =>
//                           document
//                             .getElementById(`msg-${m.replyTo.messageId}`)
//                             ?.scrollIntoView({ behavior: "smooth" })
//                         }
//                       >
//                         ↪ {m.replyTo.content || "[media]"}
//                       </div>
//                     )}

//                     {/* Content */}
//                     {m.content && <div>{m.content}</div>}
//                     {m.isEdited && (
//                       <div className="text-xs italic text-gray-300 mt-1">
//                         edited
//                       </div>
//                     )}

//                     {/* Attachments */}
//                     {Array.isArray(m.attachments) &&
//                       m.attachments.map((a, idx) => (
//                         <div key={idx} className="mt-1">
//                           {a.fileType === "image" ? (
//                             <img
//                               src={decodeURI(a.url)}
//                               alt={a.fileName}
//                               className="max-h-40 rounded border cursor-pointer mb-1"
//                               onClick={() => window.open(a.url, "_blank")}
//                             />
//                           ) : a.fileType === "video" ? (
//                             <video
//                               controls
//                               src={decodeURI(a.url)}
//                               className="max-h-40 rounded border mb-1"
//                             />
//                           ) : (
//                             <a
//                               href={decodeURI(a.url)}
//                               target="_blank"
//                               rel="noreferrer"
//                               className="block underline text-sm text-white hover:text-gray-200 mb-1"
//                             >
//                               📎 {a.fileName}
//                             </a>
//                           )}

//                         </div>
//                       ))}

//                     {/* {m.reactions && Object.keys(m.reactions).length > 0 && (
//                       <div className="flex space-x-1 mt-1 text-xs">
//                         {Object.entries(m.reactions).map(([emoji, users]) => (
//                           <span
//                             key={emoji}
//                             className="bg-gray-200 px-1 rounded cursor-pointer hover:bg-gray-300"
//                             title={users.map((u) => selectedGroup.members.includes(u) ? u : "user").join(", ")}
//                           >
//                             {emoji} {users.length}
//                           </span>
//                         ))}
//                       </div>
//                     )} */}


//                     {/* Reactions Display */}
//                     {m.reactions && Object.keys(m.reactions).length > 0 && (
//                       <div className="flex space-x-1 mt-1 text-xs">
//                         {Object.entries(m.reactions).map(([emoji, users]) => (
//                           <span
//                             key={emoji}
//                             className="bg-gray-200 px-1 rounded cursor-pointer hover:bg-gray-300"
//                             title={users.join(", ")} // backend now sends phone numbers
//                           >
//                             {emoji} {users.length}
//                           </span>
//                         ))}
//                       </div>
//                     )}





//                     {/* Actions (only own messages) */}
//                     {!m.deleted && (
//                       <div className="text-right mt-1 space-x-2 text-xs opacity-70">
//                         {/* Actions for everyone */}
//                         <button onClick={() => setReplyingTo(m)} title="Reply">↩️</button>
//                         <button onClick={() => reactToMessage(m.messageId, "❤️")} title="React">❤️</button>
//                         <button onClick={() => pinMessage(m.messageId)} title="Pin">📌</button>
//                         <button onClick={() => toggleStar(m.messageId)} title={m.isStarred ? "Unstar" : "Star"}>{m.isStarred ? "⭐" : "☆"}</button>

//                         {/* Only sender */}
//                         {m.senderId === userId && (
//                           <>
//                             <button onClick={() => editMessage(m.messageId, prompt("Edit message:", m.content || ""))}>✏️</button>
//                             <button onClick={() => deleteMessage(m.messageId)}>🗑️ Everyone</button>
//                             <button onClick={() => viewMessageInfo(m.messageId)}>ℹ️</button>
//                           </>
//                         )}

//                         {/* Delete for me (always allowed) */}
//                         <button onClick={() => deleteMessageForMe(m.messageId)}>🗑️ Me</button>
//                       </div>
//                     )}


//                     {/* Ticks */}
//                     {m.senderId === userId && (

//                       <div className="text-right text-xs mt-1 select-none">
//                         {m.status === "sent" && "✓"}
//                         {m.status === "delivered" && "✓✓"}
//                         {m.status === "read" && <span className="text-blue-400 font-bold">✓✓</span>}
//                         {m.status === "failed" && <span className="text-red-500">failed</span>}
//                       </div>
//                     )}

//                     {m.senderId === userId && m.readBy && m.readBy.length > 0 && (
//   <div className="text-right text-xs text-gray-400 mt-1">
//     Read by: {m.readBy.map(r => `${r.userId} at ${new Date(r.timestamp).toLocaleTimeString()}`).join(', ')}
//   </div>
// )}

//                   </div>
//                 </div>
//               ))}
//               <div ref={messagesEndRef} />
//             </div>




//             {/* Composer */}
//             <div className="p-3 border-t bg-white">
//               <FilePreview
//                 showFilePicker={showFilePicker}
//                 selectedFiles={selectedFiles}
//                 setSelectedFiles={setSelectedFiles}
//                 setShowFilePicker={setShowFilePicker}
//                 fileInputRef={fileInputRef}
//               />

//               {/* Reply preview (above input) */}
//               {replyingTo && (
//                 <div className="flex justify-between items-center bg-blue-50 border-l-4 border-blue-400 px-3 py-2 mb-2 text-sm rounded">
//                   <div>
//                     Replying to:{" "}
//                     <span className="font-medium">{replyingTo.senderId}</span> —{" "}
//                     <span className="italic">
//                       {replyingTo.content || "[media]"}
//                     </span>
//                   </div>
//                   <button onClick={cancelReply} className="text-red-500 hover:underline">
//                     ✕
//                   </button>
//                 </div>
//               )}

//               {canPost ? (


//                 <div className="flex items-center space-x-2">
//                   <input
//                     type="text"
//                     value={text}
//                     onChange={(e) => setText(e.target.value)}
//                     placeholder="Type a message…"
//                     className="flex-1 border px-3 py-2 rounded"
//                     onKeyDown={(e) => e.key === "Enter" && sendMessage()}
//                   />
//                   <input
//                     type="file"
//                     multiple
//                     ref={fileInputRef}
//                     accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
//                     onChange={handleFileSelect}
//                     className="hidden"
//                   />

//                   <button
//                     onClick={() => {
//                       fileInputRef.current?.click();
//                       setShowFilePicker(true);
//                     }}
//                     className="bg-gray-200 px-3 py-2 rounded"
//                     title="Attach"
//                   >
//                     📎
//                   </button>
//                   <button
//                     onClick={sendMessage}
//                     className="bg-blue-500 text-white px-3 py-2 rounded"
//                   >
//                     Send
//                   </button>
//                 </div>
//               ) : (
//                 <div className="text-gray-500 italic">
//                   You can’t send messages in this group.
//                 </div>
//               )}
//             </div>

//             {/* Right Drawer: Group Info */}
//             <div
//               className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl border-l transform transition-transform duration-300 ease-in-out ${drawerOpen ? "translate-x-0" : "translate-x-full"
//                 }`}
//               style={{ zIndex: 50 }}
//             >
//               <div className="p-4 border-b flex items-center justify-between">
//                 <div>
//                   <div className="font-bold">{selectedGroup.name}</div>
//                   <div className="text-xs text-gray-500">
//                     Group Info • {selectedGroup.members?.length || 0} members
//                   </div>
//                 </div>
//                 <button
//                   className="text-gray-500 hover:text-black"
//                   onClick={() => setDrawerOpen(false)}
//                   aria-label="Close"
//                 >
//                   ✖
//                 </button>
//               </div>

//               {/* Edit group (admin only, preserved) */}
//               {isAdmin && (
//                 <div className="p-4 border-b">
//                   <div className="text-sm font-semibold mb-2">Edit group</div>
//                   <input
//                     className="w-full border p-1 mb-2"
//                     value={editName}
//                     onChange={(e) => setEditName(e.target.value)}
//                     placeholder="Group name"
//                   />
//                   <input
//                     className="w-full border p-1 mb-2"
//                     value={editDesc}
//                     onChange={(e) => setEditDesc(e.target.value)}
//                     placeholder="Description"
//                   />
//                   <button
//                     className="bg-blue-600 text-white py-1 px-3 rounded w-full"
//                     onClick={updateGroup}
//                   >
//                     Save Changes
//                   </button>
//                 </div>
//               )}

//               {/* Add members quick input (admin only) */}
//               {isAdmin && (
//                 <div className="p-4 border-b">
//                   <div className="text-sm font-semibold mb-2">Add members</div>
//                   <div className="flex gap-2">
//                     <input
//                       className="border p-1 flex-1"
//                       placeholder="user1,user2"
//                       value={addMembersInput}
//                       onChange={(e) => setAddMembersInput(e.target.value)}
//                     />
//                     <button
//                       className="bg-green-600 text-white px-3 rounded"
//                       onClick={() => addMembers()}
//                     >
//                       Add
//                     </button>
//                   </div>
//                 </div>
//               )}

//               {isAdmin && (
//   <div className="p-4 border-b">
//     <div className="text-sm font-semibold mb-2">Invite Members</div>
//     <button
//       className="bg-blue-600 text-white py-1 px-3 rounded w-full mb-2"
//       onClick={async () => {
//         try {
//           const res = await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/invite`, {
//             method: "POST",
//             headers: { Authorization: `Bearer ${jwt}` },
//           });
//           const data = await res.json();
//           if (data.success) {
//             alert(`Invite link: ${data.inviteLink}`);
//             navigator.clipboard.write(data.inviteLink); // Copy to clipboard
//           } else {
//             alert("Failed to generate invite link: " + data.error);
//           }
//         } catch (e) {
//           console.error("generateInviteLink error:", e);
//           alert("Error generating invite link");
//         }
//       }}
//     >
//       Generate Invite Link
//     </button>
//     <div className="text-sm font-semibold mb-2">Add members</div>
//     <div className="flex gap-2">
//       <input
//         className="border p-1 flex-1"
//         placeholder="user1,user2"
//         value={addMembersInput}
//         onChange={(e) => setAddMembersInput(e.target.value)}
//       />
//       <button
//         className="bg-green-600 text-white px-3 rounded"
//         onClick={() => addMembers()}
//       >
//         Add
//       </button>
//     </div>
//   </div>
// )}

//               {/* Members list */}
//               <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(100% - 220px)" }}>
//                 <div className="text-sm font-semibold mb-2">Members</div>
//                 <ul className="space-y-2">
//                   {selectedGroup.members?.map((m) => {
//                     const isThisAdmin = selectedGroup.admins?.includes(m);
//                     const isSelf = m === userId;
//                     const isCreator = selectedGroup.createdBy === m;

//                     return (
//                       <li
//                         key={m}
//                         className="flex items-center justify-between border rounded px-2 py-1"
//                       >
//                         <div className="truncate">
//                           <span className="font-medium">{m}</span>{" "}
//                           {isThisAdmin && <span title="Admin">👑</span>}
//                           {isCreator && <span className="text-xs text-green-600 ml-1">(owner)</span>}
//                           {isSelf && <span className="text-xs text-gray-400"> (me)</span>}
//                         </div>

//                         {isAdmin && !isSelf && (
//                           <div className="flex items-center gap-2 text-xs">
//                             {/* Only show Make admin if target is not already admin */}
//                             {isThisAdmin ? (
//                               <button
//                                 className="px-2 py-0.5 border border-yellow-400 text-yellow-700 rounded hover:bg-yellow-50"
//                                 onClick={() => removeAdmin(m)}
//                                 title="Remove admin"
//                               >
//                                 Remove admin
//                               </button>
//                             ) : (
//                               <button
//                                 className="px-2 py-0.5 border rounded hover:bg-gray-50"
//                                 onClick={() => makeAdmin(m)}
//                                 title="Make admin"
//                               >
//                                 Make admin
//                               </button>
//                             )}


//                             {/* Remove: cannot remove admins, and cannot remove the creator */}
//                             {!isThisAdmin && !isCreator && (
//                               <button
//                                 className="px-2 py-0.5 border border-red-400 text-red-600 rounded hover:bg-red-50"
//                                 onClick={() => removeMember(m)}
//                                 title="Remove from group"
//                               >
//                                 Remove
//                               </button>
//                             )}
//                           </div>
//                         )}
//                       </li>
//                     );
//                   })}
//                 </ul>
//                 <div className="mt-4">
//   <button
//     className="w-full text-sm px-3 py-1 border rounded hover:bg-gray-50 mb-2"
//     onClick={loadStarredMessages}
//   >
//     View Starred Messages
//   </button>
//   {showStarred && (
//     <div className="border-t pt-2">
//       <div className="text-sm font-semibold mb-2">Starred Messages</div>
//       {starredMessages.length === 0 ? (
//         <p className="text-xs text-gray-500">No starred messages</p>
//       ) : (
//         <ul className="space-y-2 max-h-40 overflow-y-auto">
//           {starredMessages.map((s) => (
//   <li
//     key={s.messageId}
//     className="text-xs bg-gray-100 p-2 rounded cursor-pointer hover:bg-gray-200 transition-colors duration-150"
//     onClick={() =>
//       document.getElementById(`msg-${s.messageId}`)?.scrollIntoView({ behavior: "smooth" })
//     }
//   >
//     <span className="font-medium">{s.senderId}</span>:{" "}
//     {s.content || "[media]"} -{" "}
// {new Date(s.starredAt).toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}  </li>
// ))}
//         </ul>
//       )}
//       <button
//         onClick={() => setShowStarred(false)}
//         className="text-xs text-red-500 hover:underline mt-2"
//       >
//         Close
//       </button>
//     </div>
//   )}
// </div>
//               </div>
//             </div>



//             {/* Drawer backdrop */}
//             {drawerOpen && (
//               <div
//                 className="fixed inset-0 bg-black/30"
//                 style={{ zIndex: 40 }}
//                 onClick={() => setDrawerOpen(false)}
//               />
//             )}
//           </>
//         ) : (
//           <div className="flex-1 flex items-center justify-center text-gray-400">
//             Select a group to start chatting
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }



import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom"; // 🆕 Added for URL-based group selection
import FilePreview from "./FilePreview";
import * as signalR from "@microsoft/signalr";

export default function GroupChat({ jwt, userId }) {
  const [connection, setConnection] = useState(null);

  // Groups & selection
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const selectedGroupRef = useRef(null);
  const [inviteLink, setInviteLink] = useState(null);
const [error, setError] = useState(null);

  // Messages for the selected group only (live via SignalR + initial fetch)
  const [messages, setMessages] = useState([]);

  // Composer state
  const [text, setText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showStarred, setShowStarred] = useState(false);
  const [starredMessages, setStarredMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);

  // Create/Edit group state
  const [groupName, setGroupName] = useState("");
  const [memberCsv, setMemberCsv] = useState("");
  const [description, setDescription] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Members drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addMembersInput, setAddMembersInput] = useState("");

  // Optional typing indicator
  const [typingBy, setTypingBy] = useState(new Set());

  // Permissions
  const [canPost, setCanPost] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const observerRef = useRef(null);
  const visibleMsgIdsRef = useRef(new Set());

  // For optimistic send & reconciliation
  const pendingLocalIdsRef = useRef({}); // tempId -> { content, createdAt, files, replyTo, tempUrls }

  // 🆕 Extract groupId from URL for joining via invite
  const { groupId } = useParams();

  /* ------------------ Helpers ------------------ */

  const currentGroupId = useMemo(
    () => selectedGroup?.groupId || null,
    [selectedGroup]
  );

  const isAdmin = useMemo(() => {
    if (!selectedGroup) return false;
    return Array.isArray(selectedGroup.admins) && selectedGroup.admins.includes(userId);
  }, [selectedGroup, userId]);

  const isMember = useMemo(() => {
    if (!selectedGroup) return false;
    return Array.isArray(selectedGroup.members) && selectedGroup.members.includes(userId);
  }, [selectedGroup, userId]);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update selectedGroupRef and canPost
  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
    setCanPost(selectedGroup?.canPost !== false && isMember);
  }, [selectedGroup, isMember]);

  // IntersectionObserver for marking messages as READ
  useEffect(() => {
    if (!jwt) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(async (entry) => {
          const el = entry.target;
          const mid = el.getAttribute("data-mid");
          const sender = el.getAttribute("data-sender");
          const status = el.getAttribute("data-status");

          if (
            entry.isIntersecting &&
            mid &&
            sender &&
            sender !== userId &&
            status !== "read"
          ) {
            if (!visibleMsgIdsRef.current.has(mid)) {
              visibleMsgIdsRef.current.add(mid);
              try {
                await fetch(`http://localhost:4002/groups/messages/read`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${jwt}`,
                  },
                  body: JSON.stringify({ messageId: mid }),
                });
              } catch (e) {
                console.warn("mark read failed:", e);
              }
            }
          }
        });
      },
      { threshold: 0.6 }
    );
    observerRef.current = observer;

    setTimeout(() => {
      document
        .querySelectorAll("[data-mid]")
        .forEach((el) => observer.observe(el));
    }, 0);

    return () => observer.disconnect();
  }, [messages, jwt, userId]);

  /* ------------------ SignalR connect ------------------ */
  const connect = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:4002/negotiate", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const { url, accessToken } = await res.json();

      const conn = new signalR.HubConnectionBuilder()
        .withUrl(url, { accessTokenFactory: () => accessToken })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();


        if (connection && connection.state === signalR.HubConnectionState.Connected) {
      console.log("Already connected to SignalR hub, skipping new connection");
      return connection;
    }

    
      // New message
      conn.on("newMessage", async (msg) => {
        if (!msg?.isGroup || !msg?.groupId) return;
        if (msg.groupId !== selectedGroupRef.current?.groupId) return;

        if (msg.senderId !== userId && msg.status === "sent") {
          try {
            await fetch(`http://localhost:4002/groups/messages/delivered`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jwt}`,
              },
              body: JSON.stringify({ messageId: msg.messageId }),
            });
          } catch (e) {
            console.warn("mark delivered failed:", e);
          }
        }

        let replaced = false;
        const tempIds = Object.keys(pendingLocalIdsRef.current);
        if (msg.senderId === userId && tempIds.length) {
          const candidateId = tempIds.find((k) => {
            const item = pendingLocalIdsRef.current[k];
            if (!item) return false;
            const timeGap = Math.abs(new Date(msg.createdAt) - new Date(item.createdAt));
            return item.content === msg.content && timeGap < 8000;
          });
          if (candidateId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.messageId === candidateId
                  ? { ...msg, isLocal: false }
                  : m
              )
            );
            const pending = pendingLocalIdsRef.current[candidateId];
            if (pending?.tempUrls) {
              pending.tempUrls.forEach((url) => URL.revokeObjectURL(url));
            }
            delete pendingLocalIdsRef.current[candidateId];
            replaced = true;
          }
        }

        if (!replaced) {
          setMessages((prev) => {
            if (prev.some((m) => m.messageId === msg.messageId)) return prev;
            const updated = [...prev, msg];
            return updated;
          });
        }
      });

      // Edited
      conn.on("messageEdited", (msg) => {
        if (!msg?.groupId) return;
        if (msg.groupId !== selectedGroupRef.current?.groupId) return;
        setMessages((prev) =>
          prev.map((m) => (m.messageId === msg.messageId ? { ...m, ...msg } : m))
        );
      });

      // Deleted
      conn.on("messageDeleted", ({ messageId, forEveryone, groupId }) => {
        if (groupId && groupId !== selectedGroupRef.current?.groupId) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.messageId === messageId
              ? {
                  ...m,
                  content: forEveryone ? "🗑️ message deleted" : "",
                  deleted: true,
                }
              : m
          )
        );
      });

      // Reactions
      conn.on("reactionUpdated", ({ groupId, messageId, emoji, users }) => {
        if (groupId !== selectedGroupRef.current?.groupId) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.messageId === messageId
              ? {
                  ...m,
                  reactions: { ...(m.reactions || {}), [emoji]: users },
                }
              : m
          )
        );
      });

      // Starred
      conn.on("messageStarred", ({ groupId, messageId, action }) => {
        if (groupId !== selectedGroupRef.current?.groupId) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.messageId === messageId ? { ...m, isStarred: action === "starred" } : m
          )
        );
      });

      // Receipts
      conn.on("messageReceipt", ({ messageId, status, from, groupId, timestamp }) => {
        if (groupId && groupId !== selectedGroupRef.current?.groupId) return;
        setMessages((prev) => {
          const messageExists = prev.some((m) => m.messageId === messageId);
          if (!messageExists) return prev;
          return prev.map((m) =>
            m.messageId === messageId
              ? {
                  ...m,
                  status,
                  deliveredTo:
                    status === "delivered"
                      ? [...(m.deliveredTo || []), { userId: from, timestamp }]
                      : m.deliveredTo,
                  readBy:
                    status === "read"
                      ? [...(m.readBy || []), { userId: from, timestamp }]
                      : m.readBy,
                }
              : m
          );
        });
      });

      // Typing indicator
      conn.on("typing", ({ groupId, userId: who, isTyping }) => {
        if (!groupId || groupId !== selectedGroupRef.current?.groupId) return;
        setTypingBy((prev) => {
          const next = new Set(Array.from(prev));
          if (isTyping) next.add(who);
          else next.delete(who);
          return next;
        });
        const timeoutKey = `typingTimeout_${who}`;
        clearTimeout(window[timeoutKey]);
        if (isTyping) {
          window[timeoutKey] = setTimeout(() => {
            setTypingBy((prev) => {
              const next = new Set(Array.from(prev));
              next.delete(who);
              return next;
            });
          }, 4000);
        }
      });

      // Group meta updates
      conn.on("groupUpdated", async (evt) => {
        const openGroupId = selectedGroupRef.current?.groupId;
        if (evt.type === "groupDeleted" && evt.groupId === openGroupId) {
          alert("🚨 Group deleted by admin");
          setSelectedGroup(null);
          setMessages([]);
          return;
        }
        if (evt.type === "memberRemoved" && evt.groupId === openGroupId && evt.memberId === userId) {
          alert("🚫 You were removed from this group");
          setSelectedGroup(null);
          setMessages([]);
          return;
        }
        if (evt.type === "messagePinned" && evt.groupId === openGroupId) {
          setSelectedGroup((prev) => ({
            ...prev,
            pinnedMessage: evt.pinned,
          }));
        }
        if (evt.type === "unpinned" && evt.groupId === openGroupId) {
          setSelectedGroup((prev) => ({
            ...prev,
            pinnedMessage: null,
          }));
        }
        if (["groupDeleted", "memberAdded", "memberRemoved", "groupUpdated"].includes(evt.type)) {
          await fetchGroupDetails(openGroupId);
        }
        fetchGroups();
      });

      await conn.start();
      setConnection(conn);
      console.log("✅ Connected to chat hub");
    } catch (err) {
      console.error("❌ SignalR connection error:", err);
    }
  }, [jwt, userId]);

  /* ------------------ Groups ------------------ */
  const fetchGroups = async () => {
    try {
      const res = await fetch("http://localhost:4002/groups", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (e) {
      console.error("fetchGroups error:", e);
    }
  };

  const fetchGroupDetails = async (groupId) => {
    try {
      const g = await fetch(`http://localhost:4002/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const gd = await g.json();
      if (!gd.success) return;

      setSelectedGroup(gd.group);
      setEditName(gd.group.name);
      setEditDesc(gd.group.description);

      const allowed = gd.group.canPost !== false && Array.isArray(gd.group.members) && gd.group.members.includes(userId);
      setCanPost(allowed);

      // 🆕 Fetch initial messages for the group
      try {
        const res = await fetch(`http://localhost:4002/groups/${groupId}/messages?page=1&limit=50`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages.reverse());
        } else {
          console.error("fetchGroupMessages error:", data.error);
          setMessages([]);
        }
      } catch (e) {
        console.error("fetchGroupMessages error:", e);
        setMessages([]);
      }

      setDrawerOpen(false);
    } catch (e) {
      console.error("fetchGroupDetails error:", e);
    }
  };

  // 🆕 Handle groupId from URL
  useEffect(() => {
    if (!jwt || !groupId) return;
    fetchGroupDetails(groupId);
  }, [jwt, groupId]);

  /* ------------------ Admin actions ------------------ */
  const addMembers = async (ids) => {
    if (!selectedGroup) return;
    const memberIds =
      Array.isArray(ids) && ids.length
        ? ids
        : addMembersInput.split(",").map((x) => x.trim()).filter(Boolean);
    if (!memberIds.length) return;

    try {
      await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ memberIds }),
      });
      setAddMembersInput("");
      fetchGroupDetails(selectedGroup.groupId);
    } catch (e) {
      console.error("addMembers error:", e);
    }
  };

  const removeMember = async (memberId) => {
    if (!selectedGroup || !memberId) return;
    const isTargetAdmin = selectedGroup.admins?.includes(memberId);
    const isCreator = selectedGroup.createdBy === memberId;

    if (isTargetAdmin) {
      alert("Admins cannot remove other admins.");
      return;
    }
    if (isCreator) {
      alert("No one can remove the group creator.");
      return;
    }

    try {
      await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ memberId }),
      });

      if (memberId === userId) {
        setSelectedGroup(null);
        setMessages([]);
      } else {
        fetchGroupDetails(selectedGroup.groupId);
      }
    } catch (e) {
      console.error("removeMember error:", e);
    }
  };

  const makeAdmin = async (memberId) => {
    if (!selectedGroup || !memberId) return;
    try {
      await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/make-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ memberId }),
      });
      fetchGroupDetails(selectedGroup.groupId);
    } catch (e) {
      console.error("makeAdmin error:", e);
    }
  };

  const removeAdmin = async (memberId) => {
    if (!selectedGroup) return;
    if (!window.confirm("Remove this member as admin?")) return;
    try {
      await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/remove-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ memberId }),
      });
      fetchGroupDetails(selectedGroup.groupId);
    } catch (e) {
      console.error("removeAdmin error:", e);
    }
  };

  const leaveGroup = async () => {
    if (!selectedGroup) return;
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    try {
      await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      setSelectedGroup(null);
      setMessages([]);
      fetchGroups();
    } catch (e) {
      console.error("leaveGroup error:", e);
    }
  };

  /* ------------------ Create / Update Group ------------------ */
  const createGroup = async () => {
    const body = {
      name: groupName,
      description,
      memberIds: memberCsv.split(",").map((x) => x.trim()).filter(Boolean),
    };
    try {
      await fetch("http://localhost:4002/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(body),
      });
      setGroupName("");
      setDescription("");
      setMemberCsv("");
      fetchGroups();
    } catch (e) {
      console.error("createGroup error:", e);
    }
  };

  const updateGroup = async () => {
    if (!selectedGroup) return;
    try {
      await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ name: editName, description: editDesc }),
      });
      fetchGroupDetails(selectedGroup.groupId);
    } catch (e) {
      console.error("updateGroup error:", e);
    }
  };

  /* ------------------ Messaging ------------------ */
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const maxSize = 100 * 1024 * 1024;
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/mov",
      "video/webm",
      "audio/mp3",
      "audio/wav",
      "audio/aac",
      "application/pdf",
      "text/plain",
    ];

    const validFiles = [];
    const errors = [];

    files.forEach((file) => {
      if (file.size > maxSize) {
        errors.push(`${file.name}: Too large (>100MB)`);
      } else if (!allowedTypes.includes(file.type.toLowerCase())) {
        errors.push(`${file.name}: Not supported`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) alert(errors.join("\n"));
    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      setShowFilePicker(true);
    }
  };

  const startReply = (msg) => {
    setReplyingTo(msg);
    scrollToBottom();
  };

  const cancelReply = () => setReplyingTo(null);

  const sendMessage = async () => {
    if (!selectedGroup || !canPost) {
      if (!isMember) alert("You are not a member of this group.");
      return;
    }
    if (!text.trim() && selectedFiles.length === 0) return;

    const headers = { Authorization: `Bearer ${jwt}` };
    let body;
    let endpoint = `http://localhost:4002/groups/${selectedGroup.groupId}/messages`;

    const tempId = "local-" + Date.now();
    const now = new Date().toISOString();
    const tempUrls = selectedFiles.map((file) => URL.createObjectURL(file));
    const optimistic = {
      messageId: tempId,
      groupId: selectedGroup.groupId,
      isGroup: true,
      senderId: userId,
      content: text,
      attachments: selectedFiles.map((file, idx) => ({
        fileName: file.name,
        fileType: file.type.split("/")[0],
        url: tempUrls[idx],
      })),
      createdAt: now,
      status: "sending",
      isLocal: true,
      replyTo: replyingTo,
    };
    setMessages((prev) => [...prev, optimistic]);
    pendingLocalIdsRef.current[tempId] = { content: text, createdAt: now, files: selectedFiles, replyTo: replyingTo, tempUrls };

    try {
      if (selectedFiles.length > 0) {
        const fd = new FormData();
        fd.append("content", text);
        selectedFiles.forEach((file) => {
          fd.append("media", file);
        });
        endpoint += selectedFiles.length > 1 ? "/multiple-media" : "/media";
        body = fd;
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({
          content: text,
          ...(replyingTo && { replyToMessageId: replyingTo.messageId }),
        });
      }

      const res = await fetch(endpoint, { method: "POST", headers, body });
      if (!res.ok) throw new Error("Failed to send message");
      setText("");
      setSelectedFiles([]);
      setShowFilePicker(false);
      setReplyingTo(null);
    } catch (e) {
      console.error("sendMessage error:", e);
      setMessages((prev) =>
        prev.map((m) => (m.messageId === tempId ? { ...m, status: "failed" } : m))
      );
      const pending = pendingLocalIdsRef.current[tempId];
      if (pending) {
        setText(pending.content);
        setSelectedFiles(pending.files || []);
        setShowFilePicker(pending.files?.length > 0);
        setReplyingTo(pending.replyTo || null);
      }
    } finally {
      const pending = pendingLocalIdsRef.current[tempId];
      if (pending?.tempUrls) {
        pending.tempUrls.forEach((url) => URL.revokeObjectURL(url));
      }
      delete pendingLocalIdsRef.current[tempId];
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const searchMessages = async () => {
    if (!searchQuery.trim() || !selectedGroup) return;
    try {
      const res = await fetch(
        `http://localhost:4002/groups/${selectedGroup.groupId}/messages/search?query=${encodeURIComponent(searchQuery)}`,
        {
          headers: { Authorization: `Bearer ${jwt}` },
        }
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      } else {
        alert("Failed to search messages: " + (data.error || "No results found"));
      }
    } catch (e) {
      console.error("searchMessages error:", e);
      alert("Error searching messages");
    }
  };

  const toggleStar = async (msgId) => {
    const message = messages.find((m) => m.messageId === msgId);
    const wasStarred = message?.isStarred || false;
    setMessages((prev) =>
      prev.map((m) =>
        m.messageId === msgId ? { ...m, isStarred: !wasStarred } : m
      )
    );
    try {
      const res = await fetch(`http://localhost:4002/groups/messages/${msgId}/star`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      if (!data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.messageId === msgId ? { ...m, isStarred: wasStarred } : m
          )
        );
        alert("Failed to star/unstar message: " + data.error);
      }
    } catch (e) {
      console.error("toggleStar error:", e);
      setMessages((prev) =>
        prev.map((m) =>
          m.messageId === msgId ? { ...m, isStarred: wasStarred } : m
        )
      );
      alert("Error starring/unstarring message");
    }
  };

  const loadStarredMessages = async () => {
    try {
      const res = await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/starred`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      if (data.success) {
        setStarredMessages(data.starredMessages || []);
        setShowStarred(true);
      } else {
        alert("Failed to load starred messages: " + data.error);
      }
    } catch (e) {
      console.error("loadStarredMessages error:", e);
      alert("Error loading starred messages");
    }
  };

  const editMessage = async (msgId, newText) => {
    if (!newText) return;
    try {
      await fetch(`http://localhost:4002/groups/messages/${msgId}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ newContent: newText }),
      });
    } catch (e) {
      console.error("editMessage error:", e);
    }
  };

  const deleteMessage = async (msgId) => {
    if (!window.confirm("Delete this message for everyone?")) return;
    try {
      await fetch(`http://localhost:4002/groups/messages/${msgId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ forEveryone: true }),
      });
    } catch (e) {
      console.error("deleteMessage error:", e);
    }
  };

  const deleteMessageForMe = async (msgId) => {
    if (!window.confirm("Delete this message only for you?")) return;
    try {
      await fetch(`http://localhost:4002/groups/messages/${msgId}/delete-for-me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      setMessages((prev) => prev.filter((m) => m.messageId !== msgId));
    } catch (e) {
      console.error("deleteMessageForMe error:", e);
    }
  };

  const reactToMessage = async (msgId, emoji) => {
    try {
      await fetch(`http://localhost:4002/groups/messages/${msgId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ emoji }),
      });
    } catch (e) {
      console.error("reactToMessage error:", e);
    }
  };

  const viewMessageInfo = async (msgId) => {
    try {
      const res = await fetch(`http://localhost:4002/groups/messages/${msgId}/info`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      const formatTimestamp = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const deliveredText = data.deliveredTo?.map((d) => `${d.userId} at ${formatTimestamp(d.timestamp)}`).join("\n") || "none";
      const readText = data.readBy?.map((r) => `${r.userId} at ${formatTimestamp(r.timestamp)}`).join("\n") || "none";
      alert(`📨 Delivered to:\n${deliveredText}\n\n👀 Read by:\n${readText}`);
    } catch (e) {
      console.error("viewMessageInfo error:", e);
      alert("Error fetching message info");
    }
  };

  const pinMessage = async (msgId) => {
    setIsPinning(true);
    try {
      const res = await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/messages/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ messageId: msgId }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.unpinned) {
          setSelectedGroup((prev) => ({ ...prev, pinnedMessage: null }));
        } else {
          setSelectedGroup((prev) => ({ ...prev, pinnedMessage: data.pinned }));
        }
      } else {
        alert("Failed to pin/unpin message: " + data.error);
      }
    } catch (e) {
      console.error("pinMessage error:", e);
      alert("Error pinning/unpinning message");
    } finally {
      setIsPinning(false);
    }
  };

  /* ------------------ Mount ------------------ */
  // useEffect(() => {
  //   if (!jwt) return;
  //   connect();
  //   fetchGroups();
  //   if (Notification.permission !== "granted") Notification.requestPermission();
  // }, [jwt, connect, fetchGroups]);


/* ------------------ Mount ------------------ */
useEffect(() => {
  if (!jwt) return;
  let conn;

  const init = async () => {
    // Establish connection once
    conn = await connect();
  };

  init();
  fetchGroups();

  // Ask for notifications
  if (Notification.permission !== "granted") Notification.requestPermission();

  // Cleanup when component unmounts or jwt changes
  return () => {
    if (conn) {
      conn.stop();
      console.log("🔴 SignalR connection stopped on unmount");
    }
  };
  // ✅ Empty dependency array ensures this runs only once
}, []);


  /* ------------------ UI ------------------ */
  return (
    <div className="flex h-[600px] border rounded overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-100 border-r p-3 overflow-y-auto">
        <h3 className="font-bold mb-3">Groups</h3>
        {groups.map((g) => (
          <div
            key={g.groupId}
            onClick={() => fetchGroupDetails(g.groupId)}
            className={`p-2 rounded cursor-pointer mb-2 ${
              selectedGroup?.groupId === g.groupId
                ? "bg-blue-500 text-white"
                : "hover:bg-gray-200"
            }`}
          >
            {g.name}
          </div>
        ))}

        {/* Create Group */}
        <div className="mt-6">
          <h4 className="font-semibold mb-2">➕ Create Group</h4>
          <input
            className="w-full border mb-2 p-1"
            placeholder="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <input
            className="w-full border mb-2 p-1"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            className="w-full border mb-2 p-1"
            placeholder="Member IDs (comma)"
            value={memberCsv}
            onChange={(e) => setMemberCsv(e.target.value)}
          />
          <button
            className="bg-green-600 text-white w-full py-1 rounded"
            onClick={createGroup}
          >
            Create
          </button>
        </div>
      </div>

      {/* Chat Panel */}
      <div className="flex-1 flex flex-col relative">
        {selectedGroup ? (
          <>
            {/* Header */}
            <div className="p-3 border-b bg-white flex justify-between items-center">
              {selectedGroup.pinnedMessage && (
                <div
                  className="bg-yellow-100 border-b border-yellow-300 text-sm p-2 flex justify-between items-center cursor-pointer hover:bg-yellow-200"
                  onClick={() =>
                    document
                      .getElementById(`msg-${selectedGroup.pinnedMessage.messageId}`)
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <span>
                    📌 <b>{selectedGroup.pinnedMessage.senderId}</b>:{" "}
                    {selectedGroup.pinnedMessage.content}
                  </span>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await pinMessage(selectedGroup.pinnedMessage.messageId);
                    }}
                    className="text-xs text-gray-600 hover:text-red-500"
                    disabled={isPinning}
                  >
                    {isPinning ? "Unpinning..." : "Unpin ✖"}
                  </button>
                </div>
              )}

              <div className="min-w-0">
                <h2 className="font-bold truncate">{selectedGroup.name}</h2>
                <p className="text-sm text-gray-500 truncate">
                  {selectedGroup.description}
                </p>
                {typingBy.size > 0 && (
                  <p className="text-xs text-blue-500 mt-1">
                    {typingBy.size === 1
                      ? `${Array.from(typingBy)[0]} is typing…`
                      : "Several people are typing…"}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchMessages()}
                    placeholder="Search messages..."
                    className="border px-2 py-1 rounded text-sm max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  {searchQuery && (
                    <button
                      onClick={async () => {
                        setSearchQuery("");
                        try {
                          const res = await fetch(
                            `http://localhost:4002/groups/${selectedGroup.groupId}/messages`,
                            {
                              headers: { Authorization: `Bearer ${jwt}` },
                            }
                          );
                          const data = await res.json();
                          if (data.success && Array.isArray(data.messages)) {
                            setMessages(data.messages);
                          } else {
                            console.error("Clear search error:", data.error);
                            setMessages([]);
                          }
                        } catch (e) {
                          console.error("Clear search error:", e);
                          setMessages([]);
                        }
                      }}
                      className="text-xs text-gray-500 hover:text-red-500"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
                  onClick={() => setDrawerOpen(true)}
                >
                  Group Info
                </button>
                <button
                  onClick={leaveGroup}
                  className="text-red-600 border border-red-400 px-3 py-1 rounded text-sm hover:bg-red-50"
                >
                  Leave
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
              {messages.map((m) => (
                <div
                  key={m.messageId}
                  data-mid={m.messageId}
                  data-sender={m.senderId}
                  data-status={m.status}
                  id={`msg-${m.messageId}`}
                  className={`mb-3 flex ${
                    m.senderId === userId ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg shadow ${
                      m.messageType === "system"
                        ? "bg-gray-300 text-gray-800 italic text-center"
                        : m.senderId === userId
                        ? "bg-blue-500 text-white"
                        : "bg-white border"
                    }`}
                  >
                    {m.senderId !== userId && (
                      <div className="text-xs font-bold mb-1">
                        {m.senderName || m.senderId}
                      </div>
                    )}

                    {m.replyTo && (
                      <div
                        className="text-xs italic text-gray-400 border-l-2 pl-2 mb-1 cursor-pointer hover:bg-gray-100"
                        onClick={() =>
                          document
                            .getElementById(`msg-${m.replyTo.messageId}`)
                            ?.scrollIntoView({ behavior: "smooth" })
                        }
                      >
                        ↪ {m.replyTo.content || "[media]"}
                      </div>
                    )}

                    {m.content && <div>{m.content}</div>}
                    {m.isEdited && (
                      <div className="text-xs italic text-gray-300 mt-1">
                        edited
                      </div>
                    )}

                    {Array.isArray(m.attachments) &&
                      m.attachments.map((a, idx) => (
                        <div key={idx} className="mt-1">
                          {a.fileType === "image" ? (
                            <img
                              src={decodeURI(a.url)}
                              alt={a.fileName}
                              className="max-h-40 rounded border cursor-pointer mb-1"
                              onClick={() => window.open(a.url, "_blank")}
                            />
                          ) : a.fileType === "video" ? (
                            <video
                              controls
                              src={decodeURI(a.url)}
                              className="max-h-40 rounded border mb-1"
                            />
                          ) : (
                            <a
                              href={decodeURI(a.url)}
                              target="_blank"
                              rel="noreferrer"
                              className="block underline text-sm text-white hover:text-gray-200 mb-1"
                            >
                              📎 {a.fileName}
                            </a>
                          )}
                        </div>
                      ))}

                    {m.reactions && Object.keys(m.reactions).length > 0 && (
                      <div className="flex space-x-1 mt-1 text-xs">
                        {Object.entries(m.reactions).map(([emoji, users]) => (
                          <span
                            key={emoji}
                            className="bg-gray-200 px-1 rounded cursor-pointer hover:bg-gray-300"
                            title={users.join(", ")}
                          >
                            {emoji} {users.length}
                          </span>
                        ))}
                      </div>
                    )}

                    {!m.deleted && (
                      <div className="text-right mt-1 space-x-2 text-xs opacity-70">
                        <button onClick={() => startReply(m)} title="Reply">
                          ↩️
                        </button>
                        <button
                          onClick={() => reactToMessage(m.messageId, "❤️")}
                          title="React"
                        >
                          ❤️
                        </button>
                        <button onClick={() => pinMessage(m.messageId)} title="Pin">
                          📌
                        </button>
                        <button
                          onClick={() => toggleStar(m.messageId)}
                          title={m.isStarred ? "Unstar" : "Star"}
                        >
                          {m.isStarred ? "⭐" : "☆"}
                        </button>
                        {m.senderId === userId && (
                          <>
                            <button
                              onClick={() =>
                                editMessage(
                                  m.messageId,
                                  prompt("Edit message:", m.content || "")
                                )
                              }
                            >
                              ✏️
                            </button>
                            <button onClick={() => deleteMessage(m.messageId)}>
                              🗑️ Everyone
                            </button>
                            <button onClick={() => viewMessageInfo(m.messageId)}>
                              ℹ️
                            </button>
                          </>
                        )}
                        <button onClick={() => deleteMessageForMe(m.messageId)}>
                          🗑️ Me
                        </button>
                      </div>
                    )}

                    {m.senderId === userId && (
                      <div className="text-right text-xs mt-1 select-none">
                        {m.status === "sent" && "✓"}
                        {m.status === "delivered" && "✓✓"}
                        {m.status === "read" && (
                          <span className="text-blue-400 font-bold">✓✓</span>
                        )}
                        {m.status === "failed" && (
                          <span className="text-red-500">failed</span>
                        )}
                      </div>
                    )}

                    {m.senderId === userId && m.readBy && m.readBy.length > 0 && (
                      <div className="text-right text-xs text-gray-400 mt-1">
                        Read by:{" "}
                        {m.readBy
                          .map((r) => `${r.userId} at ${new Date(r.timestamp).toLocaleTimeString()}`)
                          .join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="p-3 border-t bg-white">
              <FilePreview
                showFilePicker={showFilePicker}
                selectedFiles={selectedFiles}
                setSelectedFiles={setSelectedFiles}
                setShowFilePicker={setShowFilePicker}
                fileInputRef={fileInputRef}
              />

              {replyingTo && (
                <div className="flex justify-between items-center bg-blue-50 border-l-4 border-blue-400 px-3 py-2 mb-2 text-sm rounded">
                  <div>
                    Replying to:{" "}
                    <span className="font-medium">{replyingTo.senderId}</span> —{" "}
                    <span className="italic">
                      {replyingTo.content || "[media]"}
                    </span>
                  </div>
                  <button
                    onClick={cancelReply}
                    className="text-red-500 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              )}

              {canPost ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a message…"
                    className="flex-1 border px-3 py-2 rounded"
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowFilePicker(true);
                    }}
                    className="bg-gray-200 px-3 py-2 rounded"
                    title="Attach"
                  >
                    📎
                  </button>
                  <button
                    onClick={sendMessage}
                    className="bg-blue-500 text-white px-3 py-2 rounded"
                  >
                    Send
                  </button>
                </div>
              ) : (
                <div className="text-gray-500 italic">
                  You can’t send messages in this group.
                </div>
              )}
            </div>

            {/* Right Drawer: Group Info */}
            <div
              className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl border-l transform transition-transform duration-300 ease-in-out ${
                drawerOpen ? "translate-x-0" : "translate-x-full"
              }`}
              style={{ zIndex: 50 }}
            >
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <div className="font-bold">{selectedGroup.name}</div>
                  <div className="text-xs text-gray-500">
                    Group Info • {selectedGroup.members?.length || 0} members
                  </div>
                </div>
                <button
                  className="text-gray-500 hover:text-black"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close"
                >
                  ✖
                </button>
              </div>

              {/* Edit group (admin only) */}
              {isAdmin && (
                <div className="p-4 border-b">
                  <div className="text-sm font-semibold mb-2">Edit group</div>
                  <input
                    className="w-full border p-1 mb-2"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Group name"
                  />
                  <input
                    className="w-full border p-1 mb-2"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Description"
                  />
                  <button
                    className="bg-blue-600 text-white py-1 px-3 rounded w-full"
                    onClick={updateGroup}
                  >
                    Save Changes
                  </button>
                </div>
              )}

              {/* Add members (admin only) */}
              {isAdmin && (
                <div className="p-4 border-b">
                  <div className="text-sm font-semibold mb-2">Add members</div>
                  <div className="flex gap-2">
                    <input
                      className="border p-1 flex-1"
                      placeholder="user1,user2"
                      value={addMembersInput}
                      onChange={(e) => setAddMembersInput(e.target.value)}
                    />
                    <button
                      className="bg-green-600 text-white px-3 rounded"
                      onClick={() => addMembers()}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* 🆕 Generate Invite Link (admin only) */}
              {isAdmin && (
  <div className="p-4 border-b">
    <div className="text-sm font-semibold mb-2">Invite via Link</div>
    <button
      className="bg-blue-600 text-white py-1 px-3 rounded w-full"
      onClick={async () => {
        try {
          const res = await fetch(
            `http://localhost:4002/groups/${selectedGroup.groupId}/invite`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${jwt}` },
            }
          );
          const data = await res.json();
          if (data.success) {
            setInviteLink(data.inviteLink); // New state to show modal
            navigator.clipboard.write(data.inviteLink);
          } else {
            setError("Failed to generate invite link: " + data.error);
          }
        } catch (e) {
          console.error("generateInviteLink error:", e);
          setError("Error generating invite link");
        }
      }}
    >
      Generate Invite Link
    </button>
  </div>
)}
{inviteLink && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-sm w-full">
      <h3 className="text-lg font-semibold mb-2">Group Invite Link</h3>
      <p className="text-sm text-gray-600 mb-4">
        Share this link to invite others to join <strong>{selectedGroup.name}</strong>. The link has been copied to your clipboard.
      </p>
      <input
        className="w-full border p-2 rounded mb-4"
        value={inviteLink}
        readOnly
      />
      <div className="flex gap-2">
        <button
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          onClick={() => {
            navigator.clipboard.write(inviteLink);
            alert("Link copied again!");
          }}
        >
          Copy Again
        </button>
        <button
          className="bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
          onClick={() => setInviteLink(null)}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
{error && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-sm w-full">
      <h3 className="text-lg font-semibold mb-2">Error</h3>
      <p className="text-sm text-red-500 mb-4">{error}</p>
      <button
        className="bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
        onClick={() => setError(null)}
      >
        Close
      </button>
    </div>
  </div>
)}

              {/* Members list */}
              <div className="p-4 overflow-y-auto" style={{ maxHeight: "calc(100% - 220px)" }}>
                <div className="text-sm font-semibold mb-2">Members</div>
                <ul className="space-y-2">
                  {selectedGroup.members?.map((m) => {
                    const isThisAdmin = selectedGroup.admins?.includes(m);
                    const isSelf = m === userId;
                    const isCreator = selectedGroup.createdBy === m;

                    return (
                      <li
                        key={m}
                        className="flex items-center justify-between border rounded px-2 py-1"
                      >
                        <div className="truncate">
                          <span className="font-medium">{m}</span>{" "}
                          {isThisAdmin && <span title="Admin">👑</span>}
                          {isCreator && (
                            <span className="text-xs text-green-600 ml-1">(owner)</span>
                          )}
                          {isSelf && <span className="text-xs text-gray-400"> (me)</span>}
                        </div>

                        {isAdmin && !isSelf && (
                          <div className="flex items-center gap-2 text-xs">
                            {isThisAdmin ? (
                              <button
                                className="px-2 py-0.5 border border-yellow-400 text-yellow-700 rounded hover:bg-yellow-50"
                                onClick={() => removeAdmin(m)}
                                title="Remove admin"
                              >
                                Remove admin
                              </button>
                            ) : (
                              <button
                                className="px-2 py-0.5 border rounded hover:bg-gray-50"
                                onClick={() => makeAdmin(m)}
                                title="Make admin"
                              >
                                Make admin
                              </button>
                            )}
                            {!isThisAdmin && !isCreator && (
                              <button
                                className="px-2 py-0.5 border border-red-400 text-red-600 rounded hover:bg-red-50"
                                onClick={() => removeMember(m)}
                                title="Remove from group"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-4">
                  <button
                    className="w-full text-sm px-3 py-1 border rounded hover:bg-gray-50 mb-2"
                    onClick={loadStarredMessages}
                  >
                    View Starred Messages
                  </button>
                  {showStarred && (
                    <div className="border-t pt-2">
                      <div className="text-sm font-semibold mb-2">Starred Messages</div>
                      {starredMessages.length === 0 ? (
                        <p className="text-xs text-gray-500">No starred messages</p>
                      ) : (
                        <ul className="space-y-2 max-h-40 overflow-y-auto">
                          {starredMessages.map((s) => (
                            <li
                              key={s.messageId}
                              className="text-xs bg-gray-100 p-2 rounded cursor-pointer hover:bg-gray-200"
                              onClick={() =>
                                document
                                  .getElementById(`msg-${s.messageId}`)
                                  ?.scrollIntoView({ behavior: "smooth" })
                              }
                            >
                              <span className="font-medium">{s.senderId}</span>:{" "}
                              {s.content || "[media]"} -{" "}
                              {new Date(s.starredAt).toLocaleString([], {
                                month: "numeric",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </li>
                          ))}
                        </ul>
                      )}
                      <button
                        onClick={() => setShowStarred(false)}
                        className="text-xs text-red-500 hover:underline mt-2"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer backdrop */}
            {drawerOpen && (
              <div
                className="fixed inset-0 bg-black/30"
                style={{ zIndex: 40 }}
                onClick={() => setDrawerOpen(false)}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a group to start chatting
          </div>
        )}
      </div>
    </div>
  );
}