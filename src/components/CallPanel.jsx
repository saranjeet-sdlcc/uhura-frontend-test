// import { useState, useEffect, useRef } from 'react';
// import axios from 'axios';
// import * as signalR from '@microsoft/signalr';
// import { CallClient } from '@azure/communication-calling';
// import { AzureCommunicationTokenCredential } from '@azure/communication-common';

// const CallPanel = ({ jwt, userId, onCallStateChange }) => {
//   // State management
//   const [isCallActive, setIsCallActive] = useState(false);
//   const [isIncomingCall, setIsIncomingCall] = useState(false);
//   const [callStatus, setCallStatus] = useState('idle'); // idle, initiating, ringing, connected, ended
//   const [currentCall, setCurrentCall] = useState(null);
//   const [callDuration, setCallDuration] = useState(0);
//   const [receiverInput, setReceiverInput] = useState('');
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

//   const API_BASE_URL = 'http://localhost:4005/api/calls';
//   const SOCKET_URL = 'http://localhost:4005';

//   // Initialize socket connection
//   // useEffect(() => {
//   //   socketRef.current = io(SOCKET_URL, {
//   //     transports: ['websocket'],
//   //     reconnection: true,
//   //   });

//   //   socketRef.current.on('connect', () => {
//   //     console.log('✅ Socket connected');
//   //     socketRef.current.emit('user_connected', userId);
//   //   });

//   //   // Listen for incoming call
//   //   socketRef.current.on('incoming_call', async (data) => {
//   //     console.log('📞 Incoming call:', data);
//   //     setIncomingCallData(data);
//   //     setIsIncomingCall(true);
//   //     setCallStatus('ringing');
//   //     playRingtone();
//   //   });

//   //   // Listen for call accepted
//   //   socketRef.current.on('call_accepted', (data) => {
//   //     console.log('✅ Call accepted:', data);
//   //     setCallStatus('connected');
//   //     stopRingtone();
//   //     startCallDuration();
//   //   });

//   //   // Listen for call rejected
//   //   socketRef.current.on('call_rejected', (data) => {
//   //     console.log('❌ Call rejected:', data);
//   //     handleCallEnd();
//   //   });

//   //   // Listen for call cancelled
//   //   socketRef.current.on('call_cancelled', (data) => {
//   //     console.log('🚫 Call cancelled:', data);
//   //     handleCallEnd();
//   //   });

//   //   // Listen for call ended
//   //   socketRef.current.on('call_ended', (data) => {
//   //     console.log('📴 Call ended:', data);
//   //     handleCallEnd();
//   //   });

//   //   // Listen for call missed
//   //   socketRef.current.on('call_missed', (data) => {
//   //     console.log('📵 Call missed:', data);
//   //     handleCallEnd();
//   //   });

//   //   return () => {
//   //     if (socketRef.current) {
//   //       socketRef.current.disconnect();
//   //     }
//   //     if (durationIntervalRef.current) {
//   //       clearInterval(durationIntervalRef.current);
//   //     }
//   //   };
//   // }, [userId]);

//   // Replace the Socket.IO connection with SignalR
// useEffect(() => {
//   const connectSignalR = async () => {
//     try {
//       // Get SignalR token from backend
//       const tokenResponse = await axios.post(`${API_BASE_URL}/signalr/negotiate`, {
//         userId: userId,
//       });

//       const { url, accessToken } = tokenResponse.data;

//       // Create SignalR connection
//       const connection = new signalR.HubConnectionBuilder()
//         .withUrl(`${url}/client/?hub=call`, {
//           accessTokenFactory: () => accessToken,
//         })
//         .withAutomaticReconnect()
//         .configureLogging(signalR.LogLevel.Information)
//         .build();

//       // Register event handlers
//       connection.on('incoming_call', async (data) => {
//         console.log('📞 Incoming call:', data);
//         setIncomingCallData(data);
//         setIsIncomingCall(true);
//         setCallStatus('ringing');
//         playRingtone();
//       });

//       connection.on('call_accepted', (data) => {
//         console.log('✅ Call accepted:', data);
//         setCallStatus('connected');
//         stopRingtone();
//         startCallDuration();
//       });

//       connection.on('call_rejected', (data) => {
//         console.log('❌ Call rejected:', data);
//         handleCallEnd();
//       });

//       connection.on('call_cancelled', (data) => {
//         console.log('🚫 Call cancelled:', data);
//         handleCallEnd();
//       });

//       connection.on('call_ended', (data) => {
//         console.log('📴 Call ended:', data);
//         handleCallEnd();
//       });

//       connection.on('call_missed', (data) => {
//         console.log('📵 Call missed:', data);
//         handleCallEnd();
//       });

//       // Start connection
//       await connection.start();
//       console.log('✅ SignalR Connected');
//       socketRef.current = connection;

//     } catch (error) {
//       console.error('❌ SignalR Connection Error:', error);
//     }
//   };

//   connectSignalR();

//   return () => {
//     if (socketRef.current) {
//       socketRef.current.stop();
//     }
//     if (durationIntervalRef.current) {
//       clearInterval(durationIntervalRef.current);
//     }
//   };
// }, [userId]);



//   // Initialize Azure Communication Services Call Client
//   const initializeCallClient = async (acsToken) => {
//     try {
//       if (!callClientRef.current) {
//         callClientRef.current = new CallClient();
//       }

//       const tokenCredential = new AzureCommunicationTokenCredential(acsToken);
//       callAgentRef.current = await callClientRef.current.createCallAgent(tokenCredential);

//       console.log('✅ Call agent created');
//       return callAgentRef.current;
//     } catch (error) {
//       console.error('❌ Error initializing call client:', error);
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
//     return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
//   };

//   // Play ringtone (simple implementation)
//   const playRingtone = () => {
//     // You can add actual audio element here
//     console.log('🔔 Playing ringtone...');
//   };

//   // Stop ringtone
//   const stopRingtone = () => {
//     console.log('🔕 Stopping ringtone...');
//   };

//   // Initiate outgoing call
//   const initiateCall = async () => {
//     if (!receiverInput.trim()) {
//       alert('Please enter receiver ID');
//       return;
//     }

//     try {
//       setCallStatus('initiating');
//       const response = await axios.post(`${API_BASE_URL}/initiate`, {
//         callerId: userId,
//         receiverId: receiverInput.trim(),
//         callType: 'audio',
//       });

//       if (response.data.success) {
//         const { callId, acsGroupCallId, acsToken, receiver } = response.data;
//         callIdRef.current = callId;
//         acsGroupCallIdRef.current = acsGroupCallId;

//         console.log('📞 Call initiated:', response.data);
//         setCallStatus('ringing');
//         setIsCallActive(true);
//         onCallStateChange?.(true);

//         // Initialize ACS and join call
//         const callAgent = await initializeCallClient(acsToken);
//         const call = callAgent.join({ groupId: acsGroupCallId });
//         currentCallRef.current = call;

//         // Listen for call state changes
//         call.on('stateChanged', () => {
//           console.log('Call state:', call.state);
//           if (call.state === 'Connected') {
//             setCallStatus('connected');
//             startCallDuration();
//           }
//         });

//         playRingtone();
//       }
//     } catch (error) {
//       console.error('❌ Error initiating call:', error);
//       alert('Failed to initiate call: ' + (error.response?.data?.message || error.message));
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
//         setCallStatus('connected');
//         stopRingtone();
//         onCallStateChange?.(true);

//         // Initialize ACS and join call
//         const callAgent = await initializeCallClient(acsToken);
//         const call = callAgent.join({ groupId: acsGroupCallId });
//         currentCallRef.current = call;

//         // Listen for call state changes
//         call.on('stateChanged', () => {
//           console.log('Call state:', call.state);
//           if (call.state === 'Connected') {
//             startCallDuration();
//           }
//         });

//         console.log('✅ Call accepted');
//       }
//     } catch (error) {
//       console.error('❌ Error accepting call:', error);
//       alert('Failed to accept call: ' + (error.response?.data?.message || error.message));
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
//       console.log('❌ Call rejected');
//       handleCallEnd();
//     } catch (error) {
//       console.error('❌ Error rejecting call:', error);
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
//       console.log('🚫 Call cancelled');
//       handleCallEnd();
//     } catch (error) {
//       console.error('❌ Error cancelling call:', error);
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
//       console.log('📴 Call ended');
//       handleCallEnd();
//     } catch (error) {
//       console.error('❌ Error ending call:', error);
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
//     setCallStatus('idle');
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
//         console.error('Error toggling mute:', error);
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
//       console.error('❌ Error fetching call history:', error);
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
//               {callStatus === 'ringing' ? '📞' : '🎙️'}
//             </div>
//             <h3 className="text-lg font-semibold mb-1">
//               {callStatus === 'ringing' ? 'Calling...' : 'Call in Progress'}
//             </h3>
//             {callStatus === 'connected' && (
//               <p className="text-2xl font-mono mb-4">{formatDuration(callDuration)}</p>
//             )}
//             <div className="flex gap-2 justify-center mb-2">
//               {callStatus === 'connected' && (
//                 <button
//                   onClick={toggleMute}
//                   className={`px-4 py-2 rounded-full font-semibold ${
//                     isMuted ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-800'
//                   }`}
//                 >
//                   {isMuted ? '🔇 Unmute' : '🔊 Mute'}
//                 </button>
//               )}
//             </div>
//             <button
//               onClick={callStatus === 'ringing' ? cancelCall : endCall}
//               className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold text-lg"
//             >
//               📴 {callStatus === 'ringing' ? 'Cancel' : 'End Call'}
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
//                         {call.otherUser?.name || 'Unknown User'}
//                       </p>
//                       <p className="text-sm text-gray-600">
//                         {call.isOutgoing ? '↗️ Outgoing' : '↙️ Incoming'} •{' '}
//                         <span
//                           className={`font-semibold ${
//                             call.callStatus === 'accepted'
//                               ? 'text-green-600'
//                               : call.callStatus === 'missed'
//                               ? 'text-orange-600'
//                               : call.callStatus === 'rejected'
//                               ? 'text-red-600'
//                               : 'text-gray-600'
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










import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as signalR from '@microsoft/signalr';
import { CallClient } from '@azure/communication-calling';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';

const CallPanel = ({ jwt, userId, onCallStateChange }) => {
  // State management
  const [isCallActive, setIsCallActive] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callStatus, setCallStatus] = useState('idle');
  const [currentCall, setCurrentCall] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [receiverInput, setReceiverInput] = useState('');
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const [incomingCallLanguage, setIncomingCallLanguage] = useState('en-US');


  // Translation states
  const [translationEnabled, setTranslationEnabled] = useState(false);
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [myLanguage, setMyLanguage] = useState('en-US');
  // const [receiverLanguage, setReceiverLanguage] = useState('en-US');
  const [subtitles, setSubtitles] = useState([]);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  

  // Refs
  const socketRef = useRef(null);
  const callClientRef = useRef(null);
  const callAgentRef = useRef(null);
  const currentCallRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const callIdRef = useRef(null);
  const acsGroupCallIdRef = useRef(null);
  const audioStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);

  const API_BASE_URL = 'http://localhost:4005/api/calls';
  const TRANSLATION_API = 'http://localhost:4005/api/translation';
  const AUDIO_STREAM_URL = 'ws://localhost:4005/audio-stream';

  // Fetch supported languages on mount
  useEffect(() => {
    fetchSupportedLanguages();
  }, []);

  // Fetch supported languages
  const fetchSupportedLanguages = async () => {
    try {
      const response = await axios.get(`${TRANSLATION_API}/languages`);
      if (response.data.success) {
        setSupportedLanguages(response.data.languages);
      }
    } catch (error) {
      console.error('❌ Error fetching languages:', error);
    }
  };

  // Initialize SignalR connection
  useEffect(() => {
    const connectSignalR = async () => {
      try {
        const tokenResponse = await axios.post(`${API_BASE_URL}/signalr/negotiate`, {
          userId: userId,
        });

        const { url, accessToken } = tokenResponse.data;

        const connection = new signalR.HubConnectionBuilder()
          .withUrl(`${url}/client/?hub=call`, {
            accessTokenFactory: () => accessToken,
          })
          .withAutomaticReconnect()
          .configureLogging(signalR.LogLevel.Information)
          .build();

        // Register event handlers
        connection.on('incoming_call', async (data) => {
          console.log('📞 Incoming call:', data);
          setIncomingCallData(data);
          setIsIncomingCall(true);
          setCallStatus('ringing');
          playRingtone();
        });

        connection.on('call_accepted', (data) => {
          console.log('✅ Call accepted:', data);
          setCallStatus('connected');
          stopRingtone();
          startCallDuration();

          // Start audio streaming if translation is enabled
          if (data.translationEnabled) {
            startAudioStreaming();
          }
        });

        connection.on('call_rejected', (data) => {
          console.log('❌ Call rejected:', data);
          handleCallEnd();
        });

        connection.on('call_cancelled', (data) => {
          console.log('🚫 Call cancelled:', data);
          handleCallEnd();
        });

        connection.on('call_ended', (data) => {
          console.log('📴 Call ended:', data);
          handleCallEnd();
        });

        connection.on('call_missed', (data) => {
          console.log('📵 Call missed:', data);
          handleCallEnd();
        });

        // Translation events
        connection.on('translation_audio', (data) => {
          console.log('🔊 Received translated audio:', data);
          playTranslatedAudio(data.audio);
        });

        connection.on('translation_subtitle', (data) => {
          console.log('📝 Received subtitle:', data);
          addSubtitle(data.subtitle, data.originalText, data.fromUser);
        });

        connection.on('transcription', (data) => {
          console.log('🗣️ Transcription:', data);
          // Show what you're saying in your own language
          addSubtitle(data.text, null, 'me', true);
        });

        await connection.start();
        console.log('✅ SignalR Connected');
        socketRef.current = connection;
      } catch (error) {
        console.error('❌ SignalR Connection Error:', error);
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
      callAgentRef.current = await callClientRef.current.createCallAgent(tokenCredential);

      console.log('✅ Call agent created');
      return callAgentRef.current;
    } catch (error) {
      console.error('❌ Error initializing call client:', error);
      throw error;
    }
  };

  // Start audio streaming for translation
  const startAudioStreaming = async () => {
    try {
      console.log('🎙️ Starting audio streaming...');

      // Connect to WebSocket for audio streaming
      audioStreamRef.current = new WebSocket(AUDIO_STREAM_URL);

      audioStreamRef.current.onopen = () => {
        console.log('✅ Audio stream WebSocket connected');
        
        // Initialize the stream
        audioStreamRef.current.send(
          JSON.stringify({
            type: 'init',
            callId: callIdRef.current,
            userId: userId,
          })
        );
      };

      audioStreamRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'ready') {
          console.log('✅ Audio stream ready');
          startCapturingAudio();
        }
      };

      audioStreamRef.current.onerror = (error) => {
        console.error('❌ Audio stream error:', error);
      };

      audioStreamRef.current.onclose = () => {
        console.log('🔌 Audio stream closed');
      };
    } catch (error) {
      console.error('❌ Error starting audio stream:', error);
    }
  };

  // Start capturing audio from microphone
const startCapturingAudio = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        sampleRate: 16000,  // Azure requires 16kHz
        channelCount: 1,     // Mono
        echoCancellation: true,
        noiseSuppression: true,
      } 
    });
    
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000
    });
    
    const source = audioContextRef.current.createMediaStreamSource(stream);
    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContextRef.current.destination);

    processor.onaudioprocess = (e) => {
      if (audioStreamRef.current && audioStreamRef.current.readyState === WebSocket.OPEN) {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert to 16-bit PCM WAV format
        const wavBuffer = convertToWav(inputData, 16000);
        const base64Audio = arrayBufferToBase64(wavBuffer);

        audioStreamRef.current.send(
          JSON.stringify({
            type: 'audio',
            audio: base64Audio,
          })
        );
      }
    };

    console.log('Audio capture started');
  } catch (error) {
    console.error('Error capturing audio:', error);
  }
};




// Add this function to convert to WAV format
const convertToWav = (audioData, sampleRate) => {
  const buffer = new ArrayBuffer(44 + audioData.length * 2);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + audioData.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, audioData.length * 2, true);

  // Convert float to 16-bit PCM
  const volume = 0x7FFF;
  let index = 44;
  for (let i = 0; i < audioData.length; i++) {
    view.setInt16(index, audioData[i] * volume, true);
    index += 2;
  }

  return buffer;
};



  // Stop audio streaming
  const stopAudioStreaming = () => {
    if (audioStreamRef.current) {
      audioStreamRef.current.close();
      audioStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  };

  // Play translated audio
  const playTranslatedAudio = (base64Audio) => {
    try {
      const audioData = atob(base64Audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      const blob = new Blob([arrayBuffer], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      audio.play().catch((error) => {
        console.error('Error playing audio:', error);
      });

      audio.onended = () => {
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error('❌ Error playing translated audio:', error);
    }
  };

  // Add subtitle to display
  const addSubtitle = (text, originalText, fromUser, isMyTranscription = false) => {
    const subtitle = {
      id: Date.now(),
      text,
      originalText,
      fromUser,
      isMyTranscription,
      timestamp: new Date(),
    };

    setSubtitles((prev) => {
      const updated = [...prev, subtitle];
      // Keep only last 5 subtitles
      return updated.slice(-5);
    });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setSubtitles((prev) => prev.filter((s) => s.id !== subtitle.id));
    }, 5000);
  };

  // Convert Float32Array to Int16Array
  const convertFloat32ToInt16 = (float32Array) => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array.buffer;
  };

  // Convert ArrayBuffer to Base64
  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Start call duration timer
  const startCallDuration = () => {
    durationIntervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  // Stop call duration timer
  const stopCallDuration = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Play ringtone
  const playRingtone = () => {
    console.log('🔔 Playing ringtone...');
  };

  // Stop ringtone
  const stopRingtone = () => {
    console.log('🔕 Stopping ringtone...');
  };

  // Initiate outgoing call
  const initiateCall = async () => {
    if (!receiverInput.trim()) {
      alert('Please enter receiver ID');
      return;
    }

    try {
      setCallStatus('initiating');
      const response = await axios.post(`${API_BASE_URL}/initiate`, {
        callerId: userId,
        receiverId: receiverInput.trim(),
        callType: 'audio',
        translationEnabled: translationEnabled,
        callerLanguage: myLanguage,
        // receiverLanguage: receiverLanguage,
      });

      if (response.data.success) {
        const { callId, acsGroupCallId, acsToken, receiver, translationEnabled: isTranslationEnabled } = response.data;
        callIdRef.current = callId;
        acsGroupCallIdRef.current = acsGroupCallId;

        console.log('📞 Call initiated:', response.data);
        setCallStatus('ringing');
        setIsCallActive(true);
        onCallStateChange?.(true);

        // Initialize ACS and join call
        const callAgent = await initializeCallClient(acsToken);
        const call = callAgent.join({ groupId: acsGroupCallId });
        currentCallRef.current = call;

        // Listen for call state changes
        call.on('stateChanged', () => {
          console.log('Call state:', call.state);
          if (call.state === 'Connected') {
            setCallStatus('connected');
            startCallDuration();
            
            // Start audio streaming if translation is enabled
            if (isTranslationEnabled) {
              startAudioStreaming();
            }
          }
        });

        playRingtone();
      }
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      alert('Failed to initiate call: ' + (error.response?.data?.message || error.message));
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
      receiverLanguage: incomingCallData.translationEnabled ? incomingCallLanguage : 'en-US',
    });

    if (response.data.success) {
      const { acsToken, acsGroupCallId, translationEnabled } = response.data;
      callIdRef.current = incomingCallData.callId;
      acsGroupCallIdRef.current = acsGroupCallId;

      setIsIncomingCall(false);
      setIsCallActive(true);
      setCallStatus('connected');
      stopRingtone();
      onCallStateChange?.(true);

      // Initialize ACS and join call
      const callAgent = await initializeCallClient(acsToken);
      const call = callAgent.join({ groupId: acsGroupCallId });
      currentCallRef.current = call;

      call.on('stateChanged', () => {
        console.log('Call state:', call.state);
        if (call.state === 'Connected') {
          startCallDuration();
          
          if (translationEnabled) {
            startAudioStreaming();
          }
        }
      });

      console.log('Call accepted');
    }
  } catch (error) {
    console.error('Error accepting call:', error);
    alert('Failed to accept call: ' + (error.response?.data?.message || error.message));
    handleCallEnd();
  }
};

  // Reject incoming call
  const rejectCall = async () => {
    if (!incomingCallData) return;

    try {
      await axios.post(`${API_BASE_URL}/reject`, {
        callId: incomingCallData.callId,
        receiverId: userId,
      });
      console.log('❌ Call rejected');
      handleCallEnd();
    } catch (error) {
      console.error('❌ Error rejecting call:', error);
      handleCallEnd();
    }
  };

  // Cancel outgoing call
  const cancelCall = async () => {
    if (!callIdRef.current) return;

    try {
      await axios.post(`${API_BASE_URL}/cancel`, {
        callId: callIdRef.current,
        callerId: userId,
      });
      console.log('🚫 Call cancelled');
      handleCallEnd();
    } catch (error) {
      console.error('❌ Error cancelling call:', error);
      handleCallEnd();
    }
  };

  // End active call
  const endCall = async () => {
    if (!callIdRef.current) return;

    try {
      await axios.post(`${API_BASE_URL}/end`, {
        callId: callIdRef.current,
        userId: userId,
      });
      console.log('📴 Call ended');
      handleCallEnd();
    } catch (error) {
      console.error('❌ Error ending call:', error);
      handleCallEnd();
    }
  };

  // Handle call end cleanup
  const handleCallEnd = () => {
    stopRingtone();
    stopCallDuration();
    stopAudioStreaming();

    // Hang up ACS call
    if (currentCallRef.current) {
      currentCallRef.current.hangUp().catch(console.error);
      currentCallRef.current = null;
    }

    setIsCallActive(false);
    setIsIncomingCall(false);
    setCallStatus('idle');
    setCallDuration(0);
    setIncomingCallData(null);
    setSubtitles([]);
    callIdRef.current = null;
    acsGroupCallIdRef.current = null;
    onCallStateChange?.(false);
  };

  // Toggle mute
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
        console.error('Error toggling mute:', error);
      }
    }
  };

  // Fetch call history
  const fetchCallHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/history/${userId}`);
      if (response.data.success) {
        setCallHistory(response.data.calls);
        setShowHistory(true);
      }
    } catch (error) {
      console.error('❌ Error fetching call history:', error);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">📞 Audio Call</h2>
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
      <p className="text-sm text-gray-500 mb-2">Audio Call</p>
      
      {incomingCallData?.translationEnabled && (
        <div className="mb-4 p-3 bg-white rounded">
          <p className="text-xs text-gray-600 mb-2">
            Caller is speaking in: <strong>{supportedLanguages.find(l => l.code === incomingCallData.callerLanguage)?.name}</strong>
          </p>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Select your language:
          </label>
          <select
            value={incomingCallLanguage}
            onChange={(e) => setIncomingCallLanguage(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {supportedLanguages.map((lang) => (
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

      {/* Active Call UI */}
      {isCallActive && !isIncomingCall && (
        <div className="mb-4">
          <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg mb-4">
            <div className="text-center">
              <div className="text-4xl mb-2">
                {callStatus === 'ringing' ? '📞' : '🎙️'}
              </div>
              <h3 className="text-lg font-semibold mb-1">
                {callStatus === 'ringing' ? 'Calling...' : 'Call in Progress'}
              </h3>
              {callStatus === 'connected' && (
                <p className="text-2xl font-mono mb-4">{formatDuration(callDuration)}</p>
              )}
              <div className="flex gap-2 justify-center mb-2">
                {callStatus === 'connected' && (
                  <>
                    <button
                      onClick={toggleMute}
                      className={`px-4 py-2 rounded-full font-semibold ${
                        isMuted ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {isMuted ? '🔇 Unmute' : '🔊 Mute'}
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={callStatus === 'ringing' ? cancelCall : endCall}
                className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold text-lg"
              >
                📴 {callStatus === 'ringing' ? 'Cancel' : 'End Call'}
              </button>
            </div>
          </div>

          {/* Subtitles Display */}
          {translationEnabled && subtitles.length > 0 && (
            <div className="p-4 bg-gray-900 rounded-lg min-h-32 max-h-48 overflow-y-auto">
              <div className="space-y-2">
                {subtitles.map((subtitle) => (
                  <div
                    key={subtitle.id}
                    className={`p-2 rounded ${
                      subtitle.isMyTranscription
                        ? 'bg-blue-600 text-white text-right'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    <p className="text-sm font-medium">
                      {subtitle.fromUser === 'me' ? 'You' : 'Other User'}:
                    </p>
                    <p className="text-lg">{subtitle.text}</p>
                    {subtitle.originalText && (
                      <p className="text-xs text-gray-300 mt-1">
                        Original: {subtitle.originalText}
                      </p>
                    )}
                  </div>
                ))}
              </div>
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

          {/* Translation Toggle */}
          <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={translationEnabled}
                  onChange={(e) => {
                    setTranslationEnabled(e.target.checked);
                    if (e.target.checked) {
                      setShowLanguageSelector(true);
                    }
                  }}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  🌐 Enable Real-Time Translation
                </span>
              </label>
            </div>

            {/* {translationEnabled && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Your Language
                  </label>
                  <select
                    value={myLanguage}
                    onChange={(e) => setMyLanguage(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {supportedLanguages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Receiver's Language
                  </label>
                  <select
                    value={receiverLanguage}
                    onChange={(e) => setReceiverLanguage(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {supportedLanguages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-xs text-gray-600 bg-white p-2 rounded">
                  💡 You'll speak in <strong>{supportedLanguages.find(l => l.code === myLanguage)?.name}</strong>,
                  they'll hear in <strong>{supportedLanguages.find(l => l.code === receiverLanguage)?.name}</strong>
                </div>
              </div>
            )} */}
          

          {translationEnabled && (
  <div className="space-y-3">
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        Select Your Language (You will speak & hear in this language)
      </label>
      <select
        value={myLanguage}
        onChange={(e) => setMyLanguage(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
    <div className="text-xs text-gray-600 bg-white p-2 rounded">
      💡 You will speak in <strong>{supportedLanguages.find(l => l.code === myLanguage)?.name}</strong> and 
      hear everything translated to <strong>{supportedLanguages.find(l => l.code === myLanguage)?.name}</strong>
    </div>
  </div>
)}


          
          
          </div>

          <button
            onClick={initiateCall}
            disabled={!receiverInput.trim()}
            className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg font-semibold text-lg"
          >
            📞 Start {translationEnabled ? 'Translated' : ''} Audio Call
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
              ✕ Close
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
                        {call.otherUser?.name || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {call.isOutgoing ? '↗️ Outgoing' : '↙️ Incoming'} •{' '}
                        <span
                          className={`font-semibold ${
                            call.callStatus === 'accepted'
                              ? 'text-green-600'
                              : call.callStatus === 'missed'
                              ? 'text-orange-600'
                              : call.callStatus === 'rejected'
                              ? 'text-red-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {call.callStatus}
                        </span>
                      </p>
                      {call.duration > 0 && (
                        <p className="text-sm text-gray-500">
                          Duration: {formatDuration(call.duration)}
                        </p>
                      )}
                      {call.translationEnabled && (
                        <p className="text-xs text-purple-600 font-medium mt-1">
                          🌐 Translated Call
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
          <span className="ml-2 text-purple-600 font-semibold">
            | 🌐 Translation Active
          </span>
        )}
      </div>
    </div>
  );
};

export default CallPanel;