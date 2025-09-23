import { useEffect, useState, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import AuthForm from "./components/AuthForm";
import ConnectionForm from "./components/ConnectionForm";
import ChatPanel from "./components/ChatPanel";
import ConversationList from "./components/ConversationList";
import LiveMessages from "./components/LiveMessages";
import BulkActions from "./components/BulkActions";
import CallPanel from "./components/CallPanel"; // ADD: Import CallPanel

import "./App.css";
import NotificationPanel from "./components/NotificationPanel";

export default function App() {
  const [jwt, setJwt] = useState("");
  const [userId, setUserId] = useState("");
  const [authData, setAuthData] = useState(null);
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


  const [receivedNotifications, setReceivedNotifications] = useState([]);

  // Media states
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);

  // Edit / selection states
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);

  // ADD: Call states
  const [callState, setCallState] = useState('None');
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'call'

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
        updateMessageById(payload.messageId, {
          content: "",
          attachments: [],
          isDeletedForEveryone: true,
          deletedForEveryoneAt: payload.deletedAt || new Date().toISOString(),
          deletedForEveryoneBy: payload.deletedBy,
        });
      });



      // Handle incoming notifications
      newConnection.on("newNotification", (notification) => {
        console.log("🔔 Received notification:", notification);
        setReceivedNotifications(prev => [notification, ...prev]);
        // Show browser notification if supported
        if (Notification.permission === "granted") {
          new Notification(notification.title, {
            body: notification.body,
            icon: "/favicon.ico"
          });
        }
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

  // ADD: Call state change handler
  const handleCallStateChange = (newState) => {
    setCallState(newState);
    console.log('📞 Call state changed to:', newState);

    // Auto-switch to call tab when call starts
    if (newState === 'Connecting' || newState === 'Ringing') {
      setActiveTab('call');
    }

    // Switch back to chat when call ends
    if (newState === 'None' || newState === 'Disconnected') {
      // Optionally switch back to chat tab after a delay
      setTimeout(() => {
        if (callState === 'Disconnected') {
          setActiveTab('chat');
        }
      }, 2000);
    }
  };

  // Pass all necessary props and handlers to components
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
    setMessages,
    setConversationMessages,
    selectedConversation,
    replyingTo,
    setReplyingTo,
  };

  const conversationListProps = {
    conversations,
    showConversations,
    loadingConversations,
    selectedConversation,
    fetchConversations,
    fetchConversationMessages,
    userId,
  };

  const liveMessagesProps = {
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
    setMessages,
    setConversationMessages,
    updateMessageById,
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto bg-white shadow p-6 rounded">
        <h1 className="text-2xl font-bold mb-4">
          🔗 Chat & Call Tester {callState !== 'None' && `(📞 ${callState})`}
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
            {/* ADD: Tab Navigation */}
            <div className="flex space-x-4 mb-6 border-b">
              <button
                onClick={() => setActiveTab('chat')}
                className={`pb-2 px-4 font-medium ${activeTab === 'chat'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                💬 Chat
              </button>
              <button
                onClick={() => setActiveTab('call')}
                className={`pb-2 px-4 font-medium ${activeTab === 'call'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                📞 Calls {callState !== 'None' && `(${callState})`}
              </button>

              <button
                onClick={() => setActiveTab("notification")}
                className={`pb-2 px-4 font-medium ${activeTab === "notification"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
                  }`}
              >
                🔔 Notification
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Panel */}
              <div className="lg:col-span-1 space-y-6">
                {activeTab === "chat" && (
                  <>
                    <ChatPanel {...chatPanelProps} />
                    <ConversationList {...conversationListProps} />
                    <BulkActions {...bulkActionsProps} />
                  </>
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
                    onClearReceived={() => setReceivedNotifications([])}
                  />
                )}
              </div>

              {/* Right Panel */}
              {activeTab === "chat" && (
                <div className="lg:col-span-2">
                  <LiveMessages {...liveMessagesProps} />
                </div>
              )}

              {activeTab === "call" && (
                <div className="lg:col-span-2">
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <h3 className="text-lg font-semibold mb-4">
                      📞 Call Interface
                    </h3>

                    {callState === "None" && (
                      <p className="text-gray-600">
                        Use the call panel on the left to start a call
                      </p>
                    )}

                    {callState === "Connecting" && (
                      <div className="space-y-2">
                        <div className="animate-pulse text-blue-600 text-xl">
                          📞
                        </div>
                        <p>Connecting call...</p>
                      </div>
                    )}

                    {callState === "Ringing" && (
                      <div className="space-y-2">
                        <div className="animate-bounce text-green-600 text-xl">
                          📞
                        </div>
                        <p>Incoming call ringing...</p>
                      </div>
                    )}

                    {callState === "Connected" && (
                      <div className="space-y-4">
                        <div className="text-green-600 text-xl">✅</div>
                        <p className="text-green-700 font-semibold">
                          Call Connected!
                        </p>
                        <div className="text-sm text-gray-600">
                          Use the controls in the left panel to manage your call
                        </div>
                      </div>
                    )}

                    {callState === "Disconnected" && (
                      <div className="space-y-2">
                        <div className="text-red-600 text-xl">📞</div>
                        <p className="text-red-700">Call ended</p>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {activeTab === "notification" && (
                <div className="lg:col-span-2">
                  <div className="bg-white border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">📥 Received Notifications</h3>
                      {receivedNotifications.length > 0 && (
                        <button
                          onClick={() => setReceivedNotifications([])}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {receivedNotifications.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">🔔</div>
                        <p className="text-gray-500">No notifications received yet.</p>
                        <p className="text-sm text-gray-400 mt-2">
                          Notifications sent to your user ID will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {receivedNotifications.map((notification, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="font-medium text-gray-900">
                                    {notification.title}
                                  </span>
                                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                    RECEIVED
                                  </span>
                                </div>
                                <p className="text-gray-700 mb-2">{notification.body}</p>
                                <div className="text-xs text-gray-500">
                                  {new Date(notification.timestamp).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </>
        )}
      </div>
    </div>
  );
}