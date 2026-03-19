// ----------------------> Audio call <----------------------
// import { CallClient } from "@azure/communication-calling";
// import { AzureCommunicationTokenCredential } from "@azure/communication-common";
// import * as signalR from "@microsoft/signalr";
// import { useEffect, useRef, useState } from "react";

// const BothCall = () => {
//   // State management
//   const [userId, setUserId] = useState("");
//   const [calleeId, setCalleeId] = useState("");
//   const [isConnected, setIsConnected] = useState(false);
//   const [callState, setCallState] = useState("idle"); // idle, initiating, ringing, inCall, incoming
//   const [currentCall, setCurrentCall] = useState(null);
//   const [incomingCallData, setIncomingCallData] = useState(null);
//   const [callDuration, setCallDuration] = useState(0);
//   const [isMuted, setIsMuted] = useState(false);
//   const [logs, setLogs] = useState([]);
//   const [status, setStatus] = useState("");

//   // Refs
//   const signalRConnectionRef = useRef(null);
//   const callClientRef = useRef(null);
//   const callAgentRef = useRef(null);
//   const activeCallRef = useRef(null);
//   const durationIntervalRef = useRef(null);

//   const API_BASE_URL = "http://localhost:4009/api";
//   // const API_BASE_URL = "http://157.245.222.207:4009/api"
//   const HUB_NAME = "audioHub";

//   // Add log
//   const addLog = (message, type = "info") => {
//     const timestamp = new Date().toLocaleTimeString();
//     setLogs((prev) => [...prev, { message, type, timestamp }]);
//     console.log(`[${type.toUpperCase()}] ${message}`);
//   };

//   // --- SIGNALR CONNECTION ---
//   useEffect(() => {
//     if (!userId || isConnected) return;

//     const initSignalR = async () => {
//       try {
//         setStatus("Connecting to SignalR...");
//         addLog("Getting SignalR token...");

//         const response = await fetch(
//           `${API_BASE_URL}/calls/signalr/negotiate`,
//           {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ userId }),
//           }
//         );

//         if (!response.ok) throw new Error("SignalR Negotiation Failed");
//         const data = await response.json();

//         if (!data.success) {
//           throw new Error(data.message || "Failed to get SignalR token");
//         }

//         addLog("Building SignalR connection...");

//         // Build the correct client URL
//         const clientUrl = `${data.url}/client/?hub=${HUB_NAME}`;

//         const connection = new signalR.HubConnectionBuilder()
//           .withUrl(clientUrl, {
//             accessTokenFactory: () => data.accessToken,
//           })
//           .withAutomaticReconnect()
//           .configureLogging(signalR.LogLevel.Information)
//           .build();

//         // Register event handlers BEFORE starting connection
//         connection.on("incoming_call", (callData) => {
//           addLog(`📞 Incoming call from user ${callData.callerId}`, "info");
//           addLog(`Caller: ${callData.callerName || "Unknown"}`);
//           setIncomingCallData(callData);
//           setCallState("incoming");
//           playRingtone();
//         });

//         connection.on("call_accepted", async (callData) => {
//           addLog("✅ Call accepted by receiver", "success");
//           // Call is already connected, just update UI
//         });

//         connection.on("call_rejected", (callData) => {
//           addLog("❌ Call rejected by receiver", "error");
//           setCallState("idle");
//           cleanupCall();
//         });

//         connection.on("call_cancelled", (callData) => {
//           addLog("📵 Call cancelled by caller", "info");
//           setCallState("idle");
//           setIncomingCallData(null);
//           stopRingtone();
//           cleanupCall();
//         });

//         connection.on("call_ended", (callData) => {
//           addLog("📴 Call ended remotely", "info");
//           setCallState("idle");
//           cleanupCall();
//         });

//         connection.on("call_missed", (callData) => {
//           addLog("📵 Call missed", "info");
//           setCallState("idle");
//           setIncomingCallData(null);
//           stopRingtone();
//         });

//         // Start the connection
//         await connection.start();
//         signalRConnectionRef.current = connection;
//         setIsConnected(true);
//         setStatus("Connected");
//         addLog("✅ SignalR connected successfully", "success");
//       } catch (error) {
//         addLog(`❌ SignalR connection failed: ${error.message}`, "error");
//         setStatus("Connection Failed");
//         setIsConnected(false);
//       }
//     };

//     initSignalR();

//     // Cleanup on unmount
//     return () => {
//       if (signalRConnectionRef.current) {
//         signalRConnectionRef.current.stop();
//         signalRConnectionRef.current = null;
//       }
//     };
//   }, [userId]);

//   // Initialize ACS Call Client
//   const initializeCallClient = async (acsToken) => {
//     try {
//       if (!acsToken) {
//         throw new Error(
//           "ACS Token is null or undefined. Check backend response."
//         );
//       }

//       addLog("🔑 Initializing ACS Credential...");

//       const tokenCredential = new AzureCommunicationTokenCredential(acsToken);

//       // Dispose of old agent if it exists to prevent multiple instances
//       if (callAgentRef.current) {
//         await callAgentRef.current.dispose();
//       }

//       const callClient = new CallClient();
//       const callAgent = await callClient.createCallAgent(tokenCredential);

//       callClientRef.current = callClient;
//       callAgentRef.current = callAgent;

//       addLog("✅ ACS Call Agent initialized", "success");
//     } catch (error) {
//       addLog(`❌ Failed to initialize ACS: ${error.message}`, "error");
//       throw error;
//     }
//   };

//   // Join ACS call
//   const joinAcsCall = async (groupCallId) => {
//     try {
//       if (!callAgentRef.current) {
//         throw new Error("Call agent not initialized");
//       }

//       addLog("📡 Joining ACS call...");

//       const call = callAgentRef.current.join(
//         { groupId: groupCallId },
//         { audioOptions: { muted: false } }
//       );

//       activeCallRef.current = call;

//       // Setup call event listeners - FIXED: Use correct method names
//       const handleStateChanged = () => {
//         const state = call.state;
//         addLog(`📞 Call state: ${state}`);

//         if (state === "Connected") {
//           setCallState("inCall");
//           startCallTimer();
//           addLog("✅ Call connected - Audio should be working now!", "success");
//         } else if (state === "Disconnected") {
//           addLog("Call disconnected");
//           stopCallTimer();
//           setCallState("idle");
//         }
//       };

//       const handleMuteChanged = () => {
//         const muted = call.isMuted;
//         setIsMuted(muted);
//         addLog(`🎤 Microphone ${muted ? "muted" : "unmuted"}`);
//       };

//       // Add event listeners
//       call.on("stateChanged", handleStateChanged);
//       call.on("isMutedChanged", handleMuteChanged);

//       addLog("✅ Successfully joined ACS call", "success");
//     } catch (error) {
//       addLog(`❌ Failed to join call: ${error.message}`, "error");
//     }
//   };

//   // Start a call timer
//   const startCallTimer = () => {
//     setCallDuration(0);
//     durationIntervalRef.current = setInterval(() => {
//       setCallDuration((prev) => prev + 1);
//     }, 1000);
//   };

//   // Stop call timer
//   const stopCallTimer = () => {
//     if (durationIntervalRef.current) {
//       clearInterval(durationIntervalRef.current);
//       durationIntervalRef.current = null;
//     }
//     setCallDuration(0);
//   };

//   // Initiate a call
//   const initiateCall = async () => {
//     try {
//       if (!userId || !calleeId) {
//         addLog("Please enter both User ID and Callee ID", "error");
//         return;
//       }

//       if (userId === calleeId) {
//         addLog("Cannot call yourself", "error");
//         return;
//       }

//       setCallState("initiating");
//       addLog(`📞 Initiating call to ${calleeId}...`);

//       const response = await fetch(`${API_BASE_URL}/calls/initiate`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           callerId: userId,
//           receiverId: calleeId,
//           callType: "audio",
//         }),
//       });

//       const data = await response.json();

//       if (!data.success) {
//         throw new Error(data.message);
//       }

//       addLog(`✅ Call ID: ${data.callId}`);
//       setCurrentCall(data);

//       // Initialize ACS with caller token
//       await initializeCallClient(data.acsToken);

//       // Join the ACS call
//       await joinAcsCall(data.acsGroupCallId);

//       setCallState("ringing");
//       addLog("📲 Waiting for receiver to accept...", "info");
//     } catch (error) {
//       addLog(`❌ Failed to initiate call: ${error.message}`, "error");
//       setCallState("idle");
//       cleanupCall();
//     }
//   };

//   // Accept incoming call
//   const acceptCall = async () => {
//     try {
//       if (!incomingCallData) return;

//       addLog("✅ Accepting call...");
//       stopRingtone();

//       const response = await fetch(`${API_BASE_URL}/calls/accept`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           callId: incomingCallData.callId,
//           receiverId: userId,
//         }),
//       });

//       const data = await response.json();

//       console.log("Full Accept Response Data:", data); // DEBUG LOG

//       if (!data.success) {
//         throw new Error(data.message);
//       }

//       addLog(`✅ Call accepted - joining...`);

//       if (!data.success) {
//         throw new Error(data.message || "Failed to accept call");
//       }

//       // Initialize ACS with receiver token
//       const token = data.acsToken;
//       const groupId = data.acsGroupCallId;

//       if (!token) {
//         throw new Error(
//           "Backend did not provide an acsToken in accept response"
//         );
//       }
//       addLog(`✅ Call accepted - initializing ACS...`);
//       await initializeCallClient(token);
//       await joinAcsCall(groupId);

//       setCurrentCall(data);
//       setIncomingCallData(null);
//       addLog("✅ Successfully joined the call!", "success");
//     } catch (error) {
//       addLog(`❌ Failed to accept call: ${error.message}`, "error");
//       setCallState("idle");
//       setIncomingCallData(null);
//     }
//   };

//   // Reject incoming call
//   const rejectCall = async () => {
//     try {
//       if (!incomingCallData) return;

//       addLog("❌ Rejecting call...");
//       stopRingtone();

//       await fetch(`${API_BASE_URL}/calls/reject`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           callId: incomingCallData.callId,
//           receiverId: userId,
//         }),
//       });

//       setCallState("idle");
//       setIncomingCallData(null);
//       addLog("Call rejected");
//     } catch (error) {
//       addLog(`❌ Failed to reject call: ${error.message}`, "error");
//     }
//   };

//   // Cancel outgoing call
//   const cancelCall = async () => {
//     try {
//       if (!currentCall) return;

//       addLog("📵 Cancelling call...");

//       await fetch(`${API_BASE_URL}/calls/cancel`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           callId: currentCall.callId,
//           callerId: userId,
//         }),
//       });

//       cleanupCall();
//       setCallState("idle");
//       addLog("Call cancelled");
//     } catch (error) {
//       addLog(`❌ Failed to cancel call: ${error.message}`, "error");
//     }
//   };

//   // End call
//   const endCurrentCall = async () => {
//     try {
//       if (!currentCall) return;

//       addLog("📴 Ending call...");

//       // First hang up the ACS call
//       if (activeCallRef.current) {
//         await activeCallRef.current.hangUp();
//       }

//       // Then notify backend
//       await fetch(`${API_BASE_URL}/calls/end`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           callId: currentCall.callId,
//           userId: userId,
//         }),
//       });

//       cleanupCall();
//       setCallState("idle");
//       addLog("✅ Call ended successfully");
//     } catch (error) {
//       addLog(`❌ Failed to end call: ${error.message}`, "error");
//       // Still cleanup even if API call fails
//       cleanupCall();
//       setCallState("idle");
//     }
//   };

//   // Cleanup call resources
//   const cleanupCall = () => {
//     stopCallTimer();

//     if (activeCallRef.current) {
//       try {
//         activeCallRef.current.hangUp();
//       } catch (e) {
//         // Already hung up
//       }
//       activeCallRef.current = null;
//     }

//     setCurrentCall(null);
//     setIsMuted(false);
//   };

//   // Toggle mute
//   const toggleMute = async () => {
//     try {
//       if (activeCallRef.current) {
//         if (isMuted) {
//           await activeCallRef.current.unmute();
//           addLog("🎤 Microphone unmuted");
//         } else {
//           await activeCallRef.current.mute();
//           addLog("🔇 Microphone muted");
//         }
//         setIsMuted(!isMuted);
//       }
//     } catch (error) {
//       addLog(`❌ Failed to toggle mute: ${error.message}`, "error");
//     }
//   };

//   // Ringtone functions (placeholders)
//   const playRingtone = () => {
//     addLog("🔊 Playing ringtone...");
//     // You can add actual audio playback here
//   };

//   const stopRingtone = () => {
//     addLog("🔇 Ringtone stopped");
//     // Stop audio playback
//   };

//   // Disconnect
//   const handleDisconnect = async () => {
//     if (activeCallRef.current) {
//       try {
//         await activeCallRef.current.hangUp();
//       } catch (e) {}
//     }

//     if (signalRConnectionRef.current) {
//       await signalRConnectionRef.current.stop();
//       signalRConnectionRef.current = null;
//     }

//     setIsConnected(false);
//     setCallState("idle");
//     cleanupCall();
//     setUserId("");
//     addLog("Disconnected from server");
//   };

//   // Format call duration
//   const formatDuration = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
//   };

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       cleanupCall();
//       if (signalRConnectionRef.current) {
//         signalRConnectionRef.current.stop();
//       }
//     };
//   }, []);

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
//       <div className="max-w-4xl mx-auto space-y-6">
//         {/* Header */}
//         <div className="bg-white rounded-xl shadow-lg p-6">
//           <div className="flex items-center space-x-3">
//             <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
//               <span className="text-2xl">📞</span>
//             </div>
//             <div>
//               <h1 className="text-2xl font-bold text-gray-800">
//                 Azure ACS Audio Call
//               </h1>
//               <p className="text-gray-600 text-sm">
//                 WhatsApp-style voice calling
//               </p>
//             </div>
//           </div>
//         </div>

//         {/* Connection Section */}
//         <div className="bg-white rounded-xl shadow-lg p-6">
//           <h2 className="text-xl font-semibold mb-4 flex items-center">
//             <span className="mr-2">🔌</span> Connection
//           </h2>
//           <div className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Your User ID
//               </label>
//               <input
//                 type="text"
//                 value={userId}
//                 onChange={(e) => setUserId(e.target.value)}
//                 disabled={isConnected}
//                 placeholder="e.g., user1, user2, etc."
//                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition"
//               />
//             </div>

//             {!isConnected ? (
//               <button
//                 onClick={() => {
//                   if (userId.trim()) {
//                     addLog("Connecting to server...", "info");
//                   } else {
//                     addLog("Please enter User ID first", "error");
//                   }
//                 }}
//                 disabled={!userId.trim()}
//                 className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition font-semibold disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-md"
//               >
//                 {userId.trim()
//                   ? "Connect to Server"
//                   : "Enter User ID to Connect"}
//               </button>
//             ) : (
//               <button
//                 onClick={handleDisconnect}
//                 className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-4 rounded-lg hover:from-red-700 hover:to-red-800 transition font-semibold shadow-md"
//               >
//                 Disconnect
//               </button>
//             )}

//             <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3">
//               <div
//                 className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}
//               ></div>
//               <div className="flex-1">
//                 <span className="text-sm font-medium text-gray-700">
//                   {isConnected ? "Connected" : "Disconnected"}
//                 </span>
//                 {status && (
//                   <span className="text-xs text-gray-500 ml-2">• {status}</span>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Call Controls */}
//         {isConnected && (
//           <div className="bg-white rounded-xl shadow-lg p-6">
//             <h2 className="text-xl font-semibold mb-4 flex items-center">
//               <span className="mr-2">📱</span> Call Controls
//             </h2>

//             {/* Idle State */}
//             {callState === "idle" && (
//               <div className="space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Call User ID
//                   </label>
//                   <input
//                     type="text"
//                     value={calleeId}
//                     onChange={(e) => setCalleeId(e.target.value)}
//                     placeholder="Enter the user ID you want to call"
//                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
//                   />
//                 </div>
//                 <button
//                   onClick={initiateCall}
//                   disabled={!calleeId.trim()}
//                   className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-4 rounded-lg hover:from-green-700 hover:to-green-800 transition font-semibold text-lg shadow-lg disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
//                 >
//                   📞 Start Audio Call
//                 </button>
//               </div>
//             )}

//             {/* Initiating/Ringing State */}
//             {(callState === "initiating" || callState === "ringing") && (
//               <div className="text-center space-y-6 py-8">
//                 <div className="text-6xl mb-4 animate-bounce">📞</div>
//                 <div>
//                   <p className="text-2xl font-semibold text-gray-800 mb-2">
//                     {callState === "initiating"
//                       ? "Initiating call..."
//                       : "Calling..."}
//                   </p>
//                   <p className="text-gray-600">User: {calleeId}</p>
//                   <p className="text-sm text-gray-500 mt-2">
//                     Waiting for response
//                   </p>
//                 </div>
//                 <button
//                   onClick={cancelCall}
//                   className="bg-red-600 text-white py-3 px-8 rounded-full hover:bg-red-700 transition font-semibold shadow-lg"
//                 >
//                   Cancel Call
//                 </button>
//               </div>
//             )}

//             {/* Incoming Call */}
//             {callState === "incoming" && incomingCallData && (
//               <div className="text-center space-y-6 py-8">
//                 <div className="text-6xl mb-4 animate-bounce">📞</div>
//                 <div>
//                   <p className="text-2xl font-semibold text-gray-800 mb-2">
//                     Incoming Call
//                   </p>
//                   <p className="text-lg text-gray-700">
//                     {incomingCallData.callerName || "Unknown Caller"}
//                   </p>
//                   <p className="text-sm text-gray-500">
//                     User ID: {incomingCallData.callerId}
//                   </p>
//                 </div>
//                 <div className="flex space-x-4 justify-center">
//                   <button
//                     onClick={acceptCall}
//                     className="bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-8 rounded-full hover:from-green-700 hover:to-green-800 transition font-semibold shadow-lg flex items-center space-x-2"
//                   >
//                     <span>✓</span>
//                     <span>Accept</span>
//                   </button>
//                   <button
//                     onClick={rejectCall}
//                     className="bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-8 rounded-full hover:from-red-700 hover:to-red-800 transition font-semibold shadow-lg flex items-center space-x-2"
//                   >
//                     <span>✗</span>
//                     <span>Reject</span>
//                   </button>
//                 </div>
//               </div>
//             )}

//             {/* In Call */}
//             {callState === "inCall" && (
//               <div className="text-center space-y-6 py-8">
//                 <div className="text-6xl mb-4">{isMuted ? "🔇" : "🔊"}</div>
//                 <div>
//                   <p className="text-2xl font-semibold text-gray-800 mb-2">
//                     Call In Progress
//                   </p>
//                   <p className="text-5xl font-mono text-green-600 font-bold my-4">
//                     {formatDuration(callDuration)}
//                   </p>
//                   <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm">
//                     <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
//                     <span>Connected</span>
//                   </div>
//                 </div>
//                 <div className="flex space-x-4 justify-center">
//                   <button
//                     onClick={toggleMute}
//                     className={`${
//                       isMuted
//                         ? "bg-gray-600 hover:bg-gray-700"
//                         : "bg-blue-600 hover:bg-blue-700"
//                     } text-white py-3 px-8 rounded-full transition font-semibold shadow-lg`}
//                   >
//                     {isMuted ? "🔇 Unmute" : "🎤 Mute"}
//                   </button>
//                   <button
//                     onClick={endCurrentCall}
//                     className="bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-8 rounded-full hover:from-red-700 hover:to-red-800 transition font-semibold shadow-lg"
//                   >
//                     End Call
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}

//         {/* Logs */}
//         <div className="bg-white rounded-xl shadow-lg p-6">
//           <div className="flex justify-between items-center mb-4">
//             <h2 className="text-xl font-semibold flex items-center">
//               <span className="mr-2">📋</span> Activity Logs
//             </h2>
//             <button
//               onClick={() => setLogs([])}
//               className="text-sm text-blue-600 hover:text-blue-800 font-medium"
//             >
//               Clear Logs
//             </button>
//           </div>
//           <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
//             {logs.length === 0 ? (
//               <p className="text-gray-500 text-center py-8">
//                 No activity yet...
//               </p>
//             ) : (
//               <div className="space-y-1">
//                 {logs.map((log, index) => (
//                   <div
//                     key={index}
//                     className={`${
//                       log.type === "error"
//                         ? "text-red-400"
//                         : log.type === "success"
//                           ? "text-green-400"
//                           : "text-gray-300"
//                     }`}
//                   >
//                     <span className="text-gray-600">[{log.timestamp}]</span>{" "}
//                     {log.message}
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default BothCall;

// ----------------------> Normal Video call <----------------------
// import { CallClient, VideoStreamRenderer, LocalVideoStream } from "@azure/communication-calling";
// import { AzureCommunicationTokenCredential } from "@azure/communication-common";
// import * as signalR from "@microsoft/signalr";
// import { useEffect, useRef, useState } from "react";

// const BothCall = () => {
//   // State management
//   const [userId, setUserId] = useState("");
//   const [calleeId, setCalleeId] = useState("");
//   const [isConnected, setIsConnected] = useState(false);
//   const [callState, setCallState] = useState("idle");
//   const [currentCall, setCurrentCall] = useState(null);
//   const [incomingCallData, setIncomingCallData] = useState(null);
//   const [callDuration, setCallDuration] = useState(0);
//   const [isMuted, setIsMuted] = useState(false);
//   const [isVideoOn, setIsVideoOn] = useState(true);
//   const [logs, setLogs] = useState([]);
//   const [status, setStatus] = useState("");

//   // Refs
//   const signalRConnectionRef = useRef(null);
//   const callClientRef = useRef(null);
//   const callAgentRef = useRef(null);
//   const activeCallRef = useRef(null);
//   const durationIntervalRef = useRef(null);
//   const localVideoContainerRef = useRef(null);
//   const remoteVideoContainerRef = useRef(null);
//   const localVideoStreamRef = useRef(null);
//   const localRendererRef = useRef(null);
//   const remoteRendererRef = useRef(null);
//   const deviceManagerRef = useRef(null);

//   const API_BASE_URL = "http://localhost:4009/api";
//   const HUB_NAME = "audioHub";

//   // Add log
//   const addLog = (message, type = "info") => {
//     const timestamp = new Date().toLocaleTimeString();
//     setLogs((prev) => [...prev, { message, type, timestamp }]);
//     console.log(`[${type.toUpperCase()}] ${message}`);
//   };

//   // --- SIGNALR CONNECTION ---
//   useEffect(() => {
//     if (!userId || isConnected) return;

//     const initSignalR = async () => {
//       try {
//         setStatus("Connecting to SignalR...");
//         addLog("Getting SignalR token...");

//         const response = await fetch(
//           `${API_BASE_URL}/calls/signalr/negotiate`,
//           {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ userId }),
//           }
//         );

//         if (!response.ok) throw new Error("SignalR Negotiation Failed");
//         const data = await response.json();

//         if (!data.success) {
//           throw new Error(data.message || "Failed to get SignalR token");
//         }

//         addLog("Building SignalR connection...");

//         const clientUrl = `${data.url}/client/?hub=${HUB_NAME}`;

//         const connection = new signalR.HubConnectionBuilder()
//           .withUrl(clientUrl, {
//             accessTokenFactory: () => data.accessToken,
//           })
//           .withAutomaticReconnect()
//           .configureLogging(signalR.LogLevel.Information)
//           .build();

//         connection.on("incoming_call", (callData) => {
//           addLog(`📹 Incoming video call from user ${callData.callerId}`, "info");
//           setIncomingCallData(callData);
//           setCallState("incoming");
//           playRingtone();
//         });

//         connection.on("call_accepted", async (callData) => {
//           addLog("✅ Call accepted by receiver", "success");
//         });

//         connection.on("call_rejected", (callData) => {
//           addLog("❌ Call rejected by receiver", "error");
//           setCallState("idle");
//           cleanupCall();
//         });

//         connection.on("call_cancelled", (callData) => {
//           addLog("📵 Call cancelled by caller", "info");
//           setCallState("idle");
//           setIncomingCallData(null);
//           stopRingtone();
//           cleanupCall();
//         });

//         connection.on("call_ended", (callData) => {
//           addLog("📴 Call ended remotely", "info");
//           setCallState("idle");
//           cleanupCall();
//         });

//         connection.on("call_missed", (callData) => {
//           addLog("📵 Call missed", "info");
//           setCallState("idle");
//           setIncomingCallData(null);
//           stopRingtone();
//         });

//         await connection.start();
//         signalRConnectionRef.current = connection;
//         setIsConnected(true);
//         setStatus("Connected");
//         addLog("✅ SignalR connected successfully", "success");
//       } catch (error) {
//         addLog(`❌ SignalR connection failed: ${error.message}`, "error");
//         setStatus("Connection Failed");
//         setIsConnected(false);
//       }
//     };

//     initSignalR();

//     return () => {
//       if (signalRConnectionRef.current) {
//         signalRConnectionRef.current.stop();
//         signalRConnectionRef.current = null;
//       }
//     };
//   }, [userId]);

//   // Initialize ACS Call Client with video support
//   const initializeCallClient = async (acsToken) => {
//     try {
//       const tokenCredential = new AzureCommunicationTokenCredential(acsToken);
//       const callClient = new CallClient();
//       const callAgent = await callClient.createCallAgent(tokenCredential);
//       const deviceManager = await callClient.getDeviceManager();

//       callClientRef.current = callClient;
//       callAgentRef.current = callAgent;
//       deviceManagerRef.current = deviceManager;

//       // Request camera permissions
//       await deviceManager.askDevicePermission({ video: true, audio: true });

//       addLog("✅ ACS Call Agent initialized with video support", "success");
//     } catch (error) {
//       addLog(`❌ Failed to initialize ACS: ${error.message}`, "error");
//       throw error;
//     }
//   };

//   // Start local video preview
//   const startLocalVideo = async () => {
//     try {
//       if (!deviceManagerRef.current) {
//         throw new Error("Device manager not initialized");
//       }

//       const cameras = await deviceManagerRef.current.getCameras();
//       if (cameras.length === 0) {
//         throw new Error("No cameras found");
//       }

//       const camera = cameras[0];
//       const localVideoStream = new LocalVideoStream(camera);
//       localVideoStreamRef.current = localVideoStream;

//       const renderer = new VideoStreamRenderer(localVideoStream);
//       localRendererRef.current = renderer;

//       const view = await renderer.createView();

//       if (localVideoContainerRef.current) {
//         localVideoContainerRef.current.innerHTML = "";
//         localVideoContainerRef.current.appendChild(view.target);
//       }

//       addLog("📹 Local video started", "success");
//       setIsVideoOn(true);
//     } catch (error) {
//       addLog(`❌ Failed to start local video: ${error.message}`, "error");
//     }
//   };

//   // Stop local video
//   const stopLocalVideo = async () => {
//     try {
//       if (localRendererRef.current) {
//         localRendererRef.current.dispose();
//         localRendererRef.current = null;
//       }

//       if (localVideoContainerRef.current) {
//         localVideoContainerRef.current.innerHTML = "";
//       }

//       localVideoStreamRef.current = null;
//       setIsVideoOn(false);
//       addLog("📹 Local video stopped");
//     } catch (error) {
//       addLog(`❌ Failed to stop local video: ${error.message}`, "error");
//     }
//   };

//   // Handle remote video streams
//   const subscribeToRemoteParticipant = async (remoteParticipant) => {
//     try {
//       addLog(`👤 Remote participant joined: ${remoteParticipant.identifier.communicationUserId}`);

//       remoteParticipant.on("videoStreamsUpdated", async (e) => {
//         for (const stream of e.added) {
//           addLog("📹 Remote video stream added");
//           await displayRemoteVideoStream(stream);
//         }

//         for (const stream of e.removed) {
//           addLog("📹 Remote video stream removed");
//           if (remoteRendererRef.current) {
//             remoteRendererRef.current.dispose();
//             remoteRendererRef.current = null;
//           }
//           if (remoteVideoContainerRef.current) {
//             remoteVideoContainerRef.current.innerHTML = "";
//           }
//         }
//       });

//       // Handle existing video streams
//       for (const videoStream of remoteParticipant.videoStreams) {
//         if (videoStream.isAvailable) {
//           await displayRemoteVideoStream(videoStream);
//         }
//       }
//     } catch (error) {
//       addLog(`❌ Error subscribing to remote participant: ${error.message}`, "error");
//     }
//   };

//   // Display remote video stream
//   const displayRemoteVideoStream = async (remoteVideoStream) => {
//     try {
//       const renderer = new VideoStreamRenderer(remoteVideoStream);
//       remoteRendererRef.current = renderer;

//       const view = await renderer.createView();

//       if (remoteVideoContainerRef.current) {
//         remoteVideoContainerRef.current.innerHTML = "";
//         remoteVideoContainerRef.current.appendChild(view.target);
//       }

//       addLog("✅ Remote video displayed", "success");
//     } catch (error) {
//       addLog(`❌ Failed to display remote video: ${error.message}`, "error");
//     }
//   };

//   // Join ACS video call
//   const joinAcsCall = async (groupCallId) => {
//     try {
//       if (!callAgentRef.current) {
//         throw new Error("Call agent not initialized");
//       }

//       addLog("📡 Joining ACS video call...");

//       // Start local video before joining
//       await startLocalVideo();

//       const call = callAgentRef.current.join(
//         { groupId: groupCallId },
//         {
//           videoOptions: localVideoStreamRef.current ? {
//             localVideoStreams: [localVideoStreamRef.current]
//           } : undefined,
//           audioOptions: { muted: false }
//         }
//       );

//       activeCallRef.current = call;

//       // Setup call event listeners
//       call.on("stateChanged", () => {
//         const state = call.state;
//         addLog(`📞 Call state: ${state}`);

//         if (state === "Connected") {
//           setCallState("inCall");
//           startCallTimer();
//           addLog("✅ Video call connected!", "success");
//         } else if (state === "Disconnected") {
//           addLog("Call disconnected");
//           stopCallTimer();
//           setCallState("idle");
//         }
//       });

//       call.on("isMutedChanged", () => {
//         const muted = call.isMuted;
//         setIsMuted(muted);
//         addLog(`🎤 Microphone ${muted ? "muted" : "unmuted"}`);
//       });

//       call.on("remoteParticipantsUpdated", (e) => {
//         for (const participant of e.added) {
//           subscribeToRemoteParticipant(participant);
//         }

//         for (const participant of e.removed) {
//           addLog(`👤 Remote participant left`);
//         }
//       });

//       // Subscribe to existing remote participants
//       for (const participant of call.remoteParticipants) {
//         subscribeToRemoteParticipant(participant);
//       }

//       addLog("✅ Successfully joined video call", "success");
//     } catch (error) {
//       addLog(`❌ Failed to join call: ${error.message}`, "error");
//     }
//   };

//   // Start call timer
//   const startCallTimer = () => {
//     setCallDuration(0);
//     durationIntervalRef.current = setInterval(() => {
//       setCallDuration((prev) => prev + 1);
//     }, 1000);
//   };

//   // Stop call timer
//   const stopCallTimer = () => {
//     if (durationIntervalRef.current) {
//       clearInterval(durationIntervalRef.current);
//       durationIntervalRef.current = null;
//     }
//     setCallDuration(0);
//   };

//   // Initiate a video call
//   const initiateCall = async () => {
//     try {
//       if (!userId || !calleeId) {
//         addLog("Please enter both User ID and Callee ID", "error");
//         return;
//       }

//       if (userId === calleeId) {
//         addLog("Cannot call yourself", "error");
//         return;
//       }

//       setCallState("initiating");
//       addLog(`📹 Initiating video call to ${calleeId}...`);

//       const response = await fetch(`${API_BASE_URL}/calls/initiate`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           callerId: userId,
//           receiverId: calleeId,
//           callType: "video",
//         }),
//       });

//       const data = await response.json();

//       if (!data.success) {
//         throw new Error(data.message);
//       }

//       addLog(`✅ Call ID: ${data.callId}`);
//       setCurrentCall(data);

//       await initializeCallClient(data.acsToken);
//       await joinAcsCall(data.acsGroupCallId);

//       setCallState("ringing");
//       addLog("📲 Waiting for receiver to accept...", "info");
//     } catch (error) {
//       addLog(`❌ Failed to initiate call: ${error.message}`, "error");
//       setCallState("idle");
//       cleanupCall();
//     }
//   };

//   // Accept incoming call
//   const acceptCall = async () => {
//     try {
//       if (!incomingCallData) return;

//       addLog("✅ Accepting video call...");
//       stopRingtone();

//       const response = await fetch(`${API_BASE_URL}/calls/accept`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           callId: incomingCallData.callId,
//           receiverId: userId,
//         }),
//       });

//       const data = await response.json();

//       if (!data.success) {
//         throw new Error(data.message);
//       }

//       addLog(`✅ Call accepted - joining...`);

//       await initializeCallClient(data.acsToken);
//       await joinAcsCall(data.acsGroupCallId);

//       setCurrentCall(data);
//       setIncomingCallData(null);
//       addLog("✅ Successfully joined the video call!", "success");
//     } catch (error) {
//       addLog(`❌ Failed to accept call: ${error.message}`, "error");
//       setCallState("idle");
//       setIncomingCallData(null);
//     }
//   };

//   // Reject incoming call
//   const rejectCall = async () => {
//     try {
//       if (!incomingCallData) return;

//       addLog("❌ Rejecting call...");
//       stopRingtone();

//       await fetch(`${API_BASE_URL}/calls/reject`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           callId: incomingCallData.callId,
//           receiverId: userId,
//         }),
//       });

//       setCallState("idle");
//       setIncomingCallData(null);
//       addLog("Call rejected");
//     } catch (error) {
//       addLog(`❌ Failed to reject call: ${error.message}`, "error");
//     }
//   };

//   // Cancel outgoing call
//   const cancelCall = async () => {
//     try {
//       if (!currentCall) return;

//       addLog("📵 Cancelling call...");

//       await fetch(`${API_BASE_URL}/calls/cancel`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           callId: currentCall.callId,
//           callerId: userId,
//         }),
//       });

//       cleanupCall();
//       setCallState("idle");
//       addLog("Call cancelled");
//     } catch (error) {
//       addLog(`❌ Failed to cancel call: ${error.message}`, "error");
//     }
//   };

//   // End call
//   const endCurrentCall = async () => {
//     try {
//       if (!currentCall) return;

//       addLog("📴 Ending call...");

//       if (activeCallRef.current) {
//         await activeCallRef.current.hangUp();
//       }

//       await fetch(`${API_BASE_URL}/calls/end`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           callId: currentCall.callId,
//           userId: userId,
//         }),
//       });

//       cleanupCall();
//       setCallState("idle");
//       addLog("✅ Call ended successfully");
//     } catch (error) {
//       addLog(`❌ Failed to end call: ${error.message}`, "error");
//       cleanupCall();
//       setCallState("idle");
//     }
//   };

//   // Cleanup call resources
//   const cleanupCall = () => {
//     stopCallTimer();
//     stopLocalVideo();

//     if (remoteRendererRef.current) {
//       remoteRendererRef.current.dispose();
//       remoteRendererRef.current = null;
//     }

//     if (remoteVideoContainerRef.current) {
//       remoteVideoContainerRef.current.innerHTML = "";
//     }

//     if (activeCallRef.current) {
//       try {
//         activeCallRef.current.hangUp();
//       } catch (e) {}
//       activeCallRef.current = null;
//     }

//     setCurrentCall(null);
//     setIsMuted(false);
//     setIsVideoOn(true);
//   };

//   // Toggle mute
//   const toggleMute = async () => {
//     try {
//       if (activeCallRef.current) {
//         if (isMuted) {
//           await activeCallRef.current.unmute();
//           addLog("🎤 Microphone unmuted");
//         } else {
//           await activeCallRef.current.mute();
//           addLog("🔇 Microphone muted");
//         }
//         setIsMuted(!isMuted);
//       }
//     } catch (error) {
//       addLog(`❌ Failed to toggle mute: ${error.message}`, "error");
//     }
//   };

//   // Toggle video
//   const toggleVideo = async () => {
//     try {
//       if (activeCallRef.current && localVideoStreamRef.current) {
//         if (isVideoOn) {
//           await activeCallRef.current.stopVideo(localVideoStreamRef.current);
//           await stopLocalVideo();
//           addLog("📹 Video stopped");
//         } else {
//           await startLocalVideo();
//           if (localVideoStreamRef.current) {
//             await activeCallRef.current.startVideo(localVideoStreamRef.current);
//             addLog("📹 Video started");
//           }
//         }
//       }
//     } catch (error) {
//       addLog(`❌ Failed to toggle video: ${error.message}`, "error");
//     }
//   };

//   // Ringtone functions
//   const playRingtone = () => {
//     addLog("🔊 Playing ringtone...");
//   };

//   const stopRingtone = () => {
//     addLog("🔇 Ringtone stopped");
//   };

//   // Disconnect
//   const handleDisconnect = async () => {
//     if (activeCallRef.current) {
//       try {
//         await activeCallRef.current.hangUp();
//       } catch (e) {}
//     }

//     if (signalRConnectionRef.current) {
//       await signalRConnectionRef.current.stop();
//       signalRConnectionRef.current = null;
//     }

//     cleanupCall();
//     setIsConnected(false);
//     setCallState("idle");
//     setUserId("");
//     addLog("Disconnected from server");
//   };

//   // Format call duration
//   const formatDuration = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
//   };

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       cleanupCall();
//       if (signalRConnectionRef.current) {
//         signalRConnectionRef.current.stop();
//       }
//     };
//   }, []);

//   return (
//     <div className="min-h-screen bg-gray-900 p-4">
//       <div className="max-w-6xl mx-auto space-y-4">
//         {/* Header */}
//         <div className="bg-gray-800 rounded-lg shadow-lg p-4">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center space-x-3">
//               <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
//                 <span className="text-xl">📹</span>
//               </div>
//               <div>
//                 <h1 className="text-xl font-bold text-white">Azure Video Call</h1>
//                 <p className="text-gray-400 text-sm">Video calling service</p>
//               </div>
//             </div>
//             <div className="flex items-center space-x-2">
//               <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-gray-500"}`}></div>
//               <span className="text-sm text-gray-300">{isConnected ? "Connected" : "Disconnected"}</span>
//             </div>
//           </div>
//         </div>

//         {/* Video Display Area */}
//         {callState === "inCall" && (
//           <div className="relative bg-black rounded-lg overflow-hidden" style={{ height: "500px" }}>
//             {/* Remote Video (Main) */}
//             <div ref={remoteVideoContainerRef} className="w-full h-full flex items-center justify-center">
//               <div className="text-gray-500 text-center">
//                 <div className="text-6xl mb-4">👤</div>
//                 <p>Waiting for remote video...</p>
//               </div>
//             </div>

//             {/* Local Video (Picture-in-Picture) */}
//             <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-gray-700">
//               <div ref={localVideoContainerRef} className="w-full h-full flex items-center justify-center">
//                 {!isVideoOn && (
//                   <div className="text-gray-400 text-center">
//                     <div className="text-3xl">📹</div>
//                     <p className="text-xs mt-1">Video Off</p>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Call Controls Overlay */}
//             <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-6">
//               <div className="flex items-center justify-between">
//                 <div className="text-white">
//                   <p className="text-2xl font-mono font-bold">{formatDuration(callDuration)}</p>
//                 </div>
//                 <div className="flex space-x-3">
//                   <button
//                     onClick={toggleMute}
//                     className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
//                       isMuted ? "bg-red-600 hover:bg-red-700" : "bg-gray-700 hover:bg-gray-600"
//                     }`}
//                   >
//                     <span className="text-xl">{isMuted ? "🔇" : "🎤"}</span>
//                   </button>
//                   <button
//                     onClick={toggleVideo}
//                     className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
//                       isVideoOn ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600 hover:bg-red-700"
//                     }`}
//                   >
//                     <span className="text-xl">{isVideoOn ? "📹" : "📹"}</span>
//                   </button>
//                   <button
//                     onClick={endCurrentCall}
//                     className="w-12 h-12 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition"
//                   >
//                     <span className="text-xl">📞</span>
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         {/* Connection & Controls */}
//         <div className="bg-gray-800 rounded-lg shadow-lg p-4">
//           {!isConnected ? (
//             <div className="space-y-3">
//               <input
//                 type="text"
//                 value={userId}
//                 onChange={(e) => setUserId(e.target.value)}
//                 placeholder="Enter your User ID"
//                 className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
//               />
//               <button
//                 onClick={() => userId.trim() && addLog("Connecting...", "info")}
//                 disabled={!userId.trim()}
//                 className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
//               >
//                 Connect
//               </button>
//             </div>
//           ) : (
//             <>
//               {callState === "idle" && (
//                 <div className="space-y-3">
//                   <input
//                     type="text"
//                     value={calleeId}
//                     onChange={(e) => setCalleeId(e.target.value)}
//                     placeholder="Enter User ID to call"
//                     className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
//                   />
//                   <div className="flex space-x-2">
//                     <button
//                       onClick={initiateCall}
//                       disabled={!calleeId.trim()}
//                       className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition"
//                     >
//                       📹 Start Video Call
//                     </button>
//                     <button
//                       onClick={handleDisconnect}
//                       className="px-4 bg-red-600 text-white rounded hover:bg-red-700 transition"
//                     >
//                       Disconnect
//                     </button>
//                   </div>
//                 </div>
//               )}

//               {(callState === "initiating" || callState === "ringing") && (
//                 <div className="text-center py-6">
//                   <div className="text-4xl mb-3 animate-bounce">📹</div>
//                   <p className="text-white text-lg mb-1">
//                     {callState === "initiating" ? "Initiating..." : "Calling..."}
//                   </p>
//                   <p className="text-gray-400 text-sm mb-4">User: {calleeId}</p>
//                   <button
//                     onClick={cancelCall}
//                     className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition"
//                   >
//                     Cancel
//                   </button>
//                 </div>
//               )}

//               {callState === "incoming" && incomingCallData && (
//                 <div className="text-center py-6">
//                   <div className="text-4xl mb-3 animate-bounce">📹</div>
//                   <p className="text-white text-lg mb-1">Incoming Video Call</p>
//                   <p className="text-gray-400 mb-4">From: {incomingCallData.callerId}</p>
//                   <div className="flex space-x-3 justify-center">
//                     <button
//                       onClick={acceptCall}
//                       className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition"
//                     >
//                       Accept
//                     </button>
//                     <button
//                       onClick={rejectCall}
//                       className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition"
//                     >
//                       Reject
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </>
//           )}
//         </div>

//         {/* Logs */}
//         <div className="bg-gray-800 rounded-lg shadow-lg p-4">
//           <div className="flex justify-between items-center mb-2">
//             <h3 className="text-white font-semibold">Activity Logs</h3>
//             <button
//               onClick={() => setLogs([])}
//               className="text-xs text-blue-400 hover:text-blue-300"
//             >
//               Clear
//             </button>
//           </div>
//           <div className="bg-gray-900 rounded p-3 h-40 overflow-y-auto font-mono text-xs">
//             {logs.length === 0 ? (
//               <p className="text-gray-500 text-center py-8">No activity yet</p>
//             ) : (
//               logs.map((log, i) => (
//                 <div
//                   key={i}
//                   className={`${
//                     log.type === "error"
//                       ? "text-red-400"
//                       : log.type === "success"
//                         ? "text-green-400"
//                         : "text-gray-400"
//                   }`}
//                 >
//                   <span className="text-gray-600">[{log.timestamp}]</span> {log.message}
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default BothCall;

// --------------------> WITH NOTIFICATION AUDIO CALL <--------------------
import { CallClient } from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import * as signalR from "@microsoft/signalr";
import { useEffect, useRef, useState } from "react";
// 🔥 ADDED: Firebase imports
import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// 🔥 ADDED: Your Firebase Config (Replace with your actual Firebase project config)
const firebaseConfig = {
  apiKey: "AIzaSyDZjuQ25Ds3kPO0QGJkQrcEUk4GanwMkTA",
  authDomain: "uhura-c399e.firebaseapp.com",
  projectId: "uhura-c399e",
  storageBucket: "uhura-c399e.firebasestorage.app",
  messagingSenderId: "423562755233",
  appId: "1:423562755233:web:a6b7afc6e0857f60da44e0",
};

// Initialize Firebase outside the component to prevent re-initialization
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const messaging = getMessaging(app);

const BothCall = () => {
  // State management
  const [userId, setUserId] = useState("");
  const [calleeId, setCalleeId] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [callState, setCallState] = useState("idle");
  const [currentCall, setCurrentCall] = useState(null);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("");
  // 🔥 ADDED: FCM Token state
  const [fcmToken, setFcmToken] = useState("");

  // Refs
  const signalRConnectionRef = useRef(null);
  const callClientRef = useRef(null);
  const callAgentRef = useRef(null);
  const activeCallRef = useRef(null);
  const durationIntervalRef = useRef(null);

  const API_BASE_URL = "http://localhost:4009/api";
  const HUB_NAME = "audioHub";

  // Add log
  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { message, type, timestamp }]);
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  // 🔥 ADDED: Setup Firebase Push Notifications
  const setupFirebaseMessaging = async () => {
    try {
      addLog("Requesting notification permissions...", "info");
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        addLog("Notification permission granted.", "success");

        // Generate Token (Replace YOUR_VAPID_KEY with your Firebase Web Push Cert key)
        const token = await getToken(messaging, {
          vapidKey:
            "BBdaMkAbh_G35VAqIhHoSRFBiSFJLhHZthwD_-s_qqNYho-_e6Eu7nydpVcdhF9IPAoSxtUZXTVNeMg5Y8Lxx7g",
        });

        if (token) {
          setFcmToken(token);
          addLog(`📱 FCM Token Generated: ${token}`, "success");

          // ⚠️ IMPORTANT: You must save this token to your backend DeviceToken collection!
          // Uncomment and adjust this to point to your actual endpoint
          /*
          await fetch(`${API_BASE_URL}/users/device-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, token, platform: 'web' })
          });
          */
        }
      } else {
        addLog("Notification permission denied.", "error");
      }
    } catch (error) {
      addLog(`❌ Firebase Setup Error: ${error.message}`, "error");
    }
  };

  // 🔥 ADDED: Listen for Foreground FCM Messages
  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      addLog(
        `🔔 [FCM Foreground] Payload received: ${payload.data.notificationType}`,
        "info",
      );
      console.log("FCM Payload:", payload.data);

      // We only act on the push if SignalR missed it (belt and suspenders!)
      if (payload.data.notificationType === "incoming_call") {
        setCallState((prevState) => {
          if (prevState === "idle") {
            addLog(
              `📞 FCM triggered incoming call from ${payload.data.callerName}`,
              "info",
            );
            setIncomingCallData(payload.data);
            playRingtone();
            return "incoming";
          }
          return prevState;
        });
      } else if (payload.data.notificationType === "call_cancelled") {
        addLog("🛑 FCM triggered call cancellation", "info");
        setCallState("idle");
        setIncomingCallData(null);
        stopRingtone();
        cleanupCall();
      }
    });

    return () => unsubscribe();
  }, []);

  // --- SIGNALR CONNECTION ---
  useEffect(() => {
    if (!userId || isConnected) return;

    const initSignalR = async () => {
      try {
        setStatus("Connecting to SignalR...");
        addLog("Getting SignalR token...");

        // 🔥 Initialize Firebase and get token when user connects
        await setupFirebaseMessaging();

        const response = await fetch(
          `${API_BASE_URL}/calls/signalr/negotiate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          },
        );

        if (!response.ok) throw new Error("SignalR Negotiation Failed");
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message || "Failed to get SignalR token");
        }

        addLog("Building SignalR connection...");

        const clientUrl = `${data.url}/client/?hub=${HUB_NAME}`;

        const connection = new signalR.HubConnectionBuilder()
          .withUrl(clientUrl, {
            accessTokenFactory: () => data.accessToken,
          })
          .withAutomaticReconnect()
          .configureLogging(signalR.LogLevel.Information)
          .build();

        // Register event handlers
        connection.on("incoming_call", (callData) => {
          addLog(
            `📞 [SignalR] Incoming call from user ${callData.callerId}`,
            "info",
          );
          setIncomingCallData(callData);
          setCallState("incoming");
          playRingtone();
        });

        connection.on("call_accepted", async (callData) => {
          addLog("✅ [SignalR] Call accepted by receiver", "success");
        });

        connection.on("call_rejected", (callData) => {
          addLog("❌ [SignalR] Call rejected by receiver", "error");
          setCallState("idle");
          cleanupCall();
        });

        connection.on("call_cancelled", (callData) => {
          addLog("📵 [SignalR] Call cancelled by caller", "info");
          setCallState("idle");
          setIncomingCallData(null);
          stopRingtone();
          cleanupCall();
        });

        connection.on("call_ended", (callData) => {
          addLog("📴 [SignalR] Call ended remotely", "info");
          setCallState("idle");
          cleanupCall();
        });

        await connection.start();
        signalRConnectionRef.current = connection;
        setIsConnected(true);
        setStatus("Connected");
        addLog("✅ SignalR connected successfully", "success");
      } catch (error) {
        addLog(`❌ SignalR connection failed: ${error.message}`, "error");
        setStatus("Connection Failed");
        setIsConnected(false);
      }
    };

    initSignalR();

    return () => {
      if (signalRConnectionRef.current) {
        signalRConnectionRef.current.stop();
        signalRConnectionRef.current = null;
      }
    };
  }, [userId]);

  // ... (Keep initializeCallClient, joinAcsCall, startCallTimer, stopCallTimer, initiateCall, acceptCall, rejectCall, cancelCall, endCurrentCall, cleanupCall, toggleMute, playRingtone, stopRingtone, handleDisconnect, formatDuration exactly the same as your original code) ...

  // Initialize ACS Call Client
  const initializeCallClient = async (acsToken) => {
    try {
      if (!acsToken) throw new Error("ACS Token is null or undefined.");
      addLog("🔑 Initializing ACS Credential...");
      const tokenCredential = new AzureCommunicationTokenCredential(acsToken);
      if (callAgentRef.current) await callAgentRef.current.dispose();
      const callClient = new CallClient();
      const callAgent = await callClient.createCallAgent(tokenCredential);
      callClientRef.current = callClient;
      callAgentRef.current = callAgent;
      addLog("✅ ACS Call Agent initialized", "success");
    } catch (error) {
      addLog(`❌ Failed to initialize ACS: ${error.message}`, "error");
      throw error;
    }
  };

  const joinAcsCall = async (groupCallId) => {
    try {
      if (!callAgentRef.current) throw new Error("Call agent not initialized");
      addLog("📡 Joining ACS call...");
      const call = callAgentRef.current.join(
        { groupId: groupCallId },
        { audioOptions: { muted: false } },
      );
      activeCallRef.current = call;

      call.on("stateChanged", () => {
        const state = call.state;
        addLog(`📞 Call state: ${state}`);
        if (state === "Connected") {
          setCallState("inCall");
          startCallTimer();
          addLog("✅ Call connected - Audio should be working now!", "success");
        } else if (state === "Disconnected") {
          addLog("Call disconnected");
          stopCallTimer();
          setCallState("idle");
        }
      });

      call.on("isMutedChanged", () => {
        setIsMuted(call.isMuted);
        addLog(`🎤 Microphone ${call.isMuted ? "muted" : "unmuted"}`);
      });
      addLog("✅ Successfully joined ACS call", "success");
    } catch (error) {
      addLog(`❌ Failed to join call: ${error.message}`, "error");
    }
  };

  const startCallTimer = () => {
    setCallDuration(0);
    durationIntervalRef.current = setInterval(
      () => setCallDuration((prev) => prev + 1),
      1000,
    );
  };

  const stopCallTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setCallDuration(0);
  };

  const initiateCall = async () => {
    try {
      if (!userId || !calleeId) {
        addLog("Please enter both IDs", "error");
        return;
      }
      if (userId === calleeId) {
        addLog("Cannot call yourself", "error");
        return;
      }
      setCallState("initiating");
      addLog(`📞 Initiating call to ${calleeId}...`);
      const response = await fetch(`${API_BASE_URL}/calls/initiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callerId: userId,
          receiverId: calleeId,
          callType: "audio",
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      addLog(`✅ Call ID: ${data.callId}`);
      setCurrentCall(data);
      await initializeCallClient(data.acsToken);
      await joinAcsCall(data.acsGroupCallId);
      setCallState("ringing");
      addLog("📲 Waiting for receiver to accept...", "info");
    } catch (error) {
      addLog(`❌ Failed to initiate call: ${error.message}`, "error");
      setCallState("idle");
      cleanupCall();
    }
  };

  const acceptCall = async () => {
    try {
      if (!incomingCallData) return;
      addLog("✅ Accepting call...");
      stopRingtone();
      const response = await fetch(`${API_BASE_URL}/calls/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: incomingCallData.callId,
          receiverId: userId,
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      addLog(`✅ Call accepted - initializing ACS...`);
      await initializeCallClient(data.acsToken);
      await joinAcsCall(data.acsGroupCallId);
      setCurrentCall(data);
      setIncomingCallData(null);
      addLog("✅ Successfully joined the call!", "success");
    } catch (error) {
      addLog(`❌ Failed to accept call: ${error.message}`, "error");
      setCallState("idle");
      setIncomingCallData(null);
    }
  };

  const rejectCall = async () => {
    try {
      if (!incomingCallData) return;
      addLog("❌ Rejecting call...");
      stopRingtone();
      await fetch(`${API_BASE_URL}/calls/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: incomingCallData.callId,
          receiverId: userId,
        }),
      });
      setCallState("idle");
      setIncomingCallData(null);
      addLog("Call rejected");
    } catch (error) {
      addLog(`❌ Failed to reject call: ${error.message}`, "error");
    }
  };

  const cancelCall = async () => {
    try {
      if (!currentCall) return;
      addLog("📵 Cancelling call...");
      await fetch(`${API_BASE_URL}/calls/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: currentCall.callId, callerId: userId }),
      });
      cleanupCall();
      setCallState("idle");
      addLog("Call cancelled");
    } catch (error) {
      addLog(`❌ Failed to cancel call: ${error.message}`, "error");
    }
  };

  const endCurrentCall = async () => {
    try {
      if (!currentCall) return;
      addLog("📴 Ending call...");
      if (activeCallRef.current) await activeCallRef.current.hangUp();
      await fetch(`${API_BASE_URL}/calls/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: currentCall.callId, userId: userId }),
      });
      cleanupCall();
      setCallState("idle");
      addLog("✅ Call ended successfully");
    } catch (error) {
      addLog(`❌ Failed to end call: ${error.message}`, "error");
      cleanupCall();
      setCallState("idle");
    }
  };

  const cleanupCall = () => {
    stopCallTimer();
    if (activeCallRef.current) {
      try {
        activeCallRef.current.hangUp();
      } catch (e) {}
      activeCallRef.current = null;
    }
    setCurrentCall(null);
    setIsMuted(false);
  };

  const toggleMute = async () => {
    try {
      if (activeCallRef.current) {
        if (isMuted) {
          await activeCallRef.current.unmute();
          addLog("🎤 Microphone unmuted");
        } else {
          await activeCallRef.current.mute();
          addLog("🔇 Microphone muted");
        }
        setIsMuted(!isMuted);
      }
    } catch (error) {
      addLog(`❌ Failed to toggle mute: ${error.message}`, "error");
    }
  };

  const playRingtone = () => addLog("🔊 Playing ringtone...");
  const stopRingtone = () => addLog("🔇 Ringtone stopped");

  const handleDisconnect = async () => {
    if (activeCallRef.current) {
      try {
        await activeCallRef.current.hangUp();
      } catch (e) {}
    }
    if (signalRConnectionRef.current) {
      await signalRConnectionRef.current.stop();
      signalRConnectionRef.current = null;
    }
    setIsConnected(false);
    setCallState("idle");
    cleanupCall();
    setUserId("");
    addLog("Disconnected from server");
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      cleanupCall();
      if (signalRConnectionRef.current) signalRConnectionRef.current.stop();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3 justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-2xl">📞</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Azure ACS Audio Call
                </h1>
                <p className="text-gray-600 text-sm">
                  WhatsApp-style voice calling
                </p>
              </div>
            </div>
            {/* 🔥 ADDED: Firebase Status Indicator */}
            {fcmToken && (
              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">
                  FCM Active
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Connection Section */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <span className="mr-2">🔌</span> Connection
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your User ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={isConnected}
                placeholder="e.g., user1, user2, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition"
              />
            </div>

            {!isConnected ? (
              <button
                onClick={() =>
                  userId.trim()
                    ? addLog("Connecting...", "info")
                    : addLog("Enter User ID", "error")
                }
                disabled={!userId.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition font-semibold disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-md"
              >
                {userId.trim()
                  ? "Connect to Server"
                  : "Enter User ID to Connect"}
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-4 rounded-lg hover:from-red-700 hover:to-red-800 transition font-semibold shadow-md"
              >
                Disconnect
              </button>
            )}

            <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3">
              <div
                className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}
              ></div>
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700">
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
                {status && (
                  <span className="text-xs text-gray-500 ml-2">• {status}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Call Controls */}
        {isConnected && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <span className="mr-2">📱</span> Call Controls
            </h2>

            {/* Idle State */}
            {callState === "idle" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Call User ID
                  </label>
                  <input
                    type="text"
                    value={calleeId}
                    onChange={(e) => setCalleeId(e.target.value)}
                    placeholder="Enter the user ID you want to call"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  />
                </div>
                <button
                  onClick={initiateCall}
                  disabled={!calleeId.trim()}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-4 rounded-lg hover:from-green-700 hover:to-green-800 transition font-semibold text-lg shadow-lg disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
                >
                  📞 Start Audio Call
                </button>
              </div>
            )}

            {/* Initiating/Ringing State */}
            {(callState === "initiating" || callState === "ringing") && (
              <div className="text-center space-y-6 py-8">
                <div className="text-6xl mb-4 animate-bounce">📞</div>
                <div>
                  <p className="text-2xl font-semibold text-gray-800 mb-2">
                    {callState === "initiating"
                      ? "Initiating call..."
                      : "Calling..."}
                  </p>
                  <p className="text-gray-600">User: {calleeId}</p>
                </div>
                <button
                  onClick={cancelCall}
                  className="bg-red-600 text-white py-3 px-8 rounded-full hover:bg-red-700 transition font-semibold shadow-lg"
                >
                  Cancel Call
                </button>
              </div>
            )}

            {/* Incoming Call */}
            {callState === "incoming" && incomingCallData && (
              <div className="text-center space-y-6 py-8">
                <div className="text-6xl mb-4 animate-bounce">📞</div>
                <div>
                  <p className="text-2xl font-semibold text-gray-800 mb-2">
                    Incoming Call
                  </p>
                  <p className="text-lg text-gray-700">
                    {incomingCallData.callerName || "Unknown Caller"}
                  </p>
                  <p className="text-sm text-gray-500">
                    User ID: {incomingCallData.callerId}
                  </p>
                </div>
                <div className="flex space-x-4 justify-center">
                  <button
                    onClick={acceptCall}
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-8 rounded-full shadow-lg flex items-center space-x-2"
                  >
                    <span>✓</span>
                    <span>Accept</span>
                  </button>
                  <button
                    onClick={rejectCall}
                    className="bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-8 rounded-full shadow-lg flex items-center space-x-2"
                  >
                    <span>✗</span>
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            )}

            {/* In Call */}
            {callState === "inCall" && (
              <div className="text-center space-y-6 py-8">
                <div className="text-6xl mb-4">{isMuted ? "🔇" : "🔊"}</div>
                <div>
                  <p className="text-2xl font-semibold text-gray-800 mb-2">
                    Call In Progress
                  </p>
                  <p className="text-5xl font-mono text-green-600 font-bold my-4">
                    {formatDuration(callDuration)}
                  </p>
                </div>
                <div className="flex space-x-4 justify-center">
                  <button
                    onClick={toggleMute}
                    className={`${isMuted ? "bg-gray-600" : "bg-blue-600"} text-white py-3 px-8 rounded-full shadow-lg`}
                  >
                    {isMuted ? "🔇 Unmute" : "🎤 Mute"}
                  </button>
                  <button
                    onClick={endCurrentCall}
                    className="bg-gradient-to-r from-red-600 to-red-700 text-white py-3 px-8 rounded-full shadow-lg"
                  >
                    End Call
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <span className="mr-2">📋</span> Activity Logs
            </h2>
            <button
              onClick={() => setLogs([])}
              className="text-sm text-blue-600 font-medium"
            >
              Clear Logs
            </button>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm space-y-1">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No activity yet...
              </p>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`${log.type === "error" ? "text-red-400" : log.type === "success" ? "text-green-400" : "text-gray-300"}`}
                >
                  <span className="text-gray-600">[{log.timestamp}]</span>{" "}
                  {log.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BothCall;
