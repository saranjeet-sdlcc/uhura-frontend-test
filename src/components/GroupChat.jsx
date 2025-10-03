// src/components/GroupChat.jsx
import { useEffect, useState, useRef } from "react";
import * as signalR from "@microsoft/signalr";

export default function GroupChat({ jwt, userId }) {
  const [connection, setConnection] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [canPost, setCanPost] = useState(false);

  // form states
  const [text, setText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);

  // create/edit
  const [groupName, setGroupName] = useState("");
  const [memberCsv, setMemberCsv] = useState("");
  const [description, setDescription] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- SignalR connect
  const connect = async () => {
    const res = await fetch("http://localhost:4002/negotiate", {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const { url, accessToken } = await res.json();

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(url, { accessTokenFactory: () => accessToken })
      .withAutomaticReconnect()
      .build();

    // realtime new messages
    conn.on("newMessage", (msg) => {
      console.log("📥 newMessage:", msg);

      if (msg.isGroup) {
        if (selectedGroup && msg.groupId === selectedGroup.groupId) {
          setMessages((prev) => [...prev, msg]);
        }

        if (msg.senderId !== userId && Notification.permission === "granted") {
          new Notification(`${msg.senderName || msg.senderId}`, {
            body: msg.content || "[media]",
          });
        }
      }
    });

    // realtime group updates
    conn.on("groupUpdated", (evt) => {
      console.log("📥 groupUpdated:", evt);

      if (evt.type === "groupDeleted" && evt.groupId === selectedGroup?.groupId) {
        alert("🚨 Group deleted by admin");
        setSelectedGroup(null);
        setMessages([]);
      } else if (evt.type === "memberRemoved" && evt.memberId === userId) {
        alert("🚫 You were removed from this group");
        setCanPost(false);
      }
      fetchGroups();
    });

    await conn.start();
    setConnection(conn);
    console.log("✅ Connected to SignalR hub");
  };

  // --- Groups
  const fetchGroups = async () => {
    const res = await fetch("http://localhost:4002/groups", {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const data = await res.json();
    setGroups(data.groups || []);
  };

  const fetchGroupDetails = async (groupId) => {
  const groupRes = await fetch(`http://localhost:4002/groups/${groupId}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const groupData = await groupRes.json();
  if (groupData.success) {
    setSelectedGroup(groupData.group);
    setEditName(groupData.group.name);
    setEditDesc(groupData.group.description);
    setCanPost(groupData.group.canPost !== false);

    // ✅ Fetch messages from proper endpoint
    const msgRes = await fetch(`http://localhost:4002/groups/${groupId}/messages?page=1&limit=50`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    const msgData = await msgRes.json();
    if (msgData.success) {
      setMessages(msgData.messages || []);
    }
  }
};


  const createGroup = async () => {
    const body = {
      name: groupName,
      description,
      memberIds: memberCsv.split(",").map((m) => m.trim()).filter(Boolean),
    };
    const res = await fetch("http://localhost:4002/groups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      setGroupName("");
      setDescription("");
      setMemberCsv("");
      fetchGroups();
    } else alert(data.error || "Failed to create group");
  };

  // --- Admin actions
  const addMembers = async (ids) => {
    await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ memberIds: ids }),
    });
    fetchGroupDetails(selectedGroup.groupId);
  };

  const removeMember = async (id) => {
    await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ memberId: id }),
    });
    fetchGroupDetails(selectedGroup.groupId);
  };

  const leaveGroup = async () => {
    await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}/leave`, {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
    });
    setSelectedGroup(null);
    fetchGroups();
  };

  const updateGroup = async () => {
    await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ name: editName, description: editDesc }),
    });
    fetchGroupDetails(selectedGroup.groupId);
  };

  const deleteGroup = async () => {
    if (!window.confirm("Delete this group permanently?")) return;
    await fetch(`http://localhost:4002/groups/${selectedGroup.groupId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${jwt}` },
    });
    setSelectedGroup(null);
    fetchGroups();
  };

  // --- Messaging
  const sendMessage = async () => {
    if (!canPost || (!text.trim() && selectedFiles.length === 0)) return;
    const headers = { Authorization: `Bearer ${jwt}` };
    let body,
      endpoint = `http://localhost:4002/groups/${selectedGroup.groupId}/messages`;

    if (selectedFiles.length > 0) {
      const formData = new FormData();
      formData.append("content", text);
      selectedFiles.forEach((f) => formData.append("media", f));
      if (replyingTo) formData.append("replyToMessageId", replyingTo.messageId);
      body = formData;
      endpoint += "/media";
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify({
        content: text,
        ...(replyingTo && { replyToMessageId: replyingTo.messageId }),
      });
    }

    const res = await fetch(endpoint, { method: "POST", headers, body });
    const data = await res.json();
    if (data.success) {
      // don’t push manually, SignalR will deliver it
      setText("");
      setSelectedFiles([]);
      setReplyingTo(null);
    }
  };

  // Init connect + groups
  useEffect(() => {
    if (jwt) {
      connect();
      fetchGroups();
    }
    if (Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, [jwt]);

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
      <div className="flex-1 flex flex-col">
        {selectedGroup ? (
          <>
            {/* Header */}
            <div className="p-3 border-b bg-white flex justify-between items-center">
              <div>
                <h2 className="font-bold">{selectedGroup.name}</h2>
                <p className="text-sm text-gray-500">
                  {selectedGroup.description}
                </p>
              </div>
              <button onClick={leaveGroup} className="text-red-500">
                Leave
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
              {messages.map((m) =>
                m.messageType === "system" ? (
                  <div
                    key={m.messageId}
                    className="text-center text-xs text-gray-500 italic my-2"
                  >
                    {m.content}
                  </div>
                ) : (
                  <div
                    key={m.messageId}
                    className={`mb-3 flex ${
                      m.senderId === userId
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg ${
                        m.senderId === userId
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
                        <div className="text-xs italic text-gray-400 border-l-2 pl-2 mb-1">
                          ↪ {m.replyTo.content || "[media]"}
                        </div>
                      )}
                      {m.content && <div>{m.content}</div>}
                      {m.attachments?.map((a, idx) => (
                        <div key={idx} className="mt-1">
                          {a.fileType === "image" ? (
                            <img
                              src={a.url}
                              alt={a.fileName}
                              className="max-h-32 rounded"
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
                    </div>
                  </div>
                )
              )}
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
                    placeholder="Type a message..."
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
                    onClick={() => fileInputRef.current.click()}
                    className="bg-gray-200 px-3 py-2 rounded"
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
                  You can no longer send messages in this group.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a group to start chatting
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      {selectedGroup && (
        <div className="w-1/4 bg-gray-50 border-l p-3 overflow-y-auto">
          <h3 className="font-bold mb-2">Members</h3>
          <ul>
            {selectedGroup.members.map((m) => (
              <li key={m} className="flex justify-between mb-1">
                <span>
                  {m} {selectedGroup.admins?.includes(m) && "👑"}
                </span>
                {selectedGroup.admins?.includes(userId) && m !== userId && (
                  <button
                    onClick={() => removeMember(m)}
                    className="text-red-500 text-xs"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>

          {selectedGroup.admins?.includes(userId) && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">➕ Add Members</h4>
              <input
                placeholder="New member IDs (comma)"
                className="w-full border p-1 mb-2"
                onBlur={(e) =>
                  addMembers(e.target.value.split(",").map((x) => x.trim()))
                }
              />

              <h4 className="font-semibold mb-2 mt-4">✏️ Edit Group</h4>
              <input
                className="w-full border mb-2 p-1"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <input
                className="w-full border mb-2 p-1"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
              <button
                className="bg-blue-600 text-white w-full py-1 rounded mb-2"
                onClick={updateGroup}
              >
                Save Changes
              </button>

              <button
                className="bg-red-600 text-white w-full py-1 rounded"
                onClick={deleteGroup}
              >
                Delete Group
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
