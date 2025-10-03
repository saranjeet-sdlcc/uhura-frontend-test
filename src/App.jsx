
// import { useEffect, useState, useRef } from "react";
// import * as signalR from "@microsoft/signalr";
// import AuthForm from "./components/AuthForm";
// import ConnectionForm from "./components/ConnectionForm";
// import ChatPanel from "./components/ChatPanel";
// import ConversationList from "./components/ConversationList";
// import LiveMessages from "./components/LiveMessages";
// import BulkActions from "./components/BulkActions";
// import CallPanel from "./components/CallPanel";
// import NotificationPanel from "./components/NotificationPanel";
// import { fetchFcmToken } from "./components/firebase";
// import "./App.css";

// export default function App() {
//   const [jwt, setJwt] = useState("");
//   const [userId, setUserId] = useState("");
//   const [authData, setAuthData] = useState(null);

//   // Chat state
//   const [recipientId, setRecipientId] = useState("");
//   const [message, setMessage] = useState("");
//   const [connection, setConnection] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [conversations, setConversations] = useState([]);
//   const [selectedConversation, setSelectedConversation] = useState(null);
//   const [conversationMessages, setConversationMessages] = useState([]);
//   const [loadingConversations, setLoadingConversations] = useState(false);
//   const [loadingMessages, setLoadingMessages] = useState(false);

//   // Notification state
//   const [notificationConnection, setNotificationConnection] = useState(null);
//   const [receivedNotifications, setReceivedNotifications] = useState([]);

//   // Flags
//   const [connected, setConnected] = useState(false);

//   // UI states
//   const [selectedFiles, setSelectedFiles] = useState([]);
//   const [uploadingMedia, setUploadingMedia] = useState(false);
//   const [showFilePicker, setShowFilePicker] = useState(false);
//   const [editingMessageId, setEditingMessageId] = useState(null);
//   const [editingText, setEditingText] = useState("");
//   const [selectedMessageIds, setSelectedMessageIds] = useState([]);
//   const [replyingTo, setReplyingTo] = useState(null);

//   // Call state
//   const [callState, setCallState] = useState("None");
//   const [activeTab, setActiveTab] = useState("chat");

//   const messagesEndRef = useRef(null);
//   const fileInputRef = useRef(null);

//   // 🔔 Register FCM Token when logged in
//   useEffect(() => {
//     if (!jwt || !userId) return;

//     fetchFcmToken().then((token) => {
//       if (token) {
//         console.log("✅ Got FCM Token:", token);

//         fetch("http://localhost:4004/device-tokens/register", {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${jwt}`,
//           },
//           body: JSON.stringify({
//             userId,
//             token,
//             platform: "web",
//           }),
//         })
//           .then((res) => res.json())
//           .then((data) =>
//             console.log("📱 Device token registered:", data)
//           )
//           .catch((err) =>
//             console.error("❌ Device token registration error:", err)
//           );
//       }
//     });
//   }, [jwt, userId]);

//   // Scroll to bottom on new messages
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   const postReceipt = async (endpoint, body) => {
//     try {
//       const res = await fetch(`http://localhost:4002/chat/${endpoint}`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${jwt}`,
//         },
//         body: JSON.stringify(body),
//       });
//       const data = await res.json();
//       if (!res.ok) {
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
//       prev.map((m) =>
//         m.messageId === messageId ? { ...m, ...patch } : m
//       )
//     );
//     setConversationMessages((prev) =>
//       prev.map((m) =>
//         m.messageId === messageId ? { ...m, ...patch } : m
//       )
//     );
//   };

//   // ✅ SignalR Connect Function (chat + notification hubs)
//   const connectToSignalR = async () => {
//     if (!jwt || !userId) return;

//     try {
//       // --- Chat hub ---
//       const chatRes = await fetch("http://localhost:4002/negotiate", {
//         method: "GET",
//         headers: { Authorization: `Bearer ${jwt}` },
//       });
//       if (!chatRes.ok)
//         throw new Error(`Chat negotiate failed: ${chatRes.status}`);
//       const { url: chatUrl, accessToken: chatAccessToken } =
//         await chatRes.json();

//       const chatConnection = new signalR.HubConnectionBuilder()
//         .withUrl(chatUrl, { accessTokenFactory: () => chatAccessToken })
//         .withAutomaticReconnect()
//         .configureLogging(signalR.LogLevel.Information)
//         .build();

//       chatConnection.on("newMessage", (msg) => {
//         console.log("📥 Received newMessage:", msg);
//         setMessages((prev) => [...prev, msg]);
//       });

//       await chatConnection.start();
//       setConnection(chatConnection);
//       console.log("✅ Connected to chat hub!");

//       // --- Notification hub ---
//       const notifRes = await fetch("http://localhost:4004/negotiate", {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${jwt}`,
//           "Content-Type": "application/json",
//         },
//       });
//       if (!notifRes.ok)
//         throw new Error(
//           `Notification negotiate failed: ${notifRes.status}`
//         );
//       const { url: notifUrl, accessToken: notifAccessToken } =
//         await notifRes.json();

//       const notifConnection = new signalR.HubConnectionBuilder()
//         .withUrl(notifUrl, {
//           accessTokenFactory: () => notifAccessToken,
//           skipNegotiation: true,
//           transport: signalR.HttpTransportType.WebSockets,
//         })
//         .withAutomaticReconnect([0, 2000, 5000, 10000])
//         .configureLogging(signalR.LogLevel.Information)
//         .build();

//       notifConnection.on("newNotification", (notification) => {
//         console.log("🔔 Received notification:", notification);
//         setReceivedNotifications((prev) => [notification, ...prev]);
//         if (Notification.permission === "granted") {
//           new Notification(notification.title, {
//             body: notification.body,
//             icon: "/favicon.ico",
//           });
//         }
//       });

//       await notifConnection.start();
//       setNotificationConnection(notifConnection);
//       console.log("✅ Connected to notification hub!");

//       setConnected(true);
//       alert("✅ Connected to both chat and notification hubs!");
//     } catch (err) {
//       console.error("❌ Connection error:", err);
//       alert("❌ Failed to connect to SignalR: " + err.message);
//     }
//   };

//   const fetchConversations = async () => {
//     try {
//       setLoadingConversations(true);
//       const res = await fetch(
//         `http://localhost:4002/chat/conversations?page=1&limit=20`,
//         { headers: { Authorization: `Bearer ${jwt}` } }
//       );
//       const data = await res.json();
//       if (data.success) {
//         setConversations(data.conversations || []);
//       }
//     } catch (err) {
//       console.error("❌ Fetch conversations error:", err);
//     } finally {
//       setLoadingConversations(false);
//     }
//   };

//   const fetchConversationMessages = async (otherUserId) => {
//     try {
//       setLoadingMessages(true);
//       const res = await fetch(
//         `http://localhost:4002/chat/messages?otherUserId=${otherUserId}&page=1&limit=50`,
//         { headers: { Authorization: `Bearer ${jwt}` } }
//       );
//       const data = await res.json();
//       if (data.success) {
//         setConversationMessages((data.messages || []).reverse());
//         setSelectedConversation(otherUserId);
//       }
//     } catch (err) {
//       console.error("❌ Fetch messages error:", err);
//     } finally {
//       setLoadingMessages(false);
//     }
//   };

//   const handleCallStateChange = (newState) => {
//     setCallState(newState);
//     if (newState === "Connecting" || newState === "Ringing") {
//       setActiveTab("call");
//     }
//     if (newState === "Disconnected") {
//       setTimeout(() => setActiveTab("chat"), 2000);
//     }
//   };

//   // --- Component Props ---
//   const chatPanelProps = {
//     userId,
//     setUserId,
//     recipientId,
//     setRecipientId,
//     message,
//     setMessage,
//     selectedFiles,
//     setSelectedFiles,
//     uploadingMedia,
//     setUploadingMedia,
//     showFilePicker,
//     setShowFilePicker,
//     fileInputRef,
//     jwt,
//     setMessages,
//     setConversationMessages,
//     selectedConversation,
//     replyingTo,
//     setReplyingTo,
//   };

//   const conversationListProps = {
//     conversations,
//     loadingConversations,
//     selectedConversation,
//     fetchConversations,
//     fetchConversationMessages,
//     userId,
//   };

//   const liveMessagesProps = {
//     messages,
//     conversationMessages,
//     selectedConversation,
//     loadingMessages,
//     userId,
//     jwt,
//     editingMessageId,
//     setEditingMessageId,
//     editingText,
//     setEditingText,
//     selectedMessageIds,
//     setSelectedMessageIds,
//     updateMessageById,
//     setMessages,
//     setConversationMessages,
//     messagesEndRef,
//     replyingTo,
//     setReplyingTo,
//   };

//   const bulkActionsProps = {
//     selectedMessageIds,
//     setSelectedMessageIds,
//     jwt,
//     userId,
//     setMessages,
//     setConversationMessages,
//     updateMessageById,
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 p-4">
//       <div className="max-w-6xl mx-auto bg-white shadow p-6 rounded">
//         <h1 className="text-2xl font-bold mb-4">
//           🔗 Chat & Call Tester{" "}
//           {callState !== "None" && `(📞 ${callState})`}
//         </h1>

//         {!authData && !connected ? (
//           <AuthForm
//             onAuthSuccess={(data) => {
//               setAuthData(data);
//               setJwt(data.token);
//               setUserId(data.user.userId);
//             }}
//           />
//         ) : !connected ? (
//           <ConnectionForm
//             jwt={jwt}
//             setJwt={setJwt}
//             connectToSignalR={connectToSignalR}
//             authData={authData}
//           />
//         ) : (
//           <>
//             {/* Tabs */}
//             <div className="flex space-x-4 mb-6 border-b">
//               <button
//                 onClick={() => setActiveTab("chat")}
//                 className={`pb-2 px-4 font-medium ${
//                   activeTab === "chat"
//                     ? "border-b-2 border-blue-500 text-blue-600"
//                     : "text-gray-600 hover:text-gray-800"
//                 }`}
//               >
//                 💬 Chat
//               </button>
//               <button
//                 onClick={() => setActiveTab("call")}
//                 className={`pb-2 px-4 font-medium ${
//                   activeTab === "call"
//                     ? "border-b-2 border-blue-500 text-blue-600"
//                     : "text-gray-600 hover:text-gray-800"
//                 }`}
//               >
//                 📞 Calls {callState !== "None" && `(${callState})`}
//               </button>
//               <button
//                 onClick={() => setActiveTab("notification")}
//                 className={`pb-2 px-4 font-medium ${
//                   activeTab === "notification"
//                     ? "border-b-2 border-blue-500 text-blue-600"
//                     : "text-gray-600 hover:text-gray-800"
//                 }`}
//               >
//                 🔔 Notification
//               </button>
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//               {/* Left Panel */}
//               <div className="lg:col-span-1 space-y-6">
//                 {activeTab === "chat" && (
//                   <>
//                     <ChatPanel {...chatPanelProps} />
//                     <ConversationList {...conversationListProps} />
//                     <BulkActions {...bulkActionsProps} />
//                   </>
//                 )}

//                 {activeTab === "call" && (
//                   <CallPanel
//                     jwt={jwt}
//                     userId={userId}
//                     onCallStateChange={handleCallStateChange}
//                   />
//                 )}

//                 {activeTab === "notification" && (
//                   <NotificationPanel
//                     jwt={jwt}
//                     userId={userId}
//                     receivedNotifications={receivedNotifications}
//                     onClearReceived={() => setReceivedNotifications([])}
//                   />
//                 )}
//               </div>

//               {/* Right Panel */}
//               {activeTab === "chat" && (
//                 <div className="lg:col-span-2">
//                   <LiveMessages {...liveMessagesProps} />
//                 </div>
//               )}

//               {activeTab === "notification" && (
//                 <div className="lg:col-span-2">
//                   <div className="bg-white border rounded-lg p-6">
//                     <h3 className="font-semibold text-lg mb-2">
//                       📥 Received Notifications
//                     </h3>
//                     {receivedNotifications.length === 0 ? (
//                       <p className="text-gray-500">
//                         No notifications received yet.
//                       </p>
//                     ) : (
//                       <ul className="space-y-2">
//                         {receivedNotifications.map((n, i) => (
//                           <li
//                             key={i}
//                             className="border border-gray-200 rounded p-3 bg-blue-50"
//                           >
//                             <strong>{n.title}</strong>
//                             <p>{n.body}</p>
//                           </li>
//                         ))}
//                       </ul>
//                     )}
//                   </div>
//                 </div>
//               )}
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }




// import { useEffect, useState, useRef } from "react";
// import * as signalR from "@microsoft/signalr";
// import AuthForm from "./components/AuthForm";
// import ConnectionForm from "./components/ConnectionForm";
// import ChatPanel from "./components/ChatPanel";
// import ConversationList from "./components/ConversationList";
// import LiveMessages from "./components/LiveMessages";
// import BulkActions from "./components/BulkActions";
// import CallPanel from "./components/CallPanel";
// import NotificationPanel from "./components/NotificationPanel";
// import { fetchFcmToken } from "./components/firebase";
// import "./App.css";
// import GroupChatTest from "./components/GroupChat";  // ✅ group chat tester

// export default function App() {
//   const [jwt, setJwt] = useState("");
//   const [userId, setUserId] = useState("");
//   const [authData, setAuthData] = useState(null);

//   // Chat state
//   const [recipientId, setRecipientId] = useState("");
//   const [message, setMessage] = useState("");
//   const [connection, setConnection] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [conversations, setConversations] = useState([]);
//   const [selectedConversation, setSelectedConversation] = useState(null);
//   const [conversationMessages, setConversationMessages] = useState([]);
//   const [loadingConversations, setLoadingConversations] = useState(false);
//   const [loadingMessages, setLoadingMessages] = useState(false);

//   // Notification state
//   const [notificationConnection, setNotificationConnection] = useState(null);
//   const [receivedNotifications, setReceivedNotifications] = useState([]);

//   // Flags
//   const [connected, setConnected] = useState(false);

//   // UI states
//   const [selectedFiles, setSelectedFiles] = useState([]);
//   const [uploadingMedia, setUploadingMedia] = useState(false);
//   const [showFilePicker, setShowFilePicker] = useState(false);
//   const [editingMessageId, setEditingMessageId] = useState(null);
//   const [editingText, setEditingText] = useState("");
//   const [selectedMessageIds, setSelectedMessageIds] = useState([]);
//   const [replyingTo, setReplyingTo] = useState(null);

//   // Call state
//   const [callState, setCallState] = useState("None");
//   const [activeTab, setActiveTab] = useState("chat"); // now includes "group"

//   const messagesEndRef = useRef(null);
//   const fileInputRef = useRef(null);

//   // 🔔 Register FCM Token when logged in
//   useEffect(() => {
//     if (!jwt || !userId) return;

//     fetchFcmToken().then((token) => {
//       if (token) {
//         console.log("✅ Got FCM Token:", token);

//         fetch("http://localhost:4004/device-tokens/register", {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${jwt}`,
//           },
//           body: JSON.stringify({
//             userId,
//             token,
//             platform: "web",
//           }),
//         })
//           .then((res) => res.json())
//           .then((data) =>
//             console.log("📱 Device token registered:", data)
//           )
//           .catch((err) =>
//             console.error("❌ Device token registration error:", err)
//           );
//       }
//     });
//   }, [jwt, userId]);

//   // Scroll to bottom on new messages
//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   const postReceipt = async (endpoint, body) => {
//     try {
//       const res = await fetch(`http://localhost:4002/chat/${endpoint}`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${jwt}`,
//         },
//         body: JSON.stringify(body),
//       });
//       const data = await res.json();
//       if (!res.ok) {
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
//       prev.map((m) =>
//         m.messageId === messageId ? { ...m, ...patch } : m
//       )
//     );
//     setConversationMessages((prev) =>
//       prev.map((m) =>
//         m.messageId === messageId ? { ...m, ...patch } : m
//       )
//     );
//   };

//   // ✅ SignalR Connect Function (chat + notification hubs)
//   const connectToSignalR = async () => {
//     if (!jwt || !userId) return;

//     try {
//       // --- Chat hub ---
//       const chatRes = await fetch("http://localhost:4002/negotiate", {
//         method: "GET",
//         headers: { Authorization: `Bearer ${jwt}` },
//       });
//       if (!chatRes.ok)
//         throw new Error(`Chat negotiate failed: ${chatRes.status}`);
//       const { url: chatUrl, accessToken: chatAccessToken } =
//         await chatRes.json();

//       const chatConnection = new signalR.HubConnectionBuilder()
//         .withUrl(chatUrl, { accessTokenFactory: () => chatAccessToken })
//         .withAutomaticReconnect()
//         .configureLogging(signalR.LogLevel.Information)
//         .build();

//       chatConnection.on("newMessage", (msg) => {
//   console.log("📥 Received newMessage:", msg);

//   if (!msg.isGroup) {
//     // ✅ only handle one-to-one here
//     setMessages((prev) => [...prev, msg]);
//   }
//   // group messages are handled inside GroupChat.jsx only
// });


//       await chatConnection.start();
//       setConnection(chatConnection);
//       console.log("✅ Connected to chat hub!");

//       // --- Notification hub ---
//       const notifRes = await fetch("http://localhost:4004/negotiate", {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${jwt}`,
//           "Content-Type": "application/json",
//         },
//       });
//       if (!notifRes.ok)
//         throw new Error(
//           `Notification negotiate failed: ${notifRes.status}`
//         );
//       const { url: notifUrl, accessToken: notifAccessToken } =
//         await notifRes.json();

//       const notifConnection = new signalR.HubConnectionBuilder()
//         .withUrl(notifUrl, {
//           accessTokenFactory: () => notifAccessToken,
//           skipNegotiation: true,
//           transport: signalR.HttpTransportType.WebSockets,
//         })
//         .withAutomaticReconnect([0, 2000, 5000, 10000])
//         .configureLogging(signalR.LogLevel.Information)
//         .build();

//       notifConnection.on("newNotification", (notification) => {
//         console.log("🔔 Received notification:", notification);
//         setReceivedNotifications((prev) => [notification, ...prev]);
//         if (Notification.permission === "granted") {
//           new Notification(notification.title, {
//             body: notification.body,
//             icon: "/favicon.ico",
//           });
//         }
//       });

//       await notifConnection.start();
//       setNotificationConnection(notifConnection);
//       console.log("✅ Connected to notification hub!");

//       setConnected(true);
//       alert("✅ Connected to both chat and notification hubs!");
//     } catch (err) {
//       console.error("❌ Connection error:", err);
//       alert("❌ Failed to connect to SignalR: " + err.message);
//     }
//   };

//   const fetchConversations = async () => {
//     try {
//       setLoadingConversations(true);
//       const res = await fetch(
//         `http://localhost:4002/chat/conversations?page=1&limit=20`,
//         { headers: { Authorization: `Bearer ${jwt}` } }
//       );
//       const data = await res.json();
//       if (data.success) {
//         setConversations(data.conversations || []);
//       }
//     } catch (err) {
//       console.error("❌ Fetch conversations error:", err);
//     } finally {
//       setLoadingConversations(false);
//     }
//   };

//   const fetchConversationMessages = async (otherUserId) => {
//     try {
//       setLoadingMessages(true);
//       const res = await fetch(
//         `http://localhost:4002/chat/messages?otherUserId=${otherUserId}&page=1&limit=50`,
//         { headers: { Authorization: `Bearer ${jwt}` } }
//       );
//       const data = await res.json();
//       if (data.success) {
//         setConversationMessages((data.messages || []).reverse());
//         setSelectedConversation(otherUserId);
//       }
//     } catch (err) {
//       console.error("❌ Fetch messages error:", err);
//     } finally {
//       setLoadingMessages(false);
//     }
//   };

//   const handleCallStateChange = (newState) => {
//     setCallState(newState);
//     if (newState === "Connecting" || newState === "Ringing") {
//       setActiveTab("call");
//     }
//     if (newState === "Disconnected") {
//       setTimeout(() => setActiveTab("chat"), 2000);
//     }
//   };

//   // --- Component Props ---
//   const chatPanelProps = {
//     userId,
//     setUserId,
//     recipientId,
//     setRecipientId,
//     message,
//     setMessage,
//     selectedFiles,
//     setSelectedFiles,
//     uploadingMedia,
//     setUploadingMedia,
//     showFilePicker,
//     setShowFilePicker,
//     fileInputRef,
//     jwt,
//     setMessages,
//     setConversationMessages,
//     selectedConversation,
//     replyingTo,
//     setReplyingTo,
//   };

//   const conversationListProps = {
//     conversations,
//     loadingConversations,
//     selectedConversation,
//     fetchConversations,
//     fetchConversationMessages,
//     userId,
//   };

//   const liveMessagesProps = {
//     messages,
//     conversationMessages,
//     selectedConversation,
//     loadingMessages,
//     userId,
//     jwt,
//     editingMessageId,
//     setEditingMessageId,
//     editingText,
//     setEditingText,
//     selectedMessageIds,
//     setSelectedMessageIds,
//     updateMessageById,
//     setMessages,
//     setConversationMessages,
//     messagesEndRef,
//     replyingTo,
//     setReplyingTo,
//   };

//   const bulkActionsProps = {
//     selectedMessageIds,
//     setSelectedMessageIds,
//     jwt,
//     userId,
//     setMessages,
//     setConversationMessages,
//     updateMessageById,
//   };

//   return (
//     <div className="min-h-screen bg-gray-100 p-4">
//       <div className="max-w-6xl mx-auto bg-white shadow p-6 rounded">
//         <h1 className="text-2xl font-bold mb-4">
//           🔗 Chat & Call Tester{" "}
//           {callState !== "None" && `(📞 ${callState})`}
//         </h1>

//         {!authData && !connected ? (
//           <AuthForm
//             onAuthSuccess={(data) => {
//               setAuthData(data);
//               setJwt(data.token);
//               setUserId(data.user.userId);
//             }}
//           />
//         ) : !connected ? (
//           <ConnectionForm
//             jwt={jwt}
//             setJwt={setJwt}
//             connectToSignalR={connectToSignalR}
//             authData={authData}
//           />
//         ) : (
//           <>
//             {/* Tabs */}
//             <div className="flex space-x-4 mb-6 border-b">
//               <button
//                 onClick={() => setActiveTab("chat")}
//                 className={`pb-2 px-4 font-medium ${activeTab === "chat"
//                     ? "border-b-2 border-blue-500 text-blue-600"
//                     : "text-gray-600 hover:text-gray-800"
//                   }`}
//               >
//                 💬 Chat
//               </button>
//               <button
//                 onClick={() => setActiveTab("group")}
//                 className={`pb-2 px-4 font-medium ${activeTab === "group"
//                     ? "border-b-2 border-blue-500 text-blue-600"
//                     : "text-gray-600 hover:text-gray-800"
//                   }`}
//               >
//                 👥 Group Chat
//               </button>
//               <button
//                 onClick={() => setActiveTab("call")}
//                 className={`pb-2 px-4 font-medium ${activeTab === "call"
//                     ? "border-b-2 border-blue-500 text-blue-600"
//                     : "text-gray-600 hover:text-gray-800"
//                   }`}
//               >
//                 📞 Calls {callState !== "None" && `(${callState})`}
//               </button>
//               <button
//                 onClick={() => setActiveTab("notification")}
//                 className={`pb-2 px-4 font-medium ${activeTab === "notification"
//                     ? "border-b-2 border-blue-500 text-blue-600"
//                     : "text-gray-600 hover:text-gray-800"
//                   }`}
//               >
//                 🔔 Notification
//               </button>

//             </div>

//             {/* Panels */}
//             {activeTab === "chat" && (
//               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//                 <div className="lg:col-span-1 space-y-6">
//                   <ChatPanel {...chatPanelProps} />
//                   <ConversationList {...conversationListProps} />
//                   <BulkActions {...bulkActionsProps} />
//                 </div>
//                 <div className="lg:col-span-2">
//                   <LiveMessages {...liveMessagesProps} />
//                 </div>
//               </div>
//             )}

//             {activeTab === "group" && (
//               <div className="h-[700px]">
//                 <GroupChatTest jwt={jwt} userId={userId} />
//               </div>
//             )}

//             {activeTab === "call" && (
//               <CallPanel
//                 jwt={jwt}
//                 userId={userId}
//                 onCallStateChange={handleCallStateChange}
//               />
//             )}

//             {activeTab === "notification" && (
//               <NotificationPanel
//                 jwt={jwt}
//                 userId={userId}
//                 receivedNotifications={receivedNotifications}
//                 onClearReceived={() => setReceivedNotifications([])}
//               />
//             )}

//           </>
//         )}
//       </div>
//     </div>
//   );
// }


import { useEffect, useState, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import AuthForm from "./components/AuthForm";
import ConnectionForm from "./components/ConnectionForm";
import ChatPanel from "./components/ChatPanel";
import ConversationList from "./components/ConversationList";
import LiveMessages from "./components/LiveMessages";
import BulkActions from "./components/BulkActions";
import CallPanel from "./components/CallPanel";
import NotificationPanel from "./components/NotificationPanel";
import { fetchFcmToken } from "./components/firebase";
import "./App.css";
import GroupChatTest from "./components/GroupChat"; // ✅ group chat tester

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

        fetch("http://localhost:4004/device-tokens/register", {
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
            console.error("❌ Device token registration error:", err)
          );
      }
    });
  }, [jwt, userId]);

  // Scroll to bottom on new 1:1 messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    // 1:1 only
    setMessages((prev) =>
      prev.map((m) => (m.messageId === messageId ? { ...m, ...patch } : m))
    );
    setConversationMessages((prev) =>
      prev.map((m) => (m.messageId === messageId ? { ...m, ...patch } : m))
    );
  };

  // Optional helper if you later want to edit group messages in-place
  const updateGroupMessageById = (groupId, messageId, patch) => {
    setGroupMessagesByGroup((prev) => {
      const list = prev[groupId] || [];
      const updated = list.map((m) =>
        m.messageId === messageId ? { ...m, ...patch } : m
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
      if (!chatRes.ok) throw new Error(`Chat negotiate failed: ${chatRes.status}`);
      const { url: chatUrl, accessToken: chatAccessToken } = await chatRes.json();

      const chatConnection = new signalR.HubConnectionBuilder()
        .withUrl(chatUrl, { accessTokenFactory: () => chatAccessToken })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Single entry point for server "newMessage"
      chatConnection.on("newMessage", (msg) => {
        console.log("📥 Received newMessage:", msg);

        // 🚫 Never allow group messages into 1:1 state
        if (msg?.isGroup && msg?.groupId) {
          setGroupMessagesByGroup((prev) => ({
            ...prev,
            [msg.groupId]: [...(prev[msg.groupId] || []), msg],
          }));
          return; // stop here to avoid touching 1:1
        }

        // ✅ 1:1 messages only
        if (!msg?.isGroup) {
          setMessages((prev) => [...prev, msg]);
        }
      });

      // (Optional) If your backend emits a dedicated event for groups:
      // chatConnection.on("newGroupMessage", (msg) => {
      //   if (msg?.groupId) {
      //     setGroupMessagesByGroup((prev) => ({
      //       ...prev,
      //       [msg.groupId]: [...(prev[msg.groupId] || []), msg],
      //     }));
      //   }
      // });

      await chatConnection.start();
      setConnection(chatConnection);
      console.log("✅ Connected to chat hub!");

      // --- Notification hub ---
      const notifRes = await fetch("http://localhost:4004/negotiate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
      });
      if (!notifRes.ok)
        throw new Error(`Notification negotiate failed: ${notifRes.status}`);
      const { url: notifUrl, accessToken: notifAccessToken } = await notifRes.json();

      const notifConnection = new signalR.HubConnectionBuilder()
        .withUrl(notifUrl, {
          accessTokenFactory: () => notifAccessToken,
          skipNegotiation: true,
          transport: signalR.HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

      notifConnection.on("newNotification", (notification) => {
        console.log("🔔 Received notification:", notification);
        setReceivedNotifications((prev) => [notification, ...prev]);
        if (Notification.permission === "granted") {
          new Notification(notification.title, {
            body: notification.body,
            icon: "/favicon.ico",
          });
        }
      });

      await notifConnection.start();
      setNotificationConnection(notifConnection);
      console.log("✅ Connected to notification hub!");

      setConnected(true);
      alert("✅ Connected to both chat and notification hubs!");
    } catch (err) {
      console.error("❌ Connection error:", err);
      alert("❌ Failed to connect to SignalR: " + err.message);
    }
  };

  // --------- 1:1 fetchers (unchanged) ----------
  const fetchConversations = async () => {
    try {
      setLoadingConversations(true);
      const res = await fetch(
        `http://localhost:4002/chat/conversations?page=1&limit=20`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations || []);
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
        { headers: { Authorization: `Bearer ${jwt}` } }
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
  // Adjust the endpoint to match your server route if needed.
  const fetchGroupMessages = async (groupId) => {
    if (!groupId) return;
    try {
      setLoadingGroupMessages(true);
      const res = await fetch(
        `http://localhost:4002/chat/groups/messages?groupId=${groupId}&page=1&limit=50`,
        { headers: { Authorization: `Bearer ${jwt}` } }
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
  };

  const conversationListProps = {
    conversations,
    loadingConversations,
    selectedConversation,
    fetchConversations,
    fetchConversationMessages,
    userId,
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
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto bg-white shadow p-6 rounded">
        <h1 className="text-2xl font-bold mb-4">
          🔗 Chat & Call Tester {callState !== "None" && `(📞 ${callState})`}
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
                    selectedGroupId ? groupMessagesByGroup[selectedGroupId] || [] : []
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
                onClearReceived={() => setReceivedNotifications([])}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
