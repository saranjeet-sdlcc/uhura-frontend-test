// ----------------------WITHOUT TRANSLATION BELOW:---------------------------------------
// import { useState, useEffect, useRef } from "react";
// import axios from "axios";
// import * as signalR from "@microsoft/signalr";
// import { CallClient } from "@azure/communication-calling";
// import { AzureCommunicationTokenCredential } from "@azure/communication-common";

// const CallPanel = ({ jwt, userId, onCallStateChange }) => {
//   // State management
//   const [isCallActive, setIsCallActive] = useState(false);
//   const [isIncomingCall, setIsIncomingCall] = useState(false);
//   const [callStatus, setCallStatus] = useState("idle"); // idle, initiating, ringing, connected, ended
//   const [currentCall, setCurrentCall] = useState(null);
//   const [callDuration, setCallDuration] = useState(0);
//   const [receiverInput, setReceiverInput] = useState("");
//   const [incomingCallData, setIncomingCallData] = useState(null);
//   const [callHistory, setCallHistory] = useState([]);
//   const [showHistory, setShowHistory] = useState(false);
//   const [isMuted, setIsMuted] = useState(false);

//   const [translationEnabled, setTranslationEnabled] = useState(false);
//   const [selectedLanguage, setSelectedLanguage] = useState("");
//   const [languages, setLanguages] = useState([]);

//   // Refs
//   const socketRef = useRef(null);
//   const callClientRef = useRef(null);
//   const callAgentRef = useRef(null);
//   const currentCallRef = useRef(null);
//   const durationIntervalRef = useRef(null);
//   const callIdRef = useRef(null);
//   const acsGroupCallIdRef = useRef(null);

//   const API_BASE_URL = "http://localhost:4005/api/calls";
//   const SOCKET_URL = "http://localhost:4005";

//   useEffect(() => {
//     const fetchLanguages = async () => {
//       try {
//         const res = await axios.get(`${API_BASE_URL}/translation/languages`);
//         if (res.data.success) {
//           setLanguages(res.data.languages);
//         }
//       } catch (err) {
//         console.error("❌ Error fetching languages:", err);
//       }
//     };
//     fetchLanguages();
//   }, []);

//   // Replace the Socket.IO connection with SignalR
//   useEffect(() => {
//     const connectSignalR = async () => {
//       try {
//         // Get SignalR token from backend
//         const tokenResponse = await axios.post(
//           `${API_BASE_URL}/signalr/negotiate`,
//           {
//             userId: userId,
//           }
//         );

//         const { url, accessToken } = tokenResponse.data;

//         // Create SignalR connection
//         const connection = new signalR.HubConnectionBuilder()
//           .withUrl(`${url}/client/?hub=call`, {
//             accessTokenFactory: () => accessToken,
//           })
//           .withAutomaticReconnect()
//           .configureLogging(signalR.LogLevel.Information)
//           .build();

//         // Register event handlers
//         connection.on("incoming_call", async (data) => {
//           console.log("📞 Incoming call:", data);
//           setIncomingCallData(data);
//           setIsIncomingCall(true);
//           setCallStatus("ringing");
//           playRingtone();
//         });

//         connection.on("call_accepted", (data) => {
//           console.log("✅ Call accepted:", data);
//           setCallStatus("connected");
//           stopRingtone();
//           startCallDuration();
//         });

//         connection.on("call_rejected", (data) => {
//           console.log("❌ Call rejected:", data);
//           handleCallEnd();
//         });

//         connection.on("call_cancelled", (data) => {
//           console.log("🚫 Call cancelled:", data);
//           handleCallEnd();
//         });

//         connection.on("call_ended", (data) => {
//           console.log("📴 Call ended:", data);
//           handleCallEnd();
//         });

//         connection.on("call_missed", (data) => {
//           console.log("📵 Call missed:", data);
//           handleCallEnd();
//         });

//         // Start connection
//         await connection.start();
//         console.log("✅ SignalR Connected");
//         socketRef.current = connection;
//       } catch (error) {
//         console.error("❌ SignalR Connection Error:", error);
//       }
//     };

//     connectSignalR();

//     return () => {
//       if (socketRef.current) {
//         socketRef.current.stop();
//       }
//       if (durationIntervalRef.current) {
//         clearInterval(durationIntervalRef.current);
//       }
//     };
//   }, [userId]);

//   // Initialize Azure Communication Services Call Client
//   const initializeCallClient = async (acsToken) => {
//     try {
//       if (!callClientRef.current) {
//         callClientRef.current = new CallClient();
//       }

//       const tokenCredential = new AzureCommunicationTokenCredential(acsToken);
//       callAgentRef.current =
//         await callClientRef.current.createCallAgent(tokenCredential);

//       console.log("✅ Call agent created");
//       return callAgentRef.current;
//     } catch (error) {
//       console.error("❌ Error initializing call client:", error);
//       throw error;
//     }
//   };

//   // Start call duration timer
//   const startCallDuration = () => {
//     durationIntervalRef.current = setInterval(() => {
//       setCallDuration((prev) => prev + 1);
//     }, 1000);
//   };

//   // Stop call duration timer
//   const stopCallDuration = () => {
//     if (durationIntervalRef.current) {
//       clearInterval(durationIntervalRef.current);
//       durationIntervalRef.current = null;
//     }
//   };

//   // Format call duration
//   const formatDuration = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
//   };

//   // Play ringtone (simple implementation)
//   const playRingtone = () => {
//     // You can add actual audio element here
//     console.log("🔔 Playing ringtone...");
//   };

//   // Stop ringtone
//   const stopRingtone = () => {
//     console.log("🔕 Stopping ringtone...");
//   };

//   // Initiate outgoing call
//   const initiateCall = async () => {
//     if (!receiverInput.trim()) {
//       alert("Please enter receiver ID");
//       return;
//     }

//     try {
//       setCallStatus("initiating");
//       const response = await axios.post(`${API_BASE_URL}/initiate`, {
//         callerId: userId,
//         receiverId: receiverInput.trim(),
//         callType: "audio",
//       });

//       if (response.data.success) {
//         const { callId, acsGroupCallId, acsToken, receiver } = response.data;

//         callIdRef.current = callId;

//         console.log("callIdRef.current ------>", callId);
//         if (translationEnabled && selectedLanguage) {
//           await axios.post(`${API_BASE_URL}/${callIdRef.current}/translation`, {
//             participant: "caller",
//             enabled: true,
//             language: selectedLanguage,
//           });
//         }
//         acsGroupCallIdRef.current = acsGroupCallId;

//         console.log("📞 Call initiated:", response.data);
//         setCallStatus("ringing");
//         setIsCallActive(true);
//         onCallStateChange?.(true);

//         // Initialize ACS and join call
//         const callAgent = await initializeCallClient(acsToken);
//         const call = callAgent.join({ groupId: acsGroupCallId });
//         currentCallRef.current = call;

//         // Listen for call state changes
//         call.on("stateChanged", () => {
//           console.log("Call state:", call.state);
//           if (call.state === "Connected") {
//             setCallStatus("connected");
//             startCallDuration();
//           }
//         });

//         playRingtone();
//       }
//     } catch (error) {
//       console.error("❌ Error initiating call:", error);
//       alert(
//         "Failed to initiate call: " +
//           (error.response?.data?.message || error.message)
//       );
//       handleCallEnd();
//     }
//   };

//   // Accept incoming call
//   const acceptCall = async () => {
//     if (!incomingCallData) return;

//     try {
//       const response = await axios.post(`${API_BASE_URL}/accept`, {
//         callId: incomingCallData.callId,
//         receiverId: userId,
//       });

//       if (response.data.success) {
//         const { acsToken, acsGroupCallId } = response.data;
//         callIdRef.current = incomingCallData.callId;

//         if (translationEnabled && selectedLanguage) {
//           await axios.post(`${API_BASE_URL}/${callIdRef.current}/translation`, {
//             participant: "callee",
//             enabled: true,
//             language: selectedLanguage,
//           });
//         }

//         acsGroupCallIdRef.current = acsGroupCallId;

//         setIsIncomingCall(false);
//         setIsCallActive(true);
//         setCallStatus("connected");
//         stopRingtone();
//         onCallStateChange?.(true);

//         // Initialize ACS and join call
//         const callAgent = await initializeCallClient(acsToken);
//         const call = callAgent.join({ groupId: acsGroupCallId });
//         currentCallRef.current = call;

//         // Listen for call state changes
//         call.on("stateChanged", () => {
//           console.log("Call state:", call.state);
//           if (call.state === "Connected") {
//             startCallDuration();
//           }
//         });

//         console.log("✅ Call accepted");
//       }
//     } catch (error) {
//       console.error("❌ Error accepting call:", error);
//       alert(
//         "Failed to accept call: " +
//           (error.response?.data?.message || error.message)
//       );
//       handleCallEnd();
//     }
//   };

//   // Reject incoming call
//   const rejectCall = async () => {
//     if (!incomingCallData) return;

//     try {
//       await axios.post(`${API_BASE_URL}/reject`, {
//         callId: incomingCallData.callId,
//         receiverId: userId,
//       });
//       console.log("❌ Call rejected");
//       handleCallEnd();
//     } catch (error) {
//       console.error("❌ Error rejecting call:", error);
//       handleCallEnd();
//     }
//   };

//   // Cancel outgoing call
//   const cancelCall = async () => {
//     if (!callIdRef.current) return;

//     try {
//       await axios.post(`${API_BASE_URL}/cancel`, {
//         callId: callIdRef.current,
//         callerId: userId,
//       });
//       console.log("🚫 Call cancelled");
//       handleCallEnd();
//     } catch (error) {
//       console.error("❌ Error cancelling call:", error);
//       handleCallEnd();
//     }
//   };

//   // End active call
//   const endCall = async () => {
//     if (!callIdRef.current) return;

//     try {
//       await axios.post(`${API_BASE_URL}/end`, {
//         callId: callIdRef.current,
//         userId: userId,
//       });
//       console.log("📴 Call ended");
//       handleCallEnd();
//     } catch (error) {
//       console.error("❌ Error ending call:", error);
//       handleCallEnd();
//     }
//   };

//   // Handle call end cleanup
//   const handleCallEnd = () => {
//     stopRingtone();
//     stopCallDuration();

//     // Hang up ACS call
//     if (currentCallRef.current) {
//       currentCallRef.current.hangUp().catch(console.error);
//       currentCallRef.current = null;
//     }

//     setIsCallActive(false);
//     setIsIncomingCall(false);
//     setCallStatus("idle");
//     setCallDuration(0);
//     setIncomingCallData(null);
//     callIdRef.current = null;
//     acsGroupCallIdRef.current = null;
//     onCallStateChange?.(false);
//   };

//   // Toggle mute
//   const toggleMute = async () => {
//     if (currentCallRef.current) {
//       try {
//         if (isMuted) {
//           await currentCallRef.current.unmute();
//         } else {
//           await currentCallRef.current.mute();
//         }
//         setIsMuted(!isMuted);
//       } catch (error) {
//         console.error("Error toggling mute:", error);
//       }
//     }
//   };

//   // Fetch call history
//   const fetchCallHistory = async () => {
//     try {
//       const response = await axios.get(`${API_BASE_URL}/history/${userId}`);
//       if (response.data.success) {
//         setCallHistory(response.data.calls);
//         setShowHistory(true);
//       }
//     } catch (error) {
//       console.error("❌ Error fetching call history:", error);
//     }
//   };

//   return (
//     <div className="w-full max-w-md mx-auto p-4 bg-white rounded-lg shadow-lg">
//       {/* Header */}
//       <div className="flex items-center justify-between mb-4">
//         <h2 className="text-xl font-bold text-gray-800">📞 Audio Call</h2>
//         <button
//           onClick={fetchCallHistory}
//           className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
//         >
//           History
//         </button>
//       </div>

//       {/* Incoming Call UI */}
//       {isIncomingCall && (
//         <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
//           <div className="text-center">
//             <div className="text-4xl mb-2">📞</div>
//             <h3 className="text-lg font-semibold mb-1">Incoming Call</h3>
//             <p className="text-gray-700 mb-1">{incomingCallData?.callerName}</p>
//             <p className="text-sm text-gray-500 mb-4">Audio Call</p>
//             <div className="flex gap-2 justify-center">
//               <button
//                 onClick={acceptCall}
//                 className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold"
//               >
//                 ✓ Accept
//               </button>
//               <button
//                 onClick={rejectCall}
//                 className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold"
//               >
//                 ✕ Reject
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Active Call UI */}
//       {isCallActive && !isIncomingCall && (
//         <div className="mb-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
//           <div className="text-center">
//             <div className="text-4xl mb-2">
//               {callStatus === "ringing" ? "📞" : "🎙️"}
//             </div>
//             <h3 className="text-lg font-semibold mb-1">
//               {callStatus === "ringing" ? "Calling..." : "Call in Progress"}
//             </h3>
//             {callStatus === "connected" && (
//               <p className="text-2xl font-mono mb-4">
//                 {formatDuration(callDuration)}
//               </p>
//             )}
//             <div className="flex gap-2 justify-center mb-2">
//               {callStatus === "connected" && (
//                 <button
//                   onClick={toggleMute}
//                   className={`px-4 py-2 rounded-full font-semibold ${
//                     isMuted
//                       ? "bg-red-500 text-white"
//                       : "bg-gray-200 text-gray-800"
//                   }`}
//                 >
//                   {isMuted ? "🔇 Unmute" : "🔊 Mute"}
//                 </button>
//               )}
//             </div>
//             <button
//               onClick={callStatus === "ringing" ? cancelCall : endCall}
//               className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold text-lg"
//             >
//               📴 {callStatus === "ringing" ? "Cancel" : "End Call"}
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Make Call UI */}
//       {!isCallActive && !isIncomingCall && !showHistory && (
//         <div>
//           <div className="mb-4">
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Enter User ID to Call
//             </label>
//             <input
//               type="text"
//               value={receiverInput}
//               onChange={(e) => setReceiverInput(e.target.value)}
//               placeholder="Enter receiver user ID"
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           <div className="mb-4">
//             <label className="flex items-center gap-2">
//               <input
//                 type="checkbox"
//                 checked={translationEnabled}
//                 onChange={(e) => setTranslationEnabled(e.target.checked)}
//               />
//               Enable Live Translation
//             </label>
//           </div>

//           {translationEnabled && (
//             <div className="mb-4">
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Select Language
//               </label>
//               <select
//                 value={selectedLanguage}
//                 onChange={(e) => setSelectedLanguage(e.target.value)}
//                 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//               >
//                 <option value="">-- Select --</option>
//                 {languages.map((lang) => (
//                   <option key={lang.code} value={lang.code}>
//                     {lang.name}
//                   </option>
//                 ))}
//               </select>
//             </div>
//           )}

//           <button
//             onClick={initiateCall}
//             disabled={!receiverInput.trim()}
//             className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg font-semibold text-lg"
//           >
//             📞 Start Audio Call
//           </button>
//         </div>
//       )}

//       {/* Call History UI */}
//       {showHistory && (
//         <div>
//           <div className="flex items-center justify-between mb-4">
//             <h3 className="text-lg font-semibold">Call History</h3>
//             <button
//               onClick={() => setShowHistory(false)}
//               className="text-blue-500 hover:text-blue-700"
//             >
//               ✕ Close
//             </button>
//           </div>
//           <div className="max-h-96 overflow-y-auto">
//             {callHistory.length === 0 ? (
//               <p className="text-center text-gray-500 py-4">No call history</p>
//             ) : (
//               callHistory.map((call) => (
//                 <div
//                   key={call.callId}
//                   className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg"
//                 >
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <p className="font-semibold">
//                         {call.otherUser?.name || "Unknown User"}
//                       </p>
//                       <p className="text-sm text-gray-600">
//                         {call.isOutgoing ? "↗️ Outgoing" : "↙️ Incoming"} •{" "}
//                         <span
//                           className={`font-semibold ${
//                             call.callStatus === "accepted"
//                               ? "text-green-600"
//                               : call.callStatus === "missed"
//                                 ? "text-orange-600"
//                                 : call.callStatus === "rejected"
//                                   ? "text-red-600"
//                                   : "text-gray-600"
//                           }`}
//                         >
//                           {call.callStatus}
//                         </span>
//                       </p>
//                       {call.duration > 0 && (
//                         <p className="text-sm text-gray-500">
//                           Duration: {formatDuration(call.duration)}
//                         </p>
//                       )}
//                     </div>
//                     <div className="text-right">
//                       <p className="text-xs text-gray-500">
//                         {new Date(call.initiatedAt).toLocaleDateString()}
//                       </p>
//                       <p className="text-xs text-gray-500">
//                         {new Date(call.initiatedAt).toLocaleTimeString()}
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       )}

//       {/* Status Indicator */}
//       <div className="mt-4 text-center text-sm text-gray-500">
//         Status: <span className="font-semibold">{callStatus}</span>
//       </div>
//     </div>
//   );
// };

// export default CallPanel;

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as signalR from "@microsoft/signalr";
import { CallClient } from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";

const CallPanel = ({ jwt, userId, onCallStateChange }) => {
  // State management
  const [isCallActive, setIsCallActive] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callStatus, setCallStatus] = useState("idle");
  const [currentCall, setCurrentCall] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [receiverInput, setReceiverInput] = useState("");
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("");
  const [languages, setLanguages] = useState([]);

  // NEW: Subtitle state
  const [subtitles, setSubtitles] = useState([]);
  const [currentSubtitle, setCurrentSubtitle] = useState("");

  // Refs
  const socketRef = useRef(null);
  const callClientRef = useRef(null);
  const callAgentRef = useRef(null);
  const currentCallRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const callIdRef = useRef(null);
  const acsGroupCallIdRef = useRef(null);

  // NEW: Audio WebSocket ref
  const audioWsRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);

  const API_BASE_URL = "http://localhost:4005/api/calls";
  const SOCKET_URL = "http://localhost:4005";
  const WS_AUDIO_URL = "ws://localhost:4005/audio-stream";

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/translation/languages`);
        if (res.data.success) {
          setLanguages(res.data.languages);
        }
      } catch (err) {
        console.error("Error fetching languages:", err);
      }
    };
    fetchLanguages();
  }, []);

  // SignalR connection with subtitle listener
  useEffect(() => {
    const connectSignalR = async () => {
      try {
        const tokenResponse = await axios.post(
          `${API_BASE_URL}/signalr/negotiate`,
          { userId: userId }
        );

        const { url, accessToken } = tokenResponse.data;

        const connection = new signalR.HubConnectionBuilder()
          .withUrl(`${url}/client/?hub=call`, {
            accessTokenFactory: () => accessToken,
          })
          .withAutomaticReconnect()
          .configureLogging(signalR.LogLevel.Information)
          .build();

        // Call event handlers
        connection.on("incoming_call", async (data) => {
          console.log("Incoming call:", data);
          setIncomingCallData(data);
          setIsIncomingCall(true);
          setCallStatus("ringing");
          playRingtone();
        });

        connection.on("call_accepted", (data) => {
          console.log("Call accepted:", data);
          setCallStatus("connected");
          stopRingtone();
          startCallDuration();
        });

        connection.on("call_rejected", (data) => {
          console.log("Call rejected:", data);
          handleCallEnd();
        });

        connection.on("call_cancelled", (data) => {
          console.log("Call cancelled:", data);
          handleCallEnd();
        });

        connection.on("call_ended", (data) => {
          console.log("Call ended:", data);
          handleCallEnd();
        });

        connection.on("call_missed", (data) => {
          console.log("Call missed:", data);
          handleCallEnd();
        });

        // In the connectSignalR function, add this NEW event handler:

        connection.on("translation_ready", (data) => {
          console.log("Translation ready event received:", data);

          if (data.callId === callIdRef.current) {
            console.log(`Starting audio streaming as ${data.participant}...`);

            // Start audio streaming now that translation is ready
            setTimeout(() => {
              startAudioStreaming(data.participant);
            }, 500);
          }
        });

        // NEW: Subtitle handler
        // In CallPanel.jsx - Update subtitle display
        connection.on("subtitle_update", (data) => {
          console.log("Subtitle received:", data);

          if (data.callId === callIdRef.current) {
            const subtitle = {
              id: Date.now(),
              speaker: data.speaker === "caller" ? "Them" : "You", // More user-friendly
              original: data.original,
              translated: data.translated,
              timestamp: data.timestamp,
            };

            setSubtitles((prev) => [...prev.slice(-4), subtitle]);
            setCurrentSubtitle(data.translated); // This is in YOUR language

            setTimeout(() => {
              setCurrentSubtitle("");
            }, 5000); // Increased from 3 to 5 seconds
          }
        });

        await connection.start();
        console.log("SignalR Connected");
        socketRef.current = connection;
      } catch (error) {
        console.error("SignalR Connection Error:", error);
      }
    };

    connectSignalR();

    return () => {
      if (socketRef.current) {
        socketRef.current.stop();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      stopAudioStreaming();
    };
  }, [userId]);

  // Initialize Azure Communication Services Call Client
  const initializeCallClient = async (acsToken) => {
    try {
      if (!callClientRef.current) {
        callClientRef.current = new CallClient();
      }

      const tokenCredential = new AzureCommunicationTokenCredential(acsToken);
      callAgentRef.current =
        await callClientRef.current.createCallAgent(tokenCredential);

      console.log("Call agent created");
      return callAgentRef.current;
    } catch (error) {
      console.error("Error initializing call client:", error);
      throw error;
    }
  };

  // NEW: Start audio streaming for translation
  const startAudioStreaming = async (participant) => {
    try {
      if (!translationEnabled || !callIdRef.current) {
        return;
      }

      console.log("Starting audio streaming for translation...");

      // Connect to audio WebSocket
      audioWsRef.current = new WebSocket(WS_AUDIO_URL);

      audioWsRef.current.onopen = () => {
        console.log("Audio WebSocket connected");

        // Send metadata
        audioWsRef.current.send(
          JSON.stringify({
            callId: callIdRef.current,
            speaker: participant, // "caller" or "callee"
          })
        );
      };

      audioWsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "ready") {
          console.log("Audio stream ready, starting microphone capture...");
          captureMicrophone();
        }
      };

      audioWsRef.current.onerror = (error) => {
        console.error("Audio WebSocket error:", error);
      };

      audioWsRef.current.onclose = () => {
        console.log("Audio WebSocket closed");
      };
    } catch (error) {
      console.error("Error starting audio streaming:", error);
    }
  };

  // NEW: Capture microphone audio and send to backend
  const captureMicrophone = async () => {
    try {
      console.log("🎤 Requesting microphone access...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      console.log("✅ Microphone access granted");

      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);

      console.log(
        `🎵 Audio context created, sample rate: ${audioContextRef.current.sampleRate}Hz`
      );

      // Create script processor for audio processing
      processorRef.current = audioContextRef.current.createScriptProcessor(
        4096,
        1,
        1
      );

      let chunksSent = 0;

      processorRef.current.onaudioprocess = (e) => {
        if (
          !audioWsRef.current ||
          audioWsRef.current.readyState !== WebSocket.OPEN
        ) {
          return;
        }

        const audioData = e.inputBuffer.getChannelData(0);

        // Convert Float32Array to Int16Array (16-bit PCM)
        const buffer = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          const s = Math.max(-1, Math.min(1, audioData[i]));
          buffer[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Send to backend
        audioWsRef.current.send(buffer.buffer);
        chunksSent++;

        if (chunksSent % 10 === 0) {
          console.log(
            `📤 Sent ${chunksSent} audio chunks (${buffer.length * 2} bytes each)`
          );
        }
      };

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      console.log("✅ Microphone capture started for translation");
    } catch (error) {
      console.error("❌ Error capturing microphone:", error);
      alert("Failed to access microphone: " + error.message);
    }
  };

  // NEW: Stop audio streaming
  const stopAudioStreaming = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (audioWsRef.current) {
      audioWsRef.current.close();
      audioWsRef.current = null;
    }

    console.log("Audio streaming stopped");
  };

  const startCallDuration = () => {
    durationIntervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopCallDuration = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const playRingtone = () => {
    console.log("Playing ringtone...");
  };

  const stopRingtone = () => {
    console.log("Stopping ringtone...");
  };

  // Initiate outgoing call
  const initiateCall = async () => {
    if (!receiverInput.trim()) {
      alert("Please enter receiver ID");
      return;
    }

    try {
      setCallStatus("initiating");
      const response = await axios.post(`${API_BASE_URL}/initiate`, {
        callerId: userId,
        receiverId: receiverInput.trim(),
        callType: "audio",
      });

      if (response.data.success) {
        const { callId, acsGroupCallId, acsToken, receiver } = response.data;

        callIdRef.current = callId;

        // Set translation preference
        if (translationEnabled && selectedLanguage) {
          const response = await axios.post(
            `${API_BASE_URL}/${callId}/translation`,
            {
              participant: "caller",
              enabled: true,
              language: selectedLanguage,
            }
          );

          // // NEW: Start audio if translation started
          // if (response.data.translationStarted) {
          //   handleTranslationReady("caller");
          // }
        }

        acsGroupCallIdRef.current = acsGroupCallId;

        console.log("Call initiated:", response.data);
        setCallStatus("ringing");
        setIsCallActive(true);
        setSubtitles([]); // Clear previous subtitles
        onCallStateChange?.(true);

        // Initialize ACS and join call
        const callAgent = await initializeCallClient(acsToken);
        const call = callAgent.join({ groupId: acsGroupCallId });
        currentCallRef.current = call;

        call.on("stateChanged", () => {
          console.log("Call state:", call.state);
          if (call.state === "Connected") {
            setCallStatus("connected");
            startCallDuration();

            // Start audio streaming for translation
            // if (translationEnabled) {
            //   setTimeout(() => {
            //     startAudioStreaming("caller");
            //   }, 1000);
            // }
          }
        });

        playRingtone();
      }
    } catch (error) {
      console.error("Error initiating call:", error);
      alert(
        "Failed to initiate call: " +
          (error.response?.data?.message || error.message)
      );
      handleCallEnd();
    }
  };

  // Accept incoming call
  const acceptCall = async () => {
    if (!incomingCallData) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/accept`, {
        callId: incomingCallData.callId,
        receiverId: userId,
      });

      if (response.data.success) {
        const { acsToken, acsGroupCallId } = response.data;
        callIdRef.current = incomingCallData.callId;

        // Set translation preference
        if (translationEnabled && selectedLanguage) {
          const response = await axios.post(
            `${API_BASE_URL}/${callIdRef.current}/translation`,
            {
              participant: "callee",
              enabled: true,
              language: selectedLanguage,
            }
          );

          // NEW: Start audio if translation started
          // if (response.data.translationStarted) {
          //   handleTranslationReady("callee");
          // }
        }

        acsGroupCallIdRef.current = acsGroupCallId;

        setIsIncomingCall(false);
        setIsCallActive(true);
        setCallStatus("connected");
        setSubtitles([]);
        stopRingtone();
        onCallStateChange?.(true);

        // Initialize ACS and join call
        const callAgent = await initializeCallClient(acsToken);
        const call = callAgent.join({ groupId: acsGroupCallId });
        currentCallRef.current = call;

        call.on("stateChanged", () => {
          console.log("Call state:", call.state);
          if (call.state === "Connected") {
            setCallStatus("connected");
            startCallDuration();
          }
        });

        console.log("Call accepted");
      }
    } catch (error) {
      console.error("Error accepting call:", error);
      alert(
        "Failed to accept call: " +
          (error.response?.data?.message || error.message)
      );
      handleCallEnd();
    }
  };

  const rejectCall = async () => {
    if (!incomingCallData) return;

    try {
      await axios.post(`${API_BASE_URL}/reject`, {
        callId: incomingCallData.callId,
        receiverId: userId,
      });
      console.log("Call rejected");
      handleCallEnd();
    } catch (error) {
      console.error("Error rejecting call:", error);
      handleCallEnd();
    }
  };

  const cancelCall = async () => {
    if (!callIdRef.current) return;

    try {
      await axios.post(`${API_BASE_URL}/cancel`, {
        callId: callIdRef.current,
        callerId: userId,
      });
      console.log("Call cancelled");
      handleCallEnd();
    } catch (error) {
      console.error("Error cancelling call:", error);
      handleCallEnd();
    }
  };

  const endCall = async () => {
    if (!callIdRef.current) return;

    try {
      await axios.post(`${API_BASE_URL}/end`, {
        callId: callIdRef.current,
        userId: userId,
      });
      console.log("Call ended");
      handleCallEnd();
    } catch (error) {
      console.error("Error ending call:", error);
      handleCallEnd();
    }
  };

  const handleCallEnd = () => {
    stopRingtone();
    stopCallDuration();
    stopAudioStreaming(); // NEW: Stop audio streaming

    if (currentCallRef.current) {
      currentCallRef.current.hangUp().catch(console.error);
      currentCallRef.current = null;
    }

    setIsCallActive(false);
    setIsIncomingCall(false);
    setCallStatus("idle");
    setCallDuration(0);
    setIncomingCallData(null);
    setSubtitles([]);
    setCurrentSubtitle("");
    callIdRef.current = null;
    acsGroupCallIdRef.current = null;
    onCallStateChange?.(false);
  };

  const toggleMute = async () => {
    if (currentCallRef.current) {
      try {
        if (isMuted) {
          await currentCallRef.current.unmute();
        } else {
          await currentCallRef.current.mute();
        }
        setIsMuted(!isMuted);
      } catch (error) {
        console.error("Error toggling mute:", error);
      }
    }
  };

  const fetchCallHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/history/${userId}`);
      if (response.data.success) {
        setCallHistory(response.data.calls);
        setShowHistory(true);
      }
    } catch (error) {
      console.error("Error fetching call history:", error);
    }
  };

  const handleTranslationReady = (participant) => {
    console.log(
      `Translation ready for ${participant}, starting audio streaming...`
    );
    setTimeout(() => {
      startAudioStreaming(participant);
    }, 500);
  };

  console.log("HOPING 0.2");

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Audio Call</h2>
        <button
          onClick={fetchCallHistory}
          className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
        >
          History
        </button>
      </div>

      {/* Incoming Call UI */}
      {isIncomingCall && (
        <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">📞</div>
            <h3 className="text-lg font-semibold mb-1">Incoming Call</h3>
            <p className="text-gray-700 mb-1">{incomingCallData?.callerName}</p>
            <p className="text-sm text-gray-500 mb-4">Audio Call</p>

            {/* Translation toggle for incoming call */}
            <div className="mb-3">
              <label className="flex items-center gap-2 justify-center text-sm">
                <input
                  type="checkbox"
                  checked={translationEnabled}
                  onChange={(e) => setTranslationEnabled(e.target.checked)}
                />
                Enable Translation
              </label>
            </div>

            {translationEnabled && (
              <div className="mb-3">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="">Select Language</option>
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2 justify-center">
              <button
                onClick={acceptCall}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold"
              >
                Accept
              </button>
              <button
                onClick={rejectCall}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call UI */}
      {isCallActive && !isIncomingCall && (
        <div className="mb-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">
              {callStatus === "ringing" ? "📞" : "🎙️"}
            </div>
            <h3 className="text-lg font-semibold mb-1">
              {callStatus === "ringing" ? "Calling..." : "Call in Progress"}
            </h3>
            {callStatus === "connected" && (
              <p className="text-2xl font-mono mb-4">
                {formatDuration(callDuration)}
              </p>
            )}

            {/* NEW: Current Subtitle Display */}
            {currentSubtitle && (
              <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded-lg">
                <p className="text-sm font-semibold">{currentSubtitle}</p>
              </div>
            )}

            <div className="flex gap-2 justify-center mb-2">
              {callStatus === "connected" && (
                <button
                  onClick={toggleMute}
                  className={`px-4 py-2 rounded-full font-semibold ${
                    isMuted
                      ? "bg-red-500 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {isMuted ? "Unmute" : "Mute"}
                </button>
              )}
            </div>
            <button
              onClick={callStatus === "ringing" ? cancelCall : endCall}
              className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold text-lg"
            >
              {callStatus === "ringing" ? "Cancel" : "End Call"}
            </button>
          </div>

          {/* NEW: Subtitle History */}
          {subtitles.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
              <p className="text-xs font-semibold mb-2">Subtitle History:</p>
              {subtitles.map((sub) => (
                <div key={sub.id} className="mb-2 text-xs">
                  <span className="font-semibold">
                    [{sub.speaker === "caller" ? "Them" : "You"}]:
                  </span>{" "}
                  <span>{sub.translated}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Make Call UI */}
      {!isCallActive && !isIncomingCall && !showHistory && (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter User ID to Call
            </label>
            <input
              type="text"
              value={receiverInput}
              onChange={(e) => setReceiverInput(e.target.value)}
              placeholder="Enter receiver user ID"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={translationEnabled}
                onChange={(e) => setTranslationEnabled(e.target.checked)}
              />
              Enable Live Translation
            </label>
          </div>

          {translationEnabled && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select --</option>
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={initiateCall}
            disabled={!receiverInput.trim()}
            className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg font-semibold text-lg"
          >
            Start Audio Call
          </button>
        </div>
      )}

      {/* Call History UI */}
      {showHistory && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Call History</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-blue-500 hover:text-blue-700"
            >
              Close
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {callHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No call history</p>
            ) : (
              callHistory.map((call) => (
                <div
                  key={call.callId}
                  className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        {call.otherUser?.name || "Unknown User"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {call.isOutgoing ? "Outgoing" : "Incoming"} •{" "}
                        <span className="font-semibold">{call.callStatus}</span>
                      </p>
                      {call.duration > 0 && (
                        <p className="text-sm text-gray-500">
                          Duration: {formatDuration(call.duration)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(call.initiatedAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(call.initiatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Status Indicator */}
      <div className="mt-4 text-center text-sm text-gray-500">
        Status: <span className="font-semibold">{callStatus}</span>
        {translationEnabled && (
          <span className="ml-2 text-green-600">| Translation: ON</span>
        )}
      </div>
    </div>
  );
};

export default CallPanel;
