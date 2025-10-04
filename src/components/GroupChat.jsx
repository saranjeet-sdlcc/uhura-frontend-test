// // src/components/GroupChat.jsx
// import { useEffect, useState, useRef } from "react";
// import * as signalR from "@microsoft/signalr";

// export default function GroupChat({ jwt, userId }) {
//   const [connection, setConnection] = useState(null);
//   const [groups, setGroups] = useState([]);
//   const [selectedGroup, setSelectedGroup] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [canPost, setCanPost] = useState(false);

//   // form states
//   const [text, setText] = useState("");
//   const [selectedFiles, setSelectedFiles] = useState([]);
//   const [replyingTo, setReplyingTo] = useState(null);

//   // create/edit
//   const [groupName, setGroupName] = useState("");
//   const [memberCsv, setMemberCsv] = useState("");
//   const [description, setDescription] = useState("");
//   const [editName, setEditName] = useState("");
//   const [editDesc, setEditDesc] = useState("");

//   const messagesEndRef = useRef(null);
//   const fileInputRef = useRef(null);

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   // --- SignalR connect
//   const connect = async () => {
//     const res = await fetch("http://localhost:4002/negotiate", {
//       headers: { Authorization: `Bearer ${jwt}` },
//     });
//     const { url, accessToken } = await res.json();

//     const conn = new signalR.HubConnectionBuilder()
//       .withUrl(url, { accessTokenFactory: () => accessToken })
//       .withAutomaticReconnect()
//       .build();

//     // realtime new messages
//     conn.on("newMessage", (msg) => {
//       console.log("📥 newMessage:", msg);

//       if (msg.isGroup) {
//         if (selectedGroup && msg.groupId === selectedGroup.groupId) {
//           setMessages((prev) => [...prev, msg]);
//         }

//         if (msg.senderId !== userId && Notification.permission === "granted") {
//           new Notification(`${msg.senderName || msg.senderId}`, {
//             body: msg.content || "[media]",
//           });
//         }
//       }
//     });

//     // realtime group updates
//     conn.on("groupUpdated", (evt) => {
//       console.log("📥 groupUpdated:", evt);

//       if (evt.type === "groupDeleted" && evt.groupId === selectedGroup?.groupId) {
//         alert("🚨 Group deleted by admin");
//         setSelectedGroup(null);
//         setMessages([]);
//       } else if (evt.type === "memberRemoved" && evt.memberId === userId) {
//         alert("🚫 You were removed from this group");
//         setCanPost(false);
//       }
//       fetchGroups();
//     });

//     await conn.start();
//     setConnection(conn);
//     console.log("✅ Connected to SignalR hub");
//   };

//   // --- Groups
//   const fetchGroups = async () => {
//     const res = await fetch("http://localhost:4002/groups", {
//       headers: { Authorization: `Bearer ${jwt}` },
//     });
//     const data = await res.json();
//     setGroups(data.groups || []);
//   };

//   const fetchGroupDetails = async (groupId) => {
//   const groupRes = await fetch(`http://localhost:4002/groups/${groupId}`, {
//     headers: { Authorization: `Bearer ${jwt}` },
//   });
//   const groupData = await groupRes.json();
//   if (groupData.success) {
//     setSelectedGroup(groupData.group);
//     setEditName(groupData.group.name);
//     setEditDesc(groupData.group.description);
//     setCanPost(groupData.group.canPost !== false);

//     // ✅ Fetch messages from proper endpoint
//     const msgRes = await fetch(`http://localhost:4002/groups/${groupId}/messages?page=1&limit=50`, {
//       headers: { Authorization: `Bearer ${jwt}` },
//     });
//     const msgData = await msgRes.json();
//     if (msgData.success) {
//       setMessages(msgData.messages || []);
//     }
//   }
// };


//   const createGroup = async () => {
//     const body = {
//       name: groupName,
//       description,
//       memberIds: memberCsv.split(",").map((m) => m.trim()).filter(Boolean),
//     };
//     const res = await fetch("http://localhost:4002/groups", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${jwt}`,
//       },
//       body: JSON.stringify(body),
//     });
//     const data = await res.json();
//     if (data.success) {
//       setGroupName("");
//       setDescription("");
//       setMemberCsv("");
//       fetchGroups();
//     } else alert(data.error || "Failed to create group");
//   };

//   // --- Admin actions
//   const addMembers = async (ids) => {
//     await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/members`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
//       body: JSON.stringify({ memberIds: ids }),
//     });
//     fetchGroupDetails(selectedGroup.groupId);
//   };

//   const removeMember = async (id) => {
//     await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/members`, {
//       method: "DELETE",
//       headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
//       body: JSON.stringify({ memberId: id }),
//     });
//     fetchGroupDetails(selectedGroup.groupId);
//   };

//   const leaveGroup = async () => {
//     await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/leave`, {
//       method: "POST",
//       headers: { Authorization: `Bearer ${jwt}` },
//     });
//     setSelectedGroup(null);
//     fetchGroups();
//   };

//   const updateGroup = async () => {
//     await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}`, {
//       method: "PATCH",
//       headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
//       body: JSON.stringify({ name: editName, description: editDesc }),
//     });
//     fetchGroupDetails(selectedGroup.groupId);
//   };

//   const deleteGroup = async () => {
//     if (!window.confirm("Delete this group permanently?")) return;
//     await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}`, {
//       method: "DELETE",
//       headers: { Authorization: `Bearer ${jwt}` },
//     });
//     setSelectedGroup(null);
//     fetchGroups();
//   };

//   // --- Messaging
//   const sendMessage = async () => {
//     if (!canPost || (!text.trim() && selectedFiles.length === 0)) return;
//     const headers = { Authorization: `Bearer ${jwt}` };
//     let body,
//       endpoint = `http://localhost:4002/groups/${selectedGroup.groupId}/messages`;

//     if (selectedFiles.length > 0) {
//       const formData = new FormData();
//       formData.append("content", text);
//       selectedFiles.forEach((f) => formData.append("media", f));
//       if (replyingTo) formData.append("replyToMessageId", replyingTo.messageId);
//       body = formData;
//       endpoint += "/media";
//     } else {
//       headers["Content-Type"] = "application/json";
//       body = JSON.stringify({
//         content: text,
//         ...(replyingTo && { replyToMessageId: replyingTo.messageId }),
//       });
//     }

//     const res = await fetch(endpoint, { method: "POST", headers, body });
//     const data = await res.json();
//     if (data.success) {
//       // don’t push manually, SignalR will deliver it
//       setText("");
//       setSelectedFiles([]);
//       setReplyingTo(null);
//     }
//   };

//   // Init connect + groups
//   useEffect(() => {
//     if (jwt) {
//       connect();
//       fetchGroups();
//     }
//     if (Notification.permission !== "granted") {
//       Notification.requestPermission();
//     }
//   }, [jwt]);

//   return (
//     <div className="flex h-[600px] border rounded overflow-hidden">
//       {/* Sidebar */}
//       <div className="w-1/4 bg-gray-100 border-r p-3 overflow-y-auto">
//         <h3 className="font-bold mb-3">Groups</h3>
//         {groups.map((g) => (
//           <div
//             key={g.groupId}
//             onClick={() => fetchGroupDetails(g.groupId)}
//             className={`p-2 rounded cursor-pointer mb-2 ${
//               selectedGroup?.groupId === g.groupId
//                 ? "bg-blue-500 text-white"
//                 : "hover:bg-gray-200"
//             }`}
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
//       <div className="flex-1 flex flex-col">
//         {selectedGroup ? (
//           <>
//             {/* Header */}
//             <div className="p-3 border-b bg-white flex justify-between items-center">
//               <div>
//                 <h2 className="font-bold">{selectedGroup.name}</h2>
//                 <p className="text-sm text-gray-500">
//                   {selectedGroup.description}
//                 </p>
//               </div>
//               <button onClick={leaveGroup} className="text-red-500">
//                 Leave
//               </button>
//             </div>

//             {/* Messages */}
//             <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
//               {messages.map((m) =>
//                 m.messageType === "system" ? (
//                   <div
//                     key={m.messageId}
//                     className="text-center text-xs text-gray-500 italic my-2"
//                   >
//                     {m.content}
//                   </div>
//                 ) : (
//                   <div
//                     key={m.messageId}
//                     className={`mb-3 flex ${
//                       m.senderId === userId
//                         ? "justify-end"
//                         : "justify-start"
//                     }`}
//                   >
//                     <div
//                       className={`max-w-xs px-3 py-2 rounded-lg ${
//                         m.senderId === userId
//                           ? "bg-blue-500 text-white"
//                           : "bg-white border"
//                       }`}
//                     >
//                       {m.senderId !== userId && (
//                         <div className="text-xs font-bold mb-1">
//                           {m.senderName || m.senderId}
//                         </div>
//                       )}
//                       {m.replyTo && (
//                         <div className="text-xs italic text-gray-400 border-l-2 pl-2 mb-1">
//                           ↪ {m.replyTo.content || "[media]"}
//                         </div>
//                       )}
//                       {m.content && <div>{m.content}</div>}
//                       {m.attachments?.map((a, idx) => (
//                         <div key={idx} className="mt-1">
//                           {a.fileType === "image" ? (
//                             <img
//                               src={a.url}
//                               alt={a.fileName}
//                               className="max-h-32 rounded"
//                             />
//                           ) : (
//                             <a
//                               href={a.url}
//                               target="_blank"
//                               rel="noreferrer"
//                               className="underline text-sm"
//                             >
//                               {a.fileName}
//                             </a>
//                           )}
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 )
//               )}
//               <div ref={messagesEndRef} />
//             </div>

//             {/* Composer */}
//             <div className="p-3 border-t bg-white">
//               {canPost ? (
//                 <div className="flex items-center space-x-2">
//                   <input
//                     type="text"
//                     value={text}
//                     onChange={(e) => setText(e.target.value)}
//                     placeholder="Type a message..."
//                     className="flex-1 border px-3 py-2 rounded"
//                     onKeyDown={(e) => e.key === "Enter" && sendMessage()}
//                   />
//                   <input
//                     type="file"
//                     multiple
//                     ref={fileInputRef}
//                     onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
//                     className="hidden"
//                   />
//                   <button
//                     onClick={() => fileInputRef.current.click()}
//                     className="bg-gray-200 px-3 py-2 rounded"
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
//                   You can no longer send messages in this group.
//                 </div>
//               )}
//             </div>
//           </>
//         ) : (
//           <div className="flex-1 flex items-center justify-center text-gray-400">
//             Select a group to start chatting
//           </div>
//         )}
//       </div>

//       {/* Right Sidebar */}
//       {selectedGroup && (
//         <div className="w-1/4 bg-gray-50 border-l p-3 overflow-y-auto">
//           <h3 className="font-bold mb-2">Members</h3>
//           <ul>
//             {selectedGroup.members.map((m) => (
//               <li key={m} className="flex justify-between mb-1">
//                 <span>
//                   {m} {selectedGroup.admins?.includes(m) && "👑"}
//                 </span>
//                 {selectedGroup.admins?.includes(userId) && m !== userId && (
//                   <button
//                     onClick={() => removeMember(m)}
//                     className="text-red-500 text-xs"
//                   >
//                     Remove
//                   </button>
//                 )}
//               </li>
//             ))}
//           </ul>

//           {selectedGroup.admins?.includes(userId) && (
//             <div className="mt-4">
//               <h4 className="font-semibold mb-2">➕ Add Members</h4>
//               <input
//                 placeholder="New member IDs (comma)"
//                 className="w-full border p-1 mb-2"
//                 onBlur={(e) =>
//                   addMembers(e.target.value.split(",").map((x) => x.trim()))
//                 }
//               />

//               <h4 className="font-semibold mb-2 mt-4">✏️ Edit Group</h4>
//               <input
//                 className="w-full border mb-2 p-1"
//                 value={editName}
//                 onChange={(e) => setEditName(e.target.value)}
//               />
//               <input
//                 className="w-full border mb-2 p-1"
//                 value={editDesc}
//                 onChange={(e) => setEditDesc(e.target.value)}
//               />
//               <button
//                 className="bg-blue-600 text-white w-full py-1 rounded mb-2"
//                 onClick={updateGroup}
//               >
//                 Save Changes
//               </button>

//               <button
//                 className="bg-red-600 text-white w-full py-1 rounded"
//                 onClick={deleteGroup}
//               >
//                 Delete Group
//               </button>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }


// src/components/GroupChat.jsx
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import * as signalR from "@microsoft/signalr";

export default function GroupChat({ jwt, userId }) {
  const [connection, setConnection] = useState(null);

  // Groups & selection
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const selectedGroupRef = useRef(null);

  // Messages for the selected group only (live via SignalR)
  const [messages, setMessages] = useState([]);

  // Composer state
  const [text, setText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
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

  // Optional typing indicator (will show if backend emits `typing` events)
  const [typingBy, setTypingBy] = useState(new Set());

  // Permissions (keep existing flag + infer from membership)
  const [canPost, setCanPost] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const observerRef = useRef(null);
  const visibleMsgIdsRef = useRef(new Set());

  // For optimistic send & reconciliation
  const pendingLocalIdsRef = useRef({}); // tempId -> { content, createdAt }

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

  // Keep a ref for the currently selected group to avoid stale closures in SignalR handlers
  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
    // If you were removed, you can’t post anymore
    setCanPost(selectedGroup?.canPost !== false && isMember);
  }, [selectedGroup, isMember]);

  // Create an IntersectionObserver to mark messages as READ when visible
  useEffect(() => {
    if (!jwt) return;

    // Cleanup previous observer
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

          // Only mark as read for others' messages that are not already read
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
                await fetch("http://localhost:4002/groups/messages/read", {
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

    // Observe current messages
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

      // 🔔 New message (group + 1:1 share same channel)
      conn.on("newMessage", async (msg) => {
        if (!msg?.isGroup || !msg?.groupId) return;

        // Only show in the currently open chat
        const openGroupId = selectedGroupRef.current?.groupId;
        if (msg.groupId !== openGroupId) return;

        // If this message came from someone else, mark delivered immediately
        if (msg.senderId !== userId && msg.status === "sent") {
          try {
            await fetch("http://localhost:4002/groups/messages/delivered", {
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

        // Reconcile optimistic local message (same sender + same content within short window)
        let replaced = false;
        const tempIds = Object.keys(pendingLocalIdsRef.current);
        if (msg.senderId === userId && tempIds.length) {
          const candidateId = tempIds.find((k) => {
            const item = pendingLocalIdsRef.current[k];
            if (!item) return false;
            const timeGap = Math.abs(new Date(msg.createdAt) - new Date(item.createdAt));
            return item.content === msg.content && timeGap < 8000; // 8s window
          });
          if (candidateId) {
            setMessages((prev) =>
              prev.map((m) =>
                m.messageId === candidateId
                  ? { ...msg, isLocal: false } // replace temp with real server msg
                  : m
              )
            );
            delete pendingLocalIdsRef.current[candidateId];
            replaced = true;
          }
        }

        if (!replaced) {
  setMessages((prev) => {
    // 🧩 Prevent duplicates (same messageId already exists)
    if (prev.some((m) => m.messageId === msg.messageId)) return prev;
    return [...prev, msg];
  });
}

      });

      // ✏️ Edited
      conn.on("messageEdited", (msg) => {
        if (!msg?.groupId) return;
        if (msg.groupId !== selectedGroupRef.current?.groupId) return;
        setMessages((prev) =>
          prev.map((m) => (m.messageId === msg.messageId ? { ...m, ...msg } : m))
        );
      });

      // 🗑️ Deleted
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

      // ✓ receipts
      conn.on("messageReceipt", ({ messageId, status, from, groupId }) => {
        if (groupId && groupId !== selectedGroupRef.current?.groupId) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.messageId === messageId
              ? {
                  ...m,
                  status,
                  deliveredTo:
                    status === "delivered"
                      ? [...(m.deliveredTo || []), from]
                      : m.deliveredTo,
                  readBy:
                    status === "read" ? [...(m.readBy || []), from] : m.readBy,
                }
              : m
          )
        );
      });

      // Optional typing indicator (no backend change required, but server must emit)
      conn.on("typing", ({ groupId, userId: who, isTyping }) => {
        if (!groupId || groupId !== selectedGroupRef.current?.groupId) return;
        setTypingBy((prev) => {
          const next = new Set(Array.from(prev));
          if (isTyping) next.add(who);
          else next.delete(who);
          return next;
        });
        // auto clear after a few seconds (in case no stop event arrives)
        setTimeout(() => {
          setTypingBy((prev) => {
            const next = new Set(Array.from(prev));
            next.delete(who);
            return next;
          });
        }, 4000);
      });

      // Group meta updates
      conn.on("groupUpdated", (evt) => {
        // server should emit { type: "...", groupId, memberId? }
        if (
          evt.type === "groupDeleted" &&
          evt.groupId === selectedGroupRef.current?.groupId
        ) {
          alert("🚨 Group deleted by admin");
          setSelectedGroup(null);
          setMessages([]);
        } else if (
          evt.type === "memberRemoved" &&
          evt.groupId === selectedGroupRef.current?.groupId &&
          evt.memberId === userId
        ) {
          alert("🚫 You were removed from this group");
          setSelectedGroup(null);
          setMessages([]);
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

      // You can post only if you're still a member & canPost isn’t disabled by server
      const allowed = (gd.group.canPost !== false) && (gd.group.members || []).includes(userId);
      setCanPost(allowed);

      // Clear messages; from now, only real-time flow fills them
      setMessages([]);
      setDrawerOpen(false); // close drawer when switching groups
    } catch (e) {
      console.error("fetchGroupDetails error:", e);
    }
  };

  /* ------------------ Admin actions (EXISTING endpoints) ------------------ */
  // ADD members: POST /groups/:groupId/members  { memberIds: [] }
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

  // REMOVE single member: DELETE /groups/:groupId/members  { memberId: "..." }
  const removeMember = async (memberId) => {
    if (!selectedGroup || !memberId) return;

    // Front-end guards per your rules:
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

      // If you removed yourself, leave the view
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

  // MAKE ADMIN (if your backend route exists)
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

  // LEAVE group: POST /groups/:groupId/leave
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
  const sendMessage = async () => {
    if (!selectedGroup || !canPost) {
      if (!isMember) alert("You are not a member of this group.");
      return;
    }
    if (!text.trim() && selectedFiles.length === 0) return;

    const headers = { Authorization: `Bearer ${jwt}` };
    let body;
    let endpoint = `http://localhost:4002/groups/${selectedGroup.groupId}/messages`;

    // Optimistic bubble for sender
    const tempId = "local-" + Date.now();
    const now = new Date().toISOString();
    const optimistic = {
      messageId: tempId,
      groupId: selectedGroup.groupId,
      isGroup: true,
      senderId: userId,
      content: text,
      attachments: [],
      createdAt: now,
      status: "sent",
      isLocal: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    pendingLocalIdsRef.current[tempId] = { content: text, createdAt: now };

    try {
      if (selectedFiles.length > 0) {
        const fd = new FormData();
        fd.append("content", text);
        selectedFiles.forEach((f) => fd.append("media", f));
        body = fd;
        endpoint += "/media";
      } else {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify({
          content: text,
          ...(replyingTo && { replyToMessageId: replyingTo.messageId }),
        });
      }

      await fetch(endpoint, { method: "POST", headers, body });
      // server broadcast will replace/append the final message
    } catch (e) {
      console.error("sendMessage error:", e);
      // mark optimistic as failed
      setMessages((prev) =>
        prev.map((m) => (m.messageId === tempId ? { ...m, status: "failed" } : m))
      );
    } finally {
      setText("");
      setSelectedFiles([]);
      setReplyingTo(null);
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

  /* ------------------ Mount ------------------ */
  useEffect(() => {
    if (!jwt) return;
    connect();
    fetchGroups();
    if (Notification.permission !== "granted") Notification.requestPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jwt]);

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
              <div className="min-w-0">
                <h2 className="font-bold truncate">{selectedGroup.name}</h2>
                <p className="text-sm text-gray-500 truncate">
                  {selectedGroup.description}
                </p>
                {/* Typing indicator (shows if server emits `typing`) */}
                {typingBy.size > 0 && (
                  <p className="text-xs text-blue-500 mt-1">
                    {typingBy.size === 1
                      ? `${Array.from(typingBy)[0]} is typing…`
                      : "Several people are typing…"}
                  </p>
                )}
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
                      m.senderId === userId
                        ? "bg-blue-500 text-white"
                        : "bg-white border"
                    }`}
                  >
                    {/* Sender name for others */}
                    {m.senderId !== userId && (
                      <div className="text-xs font-bold mb-1">
                        {m.senderName || m.senderId}
                      </div>
                    )}

                    {/* Reply preview */}
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

                    {/* Content */}
                    {m.content && <div>{m.content}</div>}
                    {m.isEdited && (
                      <div className="text-xs italic text-gray-300 mt-1">
                        edited
                      </div>
                    )}

                    {/* Attachments */}
                    {Array.isArray(m.attachments) &&
                      m.attachments.map((a, idx) => (
                        <div key={idx} className="mt-1">
                          {a.fileType === "image" ? (
                            <img
                              src={a.url}
                              alt={a.fileName}
                              className="max-h-40 rounded"
                            />
                          ) : (
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noreferrer"
                              className="underline text-sm"
                            >
                              {a.fileName}
                            </a>
                          )}
                        </div>
                      ))}

                    {/* Actions (only own messages) */}
                    {m.senderId === userId && !m.deleted && (
                      <div className="text-right mt-1 space-x-2 text-xs opacity-70">
                        <button
                          onClick={() =>
                            editMessage(
                              m.messageId,
                              prompt("Edit message:", m.content || "")
                            )
                          }
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteMessage(m.messageId)}
                          title="Delete for Everyone"
                        >
                          🗑️
                        </button>
                        <button
                          onClick={() => reactToMessage(m.messageId, "❤️")}
                          title="React"
                        >
                          ❤️
                        </button>
                      </div>
                    )}

                    {/* Ticks */}
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
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="p-3 border-t bg-white">
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
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
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

              {/* Edit group (admin only, preserved) */}
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

              {/* Add members quick input (admin only) */}
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
                          {isCreator && <span className="text-xs text-green-600 ml-1">(owner)</span>}
                          {isSelf && <span className="text-xs text-gray-400"> (you)</span>}
                        </div>

                        {isAdmin && !isSelf && (
                          <div className="flex items-center gap-2 text-xs">
                            {/* Only show Make admin if target is not already admin */}
                            {!isThisAdmin && (
                              <button
                                className="px-2 py-0.5 border rounded hover:bg-gray-50"
                                onClick={() => makeAdmin(m)}
                                title="Make admin"
                              >
                                Make admin
                              </button>
                            )}

                            {/* Remove: cannot remove admins, and cannot remove the creator */}
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
