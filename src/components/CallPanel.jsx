// // ----------------------WITHOUT TRANSLATION BELOW:---------------------------------------
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

//   // Refs
//   const socketRef = useRef(null);
//   const callClientRef = useRef(null);
//   const callAgentRef = useRef(null);
//   const currentCallRef = useRef(null);
//   const durationIntervalRef = useRef(null);
//   const callIdRef = useRef(null);
//   const acsGroupCallIdRef = useRef(null);

//   const API_BASE_URL = "http://localhost:4005/api/calls";

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

// //  -----------------------------WITH TRANSLATION BELOW:------------------------------------------
 



import { useEffect, useRef, useState } from "react";
import axios from "axios";
import * as signalR from "@microsoft/signalr";
import { CallClient } from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";

const API_BASE_URL = "http://localhost:4005/api/calls";
const AZURE_SPEECH_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = import.meta.env.VITE_AZURE_SPEECH_REGION;

// Map full locale -> base language for Speech Translation target codes
const toBaseLang = (code) => (code ? code.split("-")[0] : "en");

// Simple default voices per language (customize to your liking)
const defaultVoiceFor = (lang) => {
  const base = toBaseLang(lang);
  switch (base) {
    case "hi":
      return "hi-IN-SwaraNeural";
    case "en":
      // pick US by default; adjust if you prefer en-GB, etc.
      return "en-US-GuyNeural";
    case "es":
      return "es-ES-AlvaroNeural";
    default:
      return `${lang}-Neural`; // fallback (may not exist)
  }
};

export default function CallPanel({ userId, onCallStateChange }) {
  // ------------ UI state ------------
  const [receiverInput, setReceiverInput] = useState("");
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState("idle"); // idle | initiating | ringing | connected
  const [isMuted, setIsMuted] = useState(false);
  const [subtitles, setSubtitles] = useState("");

  // Language controls
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [mySpeakLang, setMySpeakLang] = useState("en-US");
  const [peerSpeakLang, setPeerSpeakLang] = useState("hi-IN");

  // ------------ Refs ------------
  const socketRef = useRef(null);
  const callClientRef = useRef(null);
  const callAgentRef = useRef(null);
  const currentCallRef = useRef(null);
  const callIdRef = useRef(null);
  const otherUserIdRef = useRef(null); // who to send subtitles to
  const acsGroupCallIdRef = useRef(null);
  const speechRecognizerRef = useRef(null);

  // Track remote audio <audio> tags we attach (so we can mute them if translation is enabled)
  const remoteAudioElsRef = useRef(new Set());

  // Prevent spamming partials: throttle & last-sent cache
  const lastPartialSentAtRef = useRef(0);
  const lastPartialTextRef = useRef("");

  // ------------ SignalR setup ------------
  useEffect(() => {
    let stopped = false;

    (async () => {
      try {
        const tokenResponse = await axios.post(`${API_BASE_URL}/signalr/negotiate`, { userId });
        const { url, accessToken } = tokenResponse.data;

        const connection = new signalR.HubConnectionBuilder()
          .withUrl(`${url}/client/?hub=call`, {
            accessTokenFactory: () => accessToken,
          })
          .withAutomaticReconnect()
          .configureLogging(signalR.LogLevel.Information)
          .build();

        // Incoming call
        connection.on("incoming_call", (data) => {
          // data contains: callId, callerId, callerName, acsGroupCallId, translation (enabled, callerSpeakLang)
          if (stopped) return;
          setIncomingCallData(data);
          setIsIncomingCall(true);
          setCallStatus("ringing");

          // If caller enabled translation, auto-select my languages UI defaults
          if (data?.translation?.enabled) {
            setTranslationEnabled(true);
            setPeerSpeakLang(data.translation.callerSpeakLang || peerSpeakLang);
          }
        });

        // Accepted/ended
        connection.on("call_accepted", () => {
          if (stopped) return;
          setCallStatus("connected");
        });
        connection.on("call_ended", () => {
          if (stopped) return;
          handleCallEnd();
        });
        connection.on("call_cancelled", () => {
          if (stopped) return;
          handleCallEnd();
        });
        connection.on("call_missed", () => {
          if (stopped) return;
          handleCallEnd();
        });
        connection.on("call_rejected", () => {
          if (stopped) return;
          handleCallEnd();
        });

        // Translated captions delivered by server (ALREADY translated for me)
        connection.on("translation_caption", (payload) => {
          if (stopped) return;
          // Only show other user's captions
          if (payload?.fromUserId && payload.fromUserId !== userId) {
            const text = String(payload.text || "").trim();
            if (!text) return;

            // Show subtitle
            setSubtitles(text);

            // Speak in MY language (payload is already for me, but voice should match my preference)
            synthesizeToSpeaker(text, mySpeakLang);
          }
        });

        await connection.start();
        socketRef.current = connection;
      } catch (err) {
        console.error("SignalR connection failed:", err);
      }
    })();

    return () => {
      stopped = true;
      socketRef.current?.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, mySpeakLang]);

  // ------------ ACS setup helpers ------------
  const initializeCallClient = async (acsToken) => {
    const callClient = callClientRef.current || new CallClient();
    callClientRef.current = callClient;

    const tokenCredential = new AzureCommunicationTokenCredential(acsToken);
    const callAgent = await callClient.createCallAgent(tokenCredential);
    callAgentRef.current = callAgent;
    return callAgent;
  };

  // Attach remote audio streams and immediately mute them when translation is enabled
  const attachRemoteAudioHandlers = (call) => {
    const handleParticipant = (participant) => {
      // listen for new audio streams
      participant.on("audioStreamsUpdated", (e) => {
        e.added?.forEach(async (stream) => {
          try {
            // Some SDK versions expose audio streams that we can attach to an <audio>
            // Guard with feature detection:
            if (stream?.isAvailable !== undefined) {
              // Newer SDKs may need to call stream.getMediaStream() to obtain MediaStream
              const mediaStream = await stream.getMediaStream?.();
              if (mediaStream) {
                const audio = new Audio();
                audio.srcObject = mediaStream;
                audio.autoplay = true;
                // Suppress raw voice if translation is enabled
                audio.muted = !!translationEnabled;
                audio.volume = translationEnabled ? 0 : 1;
                audio.play().catch(() => { /* autoplay policy */ });
                remoteAudioElsRef.current.add(audio);
              }
            }
          } catch (err) {
            // In some versions, ACS auto-plays remote audio without manual attachment.
            // We'll handle muting via a best-effort feature flag below.
          }
        });
      });
    };

    // initial participants
    call.remoteParticipants?.forEach(handleParticipant);

    // new participants
    call.on("remoteParticipantsUpdated", (e) => {
      e.added?.forEach(handleParticipant);
    });

    // As a fallback, try the (undocumented) remote audio feature mute if available:
    try {
      const Features = call?.features;
      // Some SDKs expose a remote audio feature; if present, try muting it.
      // (This block is defensive; if not present, it won’t throw.)
      const remoteAudioFeature = Features?.remoteAudio;
      if (remoteAudioFeature?.setMuted) {
        remoteAudioFeature.setMuted(!!translationEnabled);
      }
    } catch {
      // ignore
    }
  };

  // Whenever the translationEnabled flag changes, (best-effort) mute/unmute remote raw audio
  useEffect(() => {
    // Adjust <audio> elements we created
    remoteAudioElsRef.current.forEach((el) => {
      el.muted = !!translationEnabled;
      el.volume = translationEnabled ? 0 : 1;
    });

    // Try feature mute again in case it exists
    try {
      const call = currentCallRef.current;
      if (call?.features?.remoteAudio?.setMuted) {
        call.features.remoteAudio.setMuted(!!translationEnabled);
      }
    } catch {
      // ignore
    }
  }, [translationEnabled]);

  // ------------ Speech: TTS ------------
  const synthesizeToSpeaker = (text, inLang) => {
    if (!text) return;
    try {
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
        AZURE_SPEECH_KEY,
        AZURE_SPEECH_REGION
      );
      speechConfig.speechSynthesisLanguage = inLang;
      speechConfig.speechSynthesisVoiceName = defaultVoiceFor(inLang);

      const player = new SpeechSDK.SpeakerAudioDestination();
      const audioConfig = SpeechSDK.AudioConfig.fromSpeakerOutput(player);
      const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);

      synthesizer.speakTextAsync(
        text,
        () => synthesizer.close(),
        (err) => {
          console.error("TTS error:", err);
          synthesizer.close();
        }
      );
    } catch (e) {
      console.error("TTS init error:", e);
    }
  };

  // ------------ Speech: Translation (client mic -> text -> translated text -> POST /subtitle) ------------
  const startSpeechTranslation = async (callId, toUserId) => {
    if (!translationEnabled) return;

    const translationConfig =
      SpeechSDK.SpeechTranslationConfig.fromSubscription(
        AZURE_SPEECH_KEY,
        AZURE_SPEECH_REGION
      );

    // Speech recognition language (the language I speak)
    translationConfig.speechRecognitionLanguage = mySpeakLang;

    // Target translation language (what the peer should hear/see)
    const targetBase = toBaseLang(peerSpeakLang);
    translationConfig.addTargetLanguage(targetBase);

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechSDK.TranslationRecognizer(translationConfig, audioConfig);
    speechRecognizerRef.current = recognizer;

    const safePostSubtitle = async ({ text, partial }) => {
      const trimmed = String(text || "").trim();
      if (!trimmed) return; // avoid 400
      if (!callId || !userId || !toUserId) return; // avoid 400

      try {
        await axios.post(`${API_BASE_URL}/subtitle`, {
          callId,
          fromUserId: userId,
          toUserId,
          text: trimmed,
          partial: !!partial,
        });
      } catch (e) {
        // Don’t crash the pipeline on subtitle errors; just log.
        console.warn("Subtitle POST failed:", e?.response?.data || e.message);
      }
    };

    // Partial (low-latency) – throttle to ~6/s and avoid resending identical text
    recognizer.recognizing = async (_s, e) => {
      const trans = e?.result?.translations?.get(targetBase) || "";
      const now = performance.now();
      if (!trans || trans === lastPartialTextRef.current) return;
      if (now - lastPartialSentAtRef.current < 160) return; // throttle ~6/s

      lastPartialTextRef.current = trans;
      lastPartialSentAtRef.current = now;

      await safePostSubtitle({ text: trans, partial: true });
    };

    // Final (punctuated)
    recognizer.recognized = async (_s, e) => {
      const reason = e?.result?.reason;
      if (reason === SpeechSDK.ResultReason.TranslatedSpeech) {
        const trans = e?.result?.translations?.get(targetBase) || "";
        await safePostSubtitle({ text: trans, partial: false });
      }
    };

    recognizer.canceled = (_s, e) => {
      console.warn("Translation canceled:", e);
    };
    recognizer.sessionStopped = () => {
      // console.log("Translation session stopped");
    };

    recognizer.startContinuousRecognitionAsync(
      () => {
        // console.log("Translation recognizer started");
      },
      (err) => {
        console.error("Translation recognizer start error:", err);
      }
    );
  };

  const stopSpeechTranslation = () => {
    try {
      const r = speechRecognizerRef.current;
      if (r) {
        r.stopContinuousRecognitionAsync(
          () => r.close(),
          () => r.close()
        );
        speechRecognizerRef.current = null;
      }
    } catch {
      // ignore
    }
  };

  // ------------ Call flows ------------
  const initiateCall = async () => {
    if (!receiverInput.trim()) {
      alert("Please enter receiver ID");
      return;
    }

    try {
      setCallStatus("initiating");

      const resp = await axios.post(`${API_BASE_URL}/initiate`, {
        callerId: userId,
        receiverId: receiverInput.trim(),
        callType: "audio",
        translationEnabled,
        callerSpeakLang: mySpeakLang,
      });

      if (!resp.data?.success) throw new Error(resp.data?.message || "initiate failed");

      const { callId, acsGroupCallId, acsToken, translation } = resp.data;
      callIdRef.current = callId;
      acsGroupCallIdRef.current = acsGroupCallId;

      // who will receive my subtitles
      otherUserIdRef.current = receiverInput.trim();

      // Prepare ACS
      const agent = await initializeCallClient(acsToken);
      const call = agent.join({ groupId: acsGroupCallId });
      currentCallRef.current = call;

      // If translation enabled, mute my raw mic audio immediately
      if (translationEnabled) {
        try {
          await call.mute();
          setIsMuted(true);
        } catch {}
      }

      // Attach remote audio handlers and suppress raw audio if translation is enabled
      attachRemoteAudioHandlers(call);

      // Track state for “connected”
      call.on("stateChanged", () => {
        if (call.state === "Connected") {
          setCallStatus("connected");
        }
      });

      // Start my translation stream -> server subtitles for the other user
      await startSpeechTranslation(callId, otherUserIdRef.current);

      setIsCallActive(true);
      onCallStateChange?.(true);
    } catch (e) {
      console.error("Initiate call error:", e?.response?.data || e.message);
      alert(e?.response?.data?.message || e.message);
      handleCallEnd();
    }
  };

  const acceptCall = async () => {
    if (!incomingCallData) return;
    try {
      const { callId, callerId, acsGroupCallId } = incomingCallData;

      const resp = await axios.post(`${API_BASE_URL}/accept`, {
        callId,
        receiverId: userId,
        receiverSpeakLang: mySpeakLang,
      });
      if (!resp.data?.success) throw new Error(resp.data?.message || "accept failed");

      const { acsToken } = resp.data;

      callIdRef.current = callId;
      acsGroupCallIdRef.current = acsGroupCallId;
      otherUserIdRef.current = callerId; // send my subtitles to the caller

      setIsIncomingCall(false);
      setIsCallActive(true);
      setCallStatus("connected");
      onCallStateChange?.(true);

      const agent = await initializeCallClient(acsToken);
      const call = agent.join({ groupId: acsGroupCallId });
      currentCallRef.current = call;

      if (translationEnabled) {
        try {
          await call.mute();
          setIsMuted(true);
        } catch {}
      }

      attachRemoteAudioHandlers(call);

      call.on("stateChanged", () => {
        if (call.state === "Connected") {
          setCallStatus("connected");
        }
      });

      await startSpeechTranslation(callId, otherUserIdRef.current);
    } catch (e) {
      console.error("Accept call error:", e?.response?.data || e.message);
      alert(e?.response?.data?.message || e.message);
      handleCallEnd();
    }
  };

  const rejectCall = async () => {
    try {
      if (incomingCallData?.callId) {
        await axios.post(`${API_BASE_URL}/reject`, {
          callId: incomingCallData.callId,
          receiverId: userId,
        });
      }
    } catch {}
    handleCallEnd();
  };

  const cancelCall = async () => {
    try {
      if (callIdRef.current) {
        await axios.post(`${API_BASE_URL}/cancel`, {
          callId: callIdRef.current,
          callerId: userId,
        });
      }
    } catch {}
    handleCallEnd();
  };

  const endCall = async () => {
    try {
      if (callIdRef.current) {
        await axios.post(`${API_BASE_URL}/end`, {
          callId: callIdRef.current,
          userId,
        });
      }
    } catch {}
    handleCallEnd();
  };

  const handleCallEnd = () => {
    // stop recognition
    stopSpeechTranslation();

    // hang up ACS
    try {
      currentCallRef.current?.hangUp();
    } catch {}

    // clear UI
    setIsIncomingCall(false);
    setIsCallActive(false);
    setCallStatus("idle");
    setIsMuted(false);
    setSubtitles("");

    // cleanup refs
    currentCallRef.current = null;
    callIdRef.current = null;
    otherUserIdRef.current = null;
    acsGroupCallIdRef.current = null;

    // clear remote audio elements
    remoteAudioElsRef.current.forEach((el) => {
      try {
        el.pause();
        el.srcObject = null;
      } catch {}
    });
    remoteAudioElsRef.current.clear();

    onCallStateChange?.(false);
  };

  // ------------ UI ------------
  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">📞 Audio Call (Translated)</h2>
      </div>

      {/* Incoming Call */}
      {isIncomingCall && (
        <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">📞</div>
            <h3 className="text-lg font-semibold mb-1">Incoming Call</h3>
            <p className="text-gray-700 mb-1">{incomingCallData?.callerName || "Unknown"}</p>
            <p className="text-sm text-gray-500 mb-4">Audio Call</p>

            {/* My language selection before accepting */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-left">
              <div>
                <label className="block text-xs text-gray-600 mb-1">My Speak Language</label>
                <select
                  value={mySpeakLang}
                  onChange={(e) => setMySpeakLang(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="en-US">English (US)</option>
                  <option value="hi-IN">Hindi (IN)</option>
                  <option value="es-ES">Spanish (ES)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Peer Speak Language</label>
                <select
                  value={peerSpeakLang}
                  onChange={(e) => setPeerSpeakLang(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="en-US">English (US)</option>
                  <option value="hi-IN">Hindi (IN)</option>
                  <option value="es-ES">Spanish (ES)</option>
                </select>
              </div>
              <div className="col-span-2 flex items-center">
                <input
                  id="enableTranslationIncoming"
                  type="checkbox"
                  className="mr-2"
                  checked={translationEnabled}
                  onChange={() => setTranslationEnabled((v) => !v)}
                />
                <label htmlFor="enableTranslationIncoming" className="text-sm">
                  Enable Translation (mutes raw voice)
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <button
                onClick={acceptCall}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold"
              >
                ✓ Accept
              </button>
              <button
                onClick={rejectCall}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold"
              >
                ✕ Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call */}
      {isCallActive && !isIncomingCall && (
        <div className="mb-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">{callStatus === "ringing" ? "📞" : "🎙️"}</div>
            <h3 className="text-lg font-semibold mb-1">
              {callStatus === "connected" ? "Call in Progress" : callStatus}
            </h3>

            {/* Controls */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="flex items-center col-span-2 justify-center">
                <input
                  id="enableTranslationActive"
                  type="checkbox"
                  className="mr-2"
                  checked={translationEnabled}
                  onChange={() => setTranslationEnabled((v) => !v)}
                />
                <label htmlFor="enableTranslationActive" className="text-sm">
                  Translation Enabled (raw voice muted)
                </label>
              </div>

              <div className="text-left">
                <label className="block text-xs text-gray-600 mb-1">My Speak Language</label>
                <select
                  value={mySpeakLang}
                  onChange={(e) => setMySpeakLang(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="en-US">English (US)</option>
                  <option value="hi-IN">Hindi (IN)</option>
                  <option value="es-ES">Spanish (ES)</option>
                </select>
              </div>
              <div className="text-left">
                <label className="block text-xs text-gray-600 mb-1">Peer Speak Language</label>
                <select
                  value={peerSpeakLang}
                  onChange={(e) => setPeerSpeakLang(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="en-US">English (US)</option>
                  <option value="hi-IN">Hindi (IN)</option>
                  <option value="es-ES">Spanish (ES)</option>
                </select>
              </div>
            </div>

            {/* Subtitles (only other's) */}
            {subtitles && (
              <p className="mt-4 text-xl italic bg-white border rounded p-3">
                {subtitles}
              </p>
            )}

            <div className="flex gap-2 justify-center mt-4">
              <button
                onClick={async () => {
                  try {
                    if (currentCallRef.current) {
                      if (isMuted) {
                        await currentCallRef.current.unmute();
                      } else {
                        await currentCallRef.current.mute();
                      }
                      setIsMuted(!isMuted);
                    }
                  } catch (e) {
                    console.error("Toggle mute error:", e);
                  }
                }}
                className={`px-4 py-2 rounded-full font-semibold ${
                  isMuted ? "bg-red-500 text-white" : "bg-gray-200 text-gray-800"
                }`}
              >
                {isMuted ? "🔇 Unmute (raw)" : "🔊 Mute (raw)"}
              </button>

              <button
                onClick={callStatus === "ringing" ? cancelCall : endCall}
                className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold text-lg"
              >
                📴 {callStatus === "ringing" ? "Cancel" : "End Call"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Place Outgoing */}
      {!isCallActive && !isIncomingCall && (
        <div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter User ID to Call
            </label>
            <input
              type="text"
              value={receiverInput}
              onChange={(e) => setReceiverInput(e.target.value)}
              placeholder="Receiver user ID"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">My Speak Language</label>
              <select
                value={mySpeakLang}
                onChange={(e) => setMySpeakLang(e.target.value)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="en-US">English (US)</option>
                <option value="hi-IN">Hindi (IN)</option>
                <option value="es-ES">Spanish (ES)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Peer Speak Language</label>
              <select
                value={peerSpeakLang}
                onChange={(e) => setPeerSpeakLang(e.target.value)}
                className="w-full border rounded px-2 py-1"
              >
                <option value="en-US">English (US)</option>
                <option value="hi-IN">Hindi (IN)</option>
                <option value="es-ES">Spanish (ES)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center mb-4">
            <input
              id="enableTranslationOutgoing"
              type="checkbox"
              checked={translationEnabled}
              onChange={() => setTranslationEnabled((v) => !v)}
              className="mr-2"
            />
            <label htmlFor="enableTranslationOutgoing" className="text-sm">
              Enable Translation (mutes raw voice)
            </label>
          </div>

          <button
            onClick={initiateCall}
            disabled={!receiverInput.trim()}
            className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg font-semibold text-lg"
          >
            📞 Start Audio Call
          </button>
        </div>
      )}

      {/* Footer Status */}
      <div className="mt-4 text-center text-sm text-gray-500">
        Status: <span className="font-semibold">{callStatus}</span>
      </div>
    </div>
  );
}
