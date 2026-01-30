// App.jsx
import { useEffect, useState, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import AuthForm from "./components/AuthForm";
import ConnectionForm from "./components/ConnectionForm";
import ChatPanel from "./components/ChatPanel";
import ConversationList from "./components/ConversationList";
import LiveMessages from "./components/LiveMessages";
import BulkActions from "./components/BulkActions";
import CallPanel from "./components/CallPanel";
import NotificationPanel from "./components/NotificationPanel";
import GroupChatTest from "./components/GroupChat"; // ✅ group chat tester
import JoinGroup from "./components/JoinGroup"; // ✅ group invite route
import { fetchFcmToken } from "./components/firebase";

import "./App.css";

export default function App() {
  const [jwt, setJwt] = useState("");
  const [userId, setUserId] = useState("");
  const [authData, setAuthData] = useState(null);

  // -------------------- 1:1 (private) chat state --------------------
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [connection, setConnection] = useState(null);
  const [messages, setMessages] = useState([]); // <-- 1:1 only
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]); // <-- 1:1 thread
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [activeFilter, setActiveFilter] = useState("inbox");

  // -------------------- GROUP chat state (fully separate) --------------------
  const [groupMessagesByGroup, setGroupMessagesByGroup] = useState({}); // { [groupId]: Message[] }
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [loadingGroupMessages, setLoadingGroupMessages] = useState(false);

  // Notifications
  const [notificationConnection, setNotificationConnection] = useState(null);
  const [receivedNotifications, setReceivedNotifications] = useState([]);

  // Flags / UI
  const [connected, setConnected] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);

  const [userPresence, setUserPresence] = useState({});
  const [typingUsers, setTypingUsers] = useState({}); // { conversationId: { userId: timestamp } }

  // Call state
  const [callState, setCallState] = useState("None");
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "group" | "call" | "notification"

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // 🔔 Register FCM Token when logged in
  useEffect(() => {
    if (!jwt || !userId) return;

    fetchFcmToken().then((token) => {
      if (token) {
        console.log("✅ Got FCM Token:", token);

        fetch("http://localhost:4003/device-tokens/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            userId,
            token,
            platform: "web",
          }),
        })
          .then((res) => res.json())
          .then((data) => console.log("📱 Device token registered:", data))
          .catch((err) =>
            console.error("❌ Device token registration error:", err),
          );
      }
    });
  }, [jwt, userId]);

  // Scroll to bottom on new 1:1 messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Presence management
  // Presence management
  useEffect(() => {
    if (!connected || !jwt) return;

    // Set online when connected
    fetch("http://localhost:4002/presence/online", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
    }).catch((err) => console.warn("Set online failed:", err));

    // Uncomment to keep presence alive
    // const heartbeatInterval = setInterval(() => {
    //   fetch("http://localhost:4002/presence/heartbeat", {
    //     method: "POST",
    //     headers: { Authorization: `Bearer ${jwt}` },
    //   }).catch((err) => console.warn("Heartbeat failed:", err));
    // }, 15000); // Changed to 15 seconds

    // Handle tab close, browser close, or navigation away
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable offline notification
      const blob = new Blob([JSON.stringify({})], { type: "application/json" });
      navigator.sendBeacon("http://localhost:4002/presence/offline", blob);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User switched tabs or minimized
        fetch("http://localhost:4002/presence/offline", {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt}` },
          keepalive: true, // Ensure request completes even if page is closing
        }).catch((err) => console.warn("Set offline failed:", err));
      } else {
        // User came back to tab
        fetch("http://localhost:4002/presence/online", {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt}` },
        }).catch((err) => console.warn("Set online failed:", err));
      }
    };

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Set offline on unmount/disconnect
    return () => {
      // uncomment to on heartbeat cleanUp
      // clearInterval(heartbeatInterval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      // Final offline call
      navigator.sendBeacon(
        "http://localhost:4002/presence/offline",
        new Blob([JSON.stringify({})], { type: "application/json" }),
      );
    };
  }, [connected, jwt]);

  // Clean up typing indicators
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((convId) => {
          Object.keys(updated[convId]).forEach((uid) => {
            if (now - updated[convId][uid] > 10000) {
              delete updated[convId][uid];
            }
          });
          if (Object.keys(updated[convId]).length === 0) {
            delete updated[convId];
          }
        });
        return updated;
      });
    }, 2000);

    return () => clearInterval(cleanupInterval);
  }, []);

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
    // 1:1 only
    setMessages((prev) =>
      prev.map((m) => (m.messageId === messageId ? { ...m, ...patch } : m)),
    );
    setConversationMessages((prev) =>
      prev.map((m) => (m.messageId === messageId ? { ...m, ...patch } : m)),
    );
  };

  // Optional helper if you later want to edit group messages in-place
  const updateGroupMessageById = (groupId, messageId, patch) => {
    setGroupMessagesByGroup((prev) => {
      const list = prev[groupId] || [];
      const updated = list.map((m) =>
        m.messageId === messageId ? { ...m, ...patch } : m,
      );
      return { ...prev, [groupId]: updated };
    });
  };

  // ✅ SignalR Connect (chat + notification hubs)
  const connectToSignalR = async () => {
    if (!jwt || !userId) return;

    try {
      // --- Chat hub ---
      const chatRes = await fetch("http://localhost:4002/negotiate", {
        method: "GET",
        headers: { Authorization: `Bearer ${jwt}` },
      });
      if (!chatRes.ok)
        throw new Error(`Chat negotiate failed: ${chatRes.status}`);
      const { url: chatUrl, accessToken: chatAccessToken } =
        await chatRes.json();

      const chatConnection = new signalR.HubConnectionBuilder()
        .withUrl(chatUrl, { accessTokenFactory: () => chatAccessToken })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Single entry point for server "newMessage"
      chatConnection.on("newMessage", (msg) => {
        console.log("📥 Received newMessage:", msg);
        const incomingMsg = {
          ...msg,
          incoming: true,
          status: msg.status || "sent",
          isReply: msg.isReply || false,
          replyTo: msg.replyTo || null,
        };
        setMessages((prev) => [...prev, incomingMsg]);

        if (
          selectedConversation === incomingMsg.senderId ||
          selectedConversation === incomingMsg.recipientId
        ) {
          setConversationMessages((prev) => [...prev, incomingMsg]);
        }
      });

      // 🆕 handle group message updates from backend
      chatConnection.on("messageEdited", (msg) => {
        if (!msg?.groupId) return;
        setGroupMessagesByGroup((prev) => {
          const list = prev[msg.groupId] || [];
          return {
            ...prev,
            [msg.groupId]: list.map((m) =>
              m.messageId === msg.messageId ? { ...m, ...msg } : m,
            ),
          };
        });
      });

      // Handle updates (edits)
      chatConnection.on("messageUpdated", (payload) => {
        console.log("🔧 Received messageUpdated:", payload);
        if (!payload || !payload.messageId) return;
        updateMessageById(payload.messageId, {
          content: payload.content,
          isEdited: payload.isEdited || true,
          editedAt: payload.editedAt || new Date().toISOString(),
          updatedAt: payload.updatedAt || new Date().toISOString(),
        });
      });

      chatConnection.on(
        "messageReceipt",
        ({ groupId, messageId, status, from }) => {
          if (!groupId) return;
          setGroupMessagesByGroup((prev) => {
            const list = prev[groupId] || [];
            const updated = list.map((m) =>
              m.messageId === messageId
                ? {
                    ...m,
                    status,
                    deliveredTo:
                      status === "delivered"
                        ? [...(m.deliveredTo || []), from]
                        : m.deliveredTo,
                    readBy:
                      status === "read"
                        ? [...(m.readBy || []), from]
                        : m.readBy,
                  }
                : m,
            );
            return { ...prev, [groupId]: updated };
          });
        },
      );

      // Inside connectToSignalR function, after existing handlers:

      // Handle presence updates
      // Handle presence updates
      chatConnection.on("presenceUpdate", (data) => {
        console.log("👁 Presence update received:", data);
        console.log(
          "User:",
          data.userId,
          "Online:",
          data.online,
          "Last seen:",
          data.lastSeenAt,
        );

        setUserPresence((prev) => {
          const updated = {
            ...prev,
            [data.userId]: {
              online: data.online,
              lastSeenAt: data.lastSeenAt,
            },
          };
          console.log("Updated userPresence state:", updated);
          return updated;
        });
      });

      // Handle typing status
      chatConnection.on("typingStatus", (data) => {
        console.log("⌨ Typing status:", data);
        const { fromUserId, conversationId, isTyping } = data;

        if (isTyping) {
          setTypingUsers((prev) => ({
            ...prev,
            [conversationId]: {
              ...prev[conversationId],
              [fromUserId]: Date.now(),
            },
          }));
        } else {
          setTypingUsers((prev) => {
            const updated = { ...prev };
            if (updated[conversationId]) {
              delete updated[conversationId][fromUserId];
              if (Object.keys(updated[conversationId]).length === 0) {
                delete updated[conversationId];
              }
            }
            return updated;
          });
        }
      });

      await chatConnection.start();
      setConnection(chatConnection);
      setConnected(true);
      alert("✅ Connected to both chat and notification hubs!");
    } catch (err) {
      console.error("❌ Connection error:", err);
      alert("❌ Failed to connect to SignalR: " + err.message);
    }
  };

  // --------- 1:1 fetchers (unchanged) ----------
  // const fetchConversations = async (filter = activeFilter) => {
  //   try {
  //     setLoadingConversations(true);
  //     // Add filterType to the query string
  //     const res = await fetch(
  //       `http://localhost:4002/chat/conversations?page=1&limit=20&filterType=${filter}`,
  //       { headers: { Authorization: `Bearer ${jwt}` } },
  //     );
  //     const data = await res.json();
  //     if (data.success) {
  //       setConversations(data.conversations || []);
  //     }
  //   } catch (err) {
  //     console.error("❌ Fetch conversations error:", err);
  //   } finally {
  //     setLoadingConversations(false);
  //   }
  // };


  const fetchConversations = async (filter = activeFilter, search = "") => {
    try {
      setLoadingConversations(true);
      // ✅ Now includes &searchTerm so the backend can run the bcrypt check
      const res = await fetch(
        `http://localhost:4002/chat/conversations?page=1&limit=20&filterType=${filter}&searchTerm=${search}`,
        { headers: { Authorization: `Bearer ${jwt}` } },
      );
      const data = await res.json();
      
      if (data.success) {
        // If data.isLockedView is true, the child component will handle the UI switch
        setConversations(data || []); 
      }
    } catch (err) {
      console.error("❌ Fetch conversations error:", err);
    } finally {
      setLoadingConversations(false);
    }
  };

















  const fetchConversationMessages = async (otherUserId) => {
    try {
      setLoadingMessages(true);
      const res = await fetch(
        `http://localhost:4002/chat/messages?otherUserId=${otherUserId}&page=1&limit=50`,
        { headers: { Authorization: `Bearer ${jwt}` } },
      );
      const data = await res.json();
      if (data.success) {
        setConversationMessages((data.messages || []).reverse());
        setSelectedConversation(otherUserId);
      }
    } catch (err) {
      console.error("❌ Fetch messages error:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // --------- GROUP fetcher (separate from 1:1) ----------
  const fetchGroupMessages = async (groupId) => {
    if (!groupId) return;
    try {
      setLoadingGroupMessages(true);
      const res = await fetch(
        `http://localhost:4002/chat/groups/messages?groupId=${groupId}&page=1&limit=50`,
        { headers: { Authorization: `Bearer ${jwt}` } },
      );
      const data = await res.json();
      if (data.success) {
        setGroupMessagesByGroup((prev) => ({
          ...prev,
          [groupId]: (data.messages || []).reverse(),
        }));
        setSelectedGroupId(groupId);
      }
    } catch (err) {
      console.error("❌ Fetch group messages error:", err);
    } finally {
      setLoadingGroupMessages(false);
    }
  };

  // Calls
  const handleCallStateChange = (newState) => {
    setCallState(newState);
    console.log("📞 Call state changed to:", newState);

    // Auto-switch to call tab when call starts
    if (newState === "Connecting" || newState === "Ringing") {
      setActiveTab("call");
    }
    if (newState === "Disconnected") {
      setTimeout(() => setActiveTab("chat"), 2000);
    }
  };

  // --- Component Props ---
  const chatPanelProps = {
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
    setMessages, // 1:1 only
    setConversationMessages, // 1:1 only
    selectedConversation,
    replyingTo,
    setReplyingTo,
    conversations, // ADD THIS
  };

  const conversationListProps = {
    conversations,
    loadingConversations,
    selectedConversation,
    fetchConversations,
    activeFilter,
    setActiveFilter,
    fetchConversationMessages,
    userId,
    userPresence,
    setUserPresence,
    typingUsers,
    jwt,
  };
  const liveMessagesProps = {
    // ⛔ remains purely 1:1
    messages,
    conversationMessages,
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
    updateMessageById,
    setMessages,
    setConversationMessages,
    messagesEndRef,
    replyingTo,
    setReplyingTo,
  };

  const bulkActionsProps = {
    selectedMessageIds,
    setSelectedMessageIds,
    jwt,
    userId,
    setMessages, // 1:1 only
    setConversationMessages, // 1:1 only
    updateMessageById,
  };

  // Optional helper to append a group message locally (e.g., after sending)
  const appendGroupMessageLocal = (groupId, msg) => {
    if (!groupId || !msg) return;
    setGroupMessagesByGroup((prev) => ({
      ...prev,
      [groupId]: [...(prev[groupId] || []), msg],
    }));
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-6xl mx-auto bg-white shadow p-6 rounded">
          <h1 className="text-2xl font-bold mb-4">
            🔗 Chat &amp; Call Tester{" "}
            {callState !== "None" && `(📞 ${callState})`}
          </h1>

          {!authData && !connected ? (
            <AuthForm
              onAuthSuccess={(data) => {
                setAuthData(data);
                setJwt(data.token);
                setUserId(data.user.userId);
              }}
            />
          ) : !connected ? (
            <ConnectionForm
              jwt={jwt}
              setJwt={setJwt}
              connectToSignalR={connectToSignalR}
              authData={authData}
            />
          ) : (
            <>
              {/* Tabs */}
              <div className="flex space-x-4 mb-6 border-b">
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`pb-2 px-4 font-medium ${
                    activeTab === "chat"
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  💬 Chat
                </button>
                <button
                  onClick={() => setActiveTab("group")}
                  className={`pb-2 px-4 font-medium ${
                    activeTab === "group"
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  👥 Group Chat
                </button>
                <button
                  onClick={() => setActiveTab("call")}
                  className={`pb-2 px-4 font-medium ${
                    activeTab === "call"
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  📞 Calls {callState !== "None" && `(${callState})`}
                </button>
                <button
                  onClick={() => setActiveTab("notification")}
                  className={`pb-2 px-4 font-medium ${
                    activeTab === "notification"
                      ? "border-b-2 border-blue-500 text-blue-600"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  🔔 Notification
                </button>
              </div>

              {/* Panels */}
              {activeTab === "chat" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 space-y-6">
                    <ChatPanel {...chatPanelProps} />
                    <ConversationList {...conversationListProps} />
                    <BulkActions {...bulkActionsProps} />
                  </div>
                  <div className="lg:col-span-2">
                    {/* ⛔ LiveMessages receives 1:1 only, untouched */}
                    <LiveMessages {...liveMessagesProps} />
                  </div>
                </div>
              )}

              {activeTab === "group" && (
                <div className="h-[700px]">
                  <GroupChatTest
                    jwt={jwt}
                    userId={userId}
                    // ✅ Pure group data only
                    selectedGroupId={selectedGroupId}
                    setSelectedGroupId={setSelectedGroupId}
                    groupMessages={
                      selectedGroupId
                        ? groupMessagesByGroup[selectedGroupId] || []
                        : []
                    }
                    setGroupMessagesForSelected={(updater) => {
                      if (!selectedGroupId) return;
                      setGroupMessagesByGroup((prev) => {
                        const nextList =
                          typeof updater === "function"
                            ? updater(prev[selectedGroupId] || [])
                            : updater;
                        return { ...prev, [selectedGroupId]: nextList || [] };
                      });
                    }}
                    fetchGroupMessages={fetchGroupMessages}
                    loadingGroupMessages={loadingGroupMessages}
                    appendGroupMessageLocal={appendGroupMessageLocal}
                    updateGroupMessageById={updateGroupMessageById}
                  />
                </div>
              )}

              {activeTab === "call" && (
                <CallPanel
                  jwt={jwt}
                  userId={userId}
                  onCallStateChange={handleCallStateChange}
                />
              )}

              {activeTab === "notification" && (
                <NotificationPanel
                  jwt={jwt}
                  userId={userId}
                  receivedNotifications={receivedNotifications}
                  onClearReceived={() => setReceivedNotifications([])} // ✅ fixed prop name
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* ✅ Properly placed routes inside Router */}
      {/* <Routes>
  <Route path="/groups/invite/:token/join" element={<JoinGroup jwt={jwt} />} />
</Routes> */}
    </Router>
  );
}
