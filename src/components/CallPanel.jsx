import { CallClient } from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

// --- Configuration ---

// const BACKEND_URL = "http://localhost:4005";
const BACKEND_URL = "https://uhura-h4aeb.ondigitalocean.app";
// const BACKEND_URL = "http://192.168.1.119:4005";

  
console.log("123456789");


// Supported Languages
const SUPPORTED_LANGUAGES = [
  { code: "en-US", name: "English (US)", flag: "🇺🇸" },
  { code: "hi-IN", name: "Hindi (India)", flag: "🇮🇳" },
  { code: "fr-FR", name: "French (France)", flag: "🇫🇷" },
  { code: "es-ES", name: "Spanish (Spain)", flag: "🇪🇸" },
  { code: "de-DE", name: "German (Germany)", flag: "🇩🇪" },
  { code: "zh-CN", name: "Chinese (Simplified)", flag: "🇨🇳" },
  { code: "ja-JP", name: "Japanese (Japan)", flag: "🇯🇵" },
  { code: "ar-SA", name: "Arabic (Saudi Arabia)", flag: "🇸🇦" },
  { code: "pt-BR", name: "Portuguese (Brazil)", flag: "🇧🇷" },
  { code: "it-IT", name: "Italian (Italy)", flag: "🇮🇹" },
  { code: "ko-KR", name: "Korean (Korea)", flag: "🇰🇷" },
  { code: "ru-RU", name: "Russian (Russia)", flag: "🇷🇺" },
];

export default function CallPanel() {
  // --- User & Call State ---
  const [myUserId, setMyUserId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [status, setStatus] = useState("Offline");

  // --- Language Preferences ---
  const [myLanguage, setMyLanguage] = useState("en-US");
  const [calleeLanguage, setCalleeLanguage] = useState(null);

  // --- Call Session State ---
  const [currentCallId, setCurrentCallId] = useState(null);
  const [currentBridgeId, setCurrentBridgeId] = useState(null);
  const [callRole, setCallRole] = useState(null); // 'caller' | 'callee'
  const [callStartTime, setCallStartTime] = useState(null);

  // --- Socket.io State ---
  const [socket, setSocket] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

  // --- ACS State ---
  const [callClient, setCallClient] = useState(null);
  const [callAgent, setCallAgent] = useState(null);
  const [deviceManager, setDeviceManager] = useState(null);
  const [call, setCall] = useState(null);

  // --- Subtitle Display ---
  const [subtitles, setSubtitles] = useState([]);

  const [jwtToken, setJwtToken] = useState("");

  // --- Call Timer ---
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef(null);

  // --- Socket.io Initialization and Event Listeners ---
  useEffect(() => {
    const newSocket = io(BACKEND_URL);
    console.log("🔌 Creating new socket instance");

    setSocket(newSocket);
    setStatus("Connecting to server...");

    newSocket.on("connect", () => {
      console.log("🟢 Socket connected:", newSocket.id);
      setStatus("Online");
    });

    // 🔴 add this block here
    newSocket.on("connect_error", (err) => {
      console.error(
        "🔴 connect_error (ngrok):",
        err,
        err.message,
        err.description
      );
      setStatus(`Connection error: ${err.message || "unknown"}`);
    });

    // ✅ NEW: Listen for live subtitles
    newSocket.on("live_subtitle", (data) => {
      console.log("📝 Received subtitle:", data);

      // Add to subtitles array (keep last 20)
      setSubtitles((prev) =>
        [
          ...prev,
          {
            id: Date.now() + Math.random(), // Unique ID
            translated: data.translated,
            original: data.original,
            sourceLanguage: data.sourceLanguage,
            targetLanguage: data.targetLanguage,
            timestamp: data.timestamp,
          },
        ].slice(-20)
      ); // Keep only last 20 subtitles
    });

    // Incoming call event
    newSocket.on("incoming_call", (data) => {
      console.log("📞 Incoming call received:", data);
      setIncomingCall(data);
      const callerLang = SUPPORTED_LANGUAGES.find(
        (l) => l.code === data.callerLanguage
      );
      setStatus(
        `📞 Incoming call from ${data.callerName || data.callerUserId} (${
          callerLang?.flag
        } ${callerLang?.name})`
      );
    });

    // Call accepted event
    newSocket.on("call_accepted", (data) => {
      console.log("✅ Call accepted:", data);
      setCalleeLanguage(data.calleeLanguage);
      const calleeLang = SUPPORTED_LANGUAGES.find(
        (l) => l.code === data.calleeLanguage
      );
      setStatus(
        `✅ Call connected with ${data.calleeName || data.calleeUserId} (${
          calleeLang?.flag
        } ${calleeLang?.name})`
      );

      // Start call timer
      setCallStartTime(Date.now());
      startCallTimer();
    });

    // Call rejected event
    newSocket.on("call_rejected", (data) => {
      console.log("❌ Call rejected:", data);
      setStatus("❌ Call was rejected");
      cleanupCallState();
      alert("The call was rejected by the other user");
    });

    // Call cancelled event
    newSocket.on("call_cancelled", (data) => {
      console.log("🚫 Call cancelled:", data);
      setStatus("🚫 Caller cancelled the call");
      setIncomingCall(null);
      cleanupCallState();
    });

    // Call ended event
    newSocket.on("call_ended", (data) => {
      console.log("📴 Call ended by other party:", data);
      const minutes = Math.floor(data.duration / 60);
      const seconds = data.duration % 60;
      setStatus(`📴 Call ended (Duration: ${minutes}m ${seconds}s)`);
      cleanupCallState();
      if (call) {
        call.hangUp().catch((err) => console.error("Hangup error:", err));
      }
    });

    newSocket.on("disconnect", (reason) => {
      console.log("🔴 Test disconnected:", reason);

      console.log("Socket disconnected");
      setStatus("Offline");
    });

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Join user-specific socket room
  useEffect(() => {
    if (socket && myUserId) {
      socket.emit("join_user_room", myUserId);
      console.log(`Joined socket room for ${myUserId}`);
    }
  }, [socket, myUserId]);

  // --- Helper Functions ---

  // Start call duration timer
  const startCallTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  // Stop call duration timer
  const stopCallTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Format call duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup all call-related state
  const cleanupCallState = () => {
    setCall(null);
    setCallAgent(null);
    setCallClient(null);
    setCurrentCallId(null);
    setCurrentBridgeId(null);
    setCallRole(null);
    setCalleeLanguage(null);
    setSubtitles([]);
    setCallDuration(0);
    setCallStartTime(null);
    stopCallTimer();
  };

  // Initialize ACS Agent
  const initCallAgent = async (token) => {
    try {
      const client = new CallClient();
      const credential = new AzureCommunicationTokenCredential(token);
      const agent = await client.createCallAgent(credential);
      const dm = await client.getDeviceManager();
      await dm.askDevicePermission({ audio: true });

      setCallClient(client);
      setCallAgent(agent);
      setDeviceManager(dm);

      console.log("Call agent initialized");
      return { agent, dm };
    } catch (err) {
      console.error("Failed to init call agent:", err);
      setStatus("❌ Failed to init call agent");
      return {};
    }
  };

  // Join the ACS Group Call
  const joinGroupCall = async (agent, dm, groupId) => {
    try {
      const newCall = agent.join(
        { groupId },
        { audioOptions: { muted: false } }
      );

      // Ensure speaker is selected
      const speakers = await dm.getSpeakers();
      if (speakers.length > 0) {
        await dm.selectSpeaker(speakers[0]);
      }

      // Handle call state changes
      newCall.on("stateChanged", () => {
        console.log(`Call state changed to: ${newCall.state}`);
        if (newCall.state === "Disconnected") {
          console.log("Call disconnected from ACS");
        }
      });

      setCall(newCall);
      console.log("Joined ACS group call");
      return newCall;
    } catch (err) {
      console.error("Failed to join call:", err);
      setStatus("❌ Failed to join call");
    }
  };

  // --- Main Actions ---

  /**
   * CALLER: Initiates a call to the targetUserId
   */
  const handleCall = async () => {
    if (!myUserId || !targetUserId) {
      return alert("Please set 'My User ID' and 'Target User ID'");
    }
    if (!myLanguage) {
      return alert("Please select your language");
    }
    if (!jwtToken) {
      return alert("No JWT token provided");
    }

    setStatus(`Initiating call to ${targetUserId}...`);
    setSubtitles([]);

    try {
      const res = await axios.post(
        `${BACKEND_URL}/call/initiate`,
        {
          // callerUserId: myUserId,
          calleeUserId: targetUserId,
          callerLanguage: myLanguage,
        },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`, // my user id
          },
        }
      );

      const { callId, acsUser, groupId, bridgeId } = res.data;

      setCurrentCallId(callId);
      setCurrentBridgeId(bridgeId);
      setCallRole("caller");

      const { agent, dm } = await initCallAgent(acsUser.token);
      if (!agent || !dm) return;

      await joinGroupCall(agent, dm, groupId);

      const myLang = SUPPORTED_LANGUAGES.find((l) => l.code === myLanguage);
      setStatus(`📞 Calling... (You speak ${myLang?.flag} ${myLang?.name})`);
    } catch (err) {
      console.error("Call initiation failed:", err);
      setStatus("❌ Call failed");
      cleanupCallState();
    }
  };

  /**
   * CALLEE: Accepts an incoming call
   */
  const handleAccept = async () => {
    if (!incomingCall) return;
    if (!myLanguage) {
      return alert("Please select your language before accepting");
    }
    setStatus("Accepting call...");
    setSubtitles([]);

    try {
      // Tell backend we are accepting
      const res = await axios.post(
        `${BACKEND_URL}/call/accept`,
        {
          // calleeUserId: myUserId,
          bridgeId: incomingCall.bridgeId,
          calleeLanguage: myLanguage,
        },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );

      const { callId, acsUser, groupId, bridgeId, callerLanguage } = res.data;

      // Store call session data
      setCurrentCallId(callId);
      setCurrentBridgeId(bridgeId);
      setCallRole("callee");

      // Initialize ACS agent and join call
      const { agent, dm } = await initCallAgent(acsUser.token);
      if (!agent || !dm) return;

      await joinGroupCall(agent, dm, groupId);

      const myLang = SUPPORTED_LANGUAGES.find((l) => l.code === myLanguage);
      const callerLang = SUPPORTED_LANGUAGES.find(
        (l) => l.code === callerLanguage
      );
      setStatus(
        `✅ Connected (You: ${myLang?.flag} ${myLang?.name}, Caller: ${callerLang?.flag} ${callerLang?.name})`
      );

      // Start timer
      setCallStartTime(Date.now());
      startCallTimer();

      // Clear incoming call notification
      setIncomingCall(null);
    } catch (err) {
      console.error("Call acceptance failed:", err);
      setStatus("❌ Accept failed");
      cleanupCallState();
    }
  };

  /**
   * CALLEE: Rejects an incoming call
   */
  const handleReject = async () => {
    if (!incomingCall) return;

    try {
      await axios.post(
        `${BACKEND_URL}/call/reject`,
        {
          // calleeUserId: myUserId,
          bridgeId: incomingCall.bridgeId,
        },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );

      setIncomingCall(null);
      setStatus("Call rejected");
      console.log("Call rejected successfully");
    } catch (err) {
      console.error("Reject failed:", err);
      setStatus("❌ Reject failed");
    }
  };

  /**
   * CALLER: Cancels call before callee accepts (while ringing)
   */
  const handleCancel = async () => {
    if (!currentBridgeId || callRole !== "caller") return;

    try {
      setStatus("Cancelling call...");

      await axios.post(
        `${BACKEND_URL}/call/cancel`,
        {
          callerUserId: myUserId,
          bridgeId: currentBridgeId,
        },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );

      // Hangup ACS call
      if (call) {
        await call.hangUp();
      }

      cleanupCallState();
      setStatus("🚫 Call cancelled");
      console.log("Call cancelled successfully");
    } catch (err) {
      console.error("Cancel failed:", err);
      setStatus("❌ Cancel failed");
    }
  };

  /**
   *
   * Hang up an active call (both caller and callee)
   */
  const hangUp = async () => {
    if (!call || !currentBridgeId) return;

    try {
      setStatus("Ending call...");
      stopCallTimer();

      // Tell backend to end the call
      const res = await axios.post(
        `${BACKEND_URL}/call/end`,
        {
          userId: myUserId,
          bridgeId: currentBridgeId,
        },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );

      // Hangup ACS call
      await call.hangUp();

      const { duration, formattedDuration } = res.data;
      setStatus(`📴 Call ended (Duration: ${formattedDuration})`);

      cleanupCallState();
      console.log(`Call ended. Duration: ${formattedDuration}`);
    } catch (err) {
      console.error("Hang up failed:", err);
      setStatus("❌ Hangup failed");
      cleanupCallState();
    }
  };

  const callHistory = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/call/history`, {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });

      console.log("Response from call history:", res.data);
    } catch (err) {
      console.log("Error while fetching the History:", err);
    }
  };

  // --- UI Rendering ---
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 flex justify-center items-center font-sans">
      <div className="bg-gray-800 shadow-2xl rounded-2xl p-6 w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-center text-purple-400">
          🌐 Real-time Translated Call
        </h1>
        <p className="text-center text-gray-400 text-sm">
          <b>Status:</b> {status}
        </p>
        <button onClick={callHistory}>Call History</button>

        <p>(1) 8b7829d2-e06c-4da5-9e09-1cd75ba0995e</p>
        <p>or</p>
        <p>(2) 4ffc1ced-f47f-4702-b49a-bcb44bb534a9</p>

        <input
          type="text"
          placeholder="Paste JWT Token"
          value={jwtToken}
          onChange={(e) => setJwtToken(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />

        {/* User Setup Section */}
        {!call && !incomingCall && (
          <div className="space-y-4">
            <div className="bg-gray-700 p-4 rounded-lg space-y-3">
              <h2 className="text-lg font-semibold text-purple-300">
                1. Your Info
              </h2>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  My User ID
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    className="bg-gray-600 border border-gray-500 rounded-lg p-2 flex-1 text-white"
                    placeholder="Your unique ID"
                    value={myUserId}
                    onChange={(e) => setMyUserId(e.target.value)}
                  />
                  <button
                    onClick={() => setMyUserId(uuidv4())}
                    className="bg-purple-600 px-3 rounded-lg hover:bg-purple-700"
                    title="Generate ID"
                  >
                    🎲
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300">
                  My Language
                </label>
                <select
                  value={myLanguage}
                  onChange={(e) => setMyLanguage(e.target.value)}
                  className="w-full mt-1 bg-gray-600 border border-gray-500 rounded-lg p-2 text-white"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Language you'll speak and listen in
                </p>
              </div>
            </div>

            <div className="bg-gray-700 p-4 rounded-lg space-y-3">
              <h2 className="text-lg font-semibold text-purple-300">
                2. Call User
              </h2>
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Target User ID
                </label>
                <input
                  type="text"
                  className="w-full mt-1 bg-gray-600 border border-gray-500 rounded-lg p-2 text-white"
                  placeholder="Who to call"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                />
              </div>

              <button
                onClick={handleCall}
                disabled={
                  !myUserId ||
                  !targetUserId ||
                  !myLanguage ||
                  !socket?.connected
                }
                className="w-full py-3 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                📞 Start Call
              </button>
            </div>
          </div>
        )}

        {/* Incoming Call Section */}
        {incomingCall && !call && (
          <div className="space-y-4 p-5 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-center">
              📞 Incoming Call!
            </h2>
            <div className="bg-white/10 backdrop-blur p-3 rounded-lg">
              <p className="text-gray-200 text-sm">
                From:{" "}
                <b className="text-white text-lg">
                  {incomingCall.callerName || incomingCall.callerUserId}
                </b>
              </p>
              <p className="text-gray-200 text-sm mt-1">
                Speaking:{" "}
                {
                  SUPPORTED_LANGUAGES.find(
                    (l) => l.code === incomingCall.callerLanguage
                  )?.flag
                }{" "}
                <b>
                  {
                    SUPPORTED_LANGUAGES.find(
                      (l) => l.code === incomingCall.callerLanguage
                    )?.name
                  }
                </b>
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-white">
                Select Your Language
              </label>
              <select
                value={myLanguage}
                onChange={(e) => setMyLanguage(e.target.value)}
                className="w-full mt-1 bg-white/20 backdrop-blur border border-white/30 rounded-lg p-2 text-white"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option
                    key={lang.code}
                    value={lang.code}
                    className="bg-gray-800"
                  >
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAccept}
                disabled={!myLanguage}
                className="flex-1 py-3 rounded-lg bg-green-500 text-white font-bold hover:bg-green-600 disabled:opacity-50 transition"
              >
                ✅ Accept
              </button>
              <button
                onClick={handleReject}
                className="flex-1 py-3 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition"
              >
                ❌ Reject
              </button>
            </div>
          </div>
        )}

        {/* Active Call Section */}
        {call && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-green-600 to-teal-600 p-5 rounded-lg shadow-lg text-center">
              <h2 className="text-2xl font-bold">🔊 Call in Progress</h2>

              {/* Call Duration Timer */}
              <div className="mt-2 text-3xl font-mono font-bold text-white">
                {formatDuration(callDuration)}
              </div>

              <div className="mt-3 bg-white/10 backdrop-blur p-3 rounded-lg space-y-1">
                <p className="text-sm text-gray-100">
                  You speak:{" "}
                  {SUPPORTED_LANGUAGES.find((l) => l.code === myLanguage)?.flag}{" "}
                  <b>
                    {
                      SUPPORTED_LANGUAGES.find((l) => l.code === myLanguage)
                        ?.name
                    }
                  </b>
                </p>
                {calleeLanguage && (
                  <p className="text-sm text-gray-100">
                    They speak:{" "}
                    {
                      SUPPORTED_LANGUAGES.find((l) => l.code === calleeLanguage)
                        ?.flag
                    }{" "}
                    <b>
                      {
                        SUPPORTED_LANGUAGES.find(
                          (l) => l.code === calleeLanguage
                        )?.name
                      }
                    </b>
                  </p>
                )}
              </div>
            </div>

            {/* ✅ Enhanced Subtitles Display */}
            <div className="bg-gray-700 rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>💬</span>
                  <span>Live Translation Subtitles</span>
                </h3>
              </div>

              <div className="p-4 max-h-64 overflow-y-auto space-y-3 bg-gray-800">
                {subtitles.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-8">
                    Subtitles will appear here during conversation...
                  </p>
                ) : (
                  subtitles.map((subtitle) => (
                    <div
                      key={subtitle.id}
                      className="bg-gray-700 rounded-lg p-3 border-l-4 border-purple-500 animate-fadeIn"
                    >
                      {/* Translated text (what you hear) */}
                      <p className="text-white font-medium text-base mb-2">
                        {subtitle.translated}
                      </p>

                      {/* Original text (what they said) */}
                      <div className="flex items-start gap-2 text-xs text-gray-400">
                        <span className="font-semibold">Original:</span>
                        <span className="italic">{subtitle.original}</span>
                      </div>

                      {/* Language indicator */}
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <span className="px-2 py-1 bg-blue-600/30 rounded text-blue-300">
                          {
                            SUPPORTED_LANGUAGES.find(
                              (l) => l.code === subtitle.sourceLanguage
                            )?.flag
                          }{" "}
                          {subtitle.sourceLanguage}
                        </span>
                        <span className="text-gray-500">→</span>
                        <span className="px-2 py-1 bg-green-600/30 rounded text-green-300">
                          {
                            SUPPORTED_LANGUAGES.find(
                              (l) => l.code === subtitle.targetLanguage
                            )?.flag
                          }{" "}
                          {subtitle.targetLanguage}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Call Control Buttons */}
            <div className="space-y-2">
              <button
                onClick={hangUp}
                className="w-full py-3 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition"
              >
                🔚 End Call
              </button>

              {callRole === "caller" && !calleeLanguage && (
                <button
                  onClick={handleCancel}
                  className="w-full py-2 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700 transition"
                >
                  🚫 Cancel Call
                </button>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 mt-4 space-y-1 pt-4 border-t border-gray-700">
          <p className="font-semibold text-gray-400">📖 How to Test:</p>
          <p>1. Open this in two browser tabs</p>
          <p>
            2. <b>Tab A:</b> Set User ID to "user-a", select English
          </p>
          <p>
            3. <b>Tab B:</b> Set User ID to "user-b"
          </p>
          <p>
            4. <b>Tab A:</b> Enter "user-b" as target and click "Start Call"
          </p>
          <p>
            5. <b>Tab B:</b> Select your language (e.g., French) and click
            "Accept"
          </p>
          <p>6. Now speak - your voices will be translated in real-time! 🌍</p>
        </div>
      </div>
    </div>
  );
}
