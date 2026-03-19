import {
  CallClient,
  VideoStreamRenderer,
  LocalVideoStream,
} from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import * as signalR from "@microsoft/signalr";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

// --- Configuration ---
const AUDIO_BACKEND_URL = "http://192.168.1.46:4005";
const VIDEO_BACKEND_URL = "http://192.168.1.46:4009/api";
const HUB_NAME = "audioHub";

const SUPPORTED_LANGUAGES = [
  { code: "en-US", name: "English (US)", flag: "🇺🇸" },
  { code: "hi-IN", name: "Hindi (India)", flag: "🇮🇳" },
  { code: "fr-FR", name: "French (France)", flag: "🇫🇷" },
  { code: "es-ES", name: "Spanish (Spain)", flag: "🇪🇸" },
];

export default function TranslatedVideoCall() {
  // --- User State ---
  const [myUserId, setMyUserId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [myLanguage, setMyLanguage] = useState("en-US");
  const [calleeLanguage, setCalleeLanguage] = useState(null);
  const [jwtToken, setJwtToken] = useState("");

  // --- Connection & Call State ---
  const [isSignaledConnected, setIsSignaledConnected] = useState(false);
  const [status, setStatus] = useState("Offline");
  const [callState, setCallState] = useState("idle"); // idle, initiating, ringing, incoming, inCall

  // --- Incoming Call Payloads ---
  const [incomingAudioData, setIncomingAudioData] = useState(null);
  const [incomingVideoData, setIncomingVideoData] = useState(null);

  // --- Active Call References ---
  const [audioCallInfo, setAudioCallInfo] = useState(null);
  const [videoCallInfo, setVideoCallInfo] = useState(null);
  const [subtitles, setSubtitles] = useState([]);

  // --- Refs for Cleanup and Video Rendering ---
  const socketRef = useRef(null);
  const signalRRef = useRef(null);

  const audioCallRef = useRef(null);
  const videoCallRef = useRef(null);

  const localVideoContainerRef = useRef(null);
  const remoteVideoContainerRef = useRef(null);
  const localRendererRef = useRef(null);
  const remoteRendererRef = useRef(null);
  const localVideoStreamRef = useRef(null);

  // ==========================================
  // 1. SIGNALING SETUP (Socket.io + SignalR)
  // ==========================================

  useEffect(() => {
    const socket = io(AUDIO_BACKEND_URL);
    socketRef.current = socket;

    socket.on("connect", () => setStatus("Audio Socket Connected"));

    socket.on("live_subtitle", (data) => {
      setSubtitles((prev) =>
        [...prev, { ...data, id: Date.now() + Math.random() }].slice(-20),
      );
    });

    socket.on("incoming_call", (data) => {
      console.log("📞 Incoming Audio Call:", data);
      setIncomingAudioData(data);
      setCallState("incoming");
    });

    socket.on("call_accepted", (data) => {
      console.log("✅ Audio Call accepted by callee:", data);
      setCalleeLanguage(data.calleeLanguage);
      // FIX 1: Ensure caller UI transitions to "inCall"
      setCallState("inCall");
      setStatus("In Call 🟢");
    });

    socket.on("call_rejected", () => cleanupCallState(true));
    socket.on("call_cancelled", () => cleanupCallState(true));
    socket.on("call_ended", () => cleanupCallState(true));

    return () => socket.disconnect();
  }, []);

  const connectUser = async () => {
    if (!myUserId) return alert("Please enter User ID");

    if (socketRef.current) socketRef.current.emit("join_user_room", myUserId);

    try {
      setStatus("Connecting to Video SignalR...");
      const response = await axios.post(
        `${VIDEO_BACKEND_URL}/calls/signalr/negotiate`,
        { userId: myUserId },
      );

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(`${response.data.url}/client/?hub=${HUB_NAME}`, {
          accessTokenFactory: () => response.data.accessToken,
        })
        .withAutomaticReconnect()
        .build();

      connection.on("incoming_call", (callData) => {
        console.log("📹 Incoming Video Call:", callData);
        setIncomingVideoData(callData);
        setCallState("incoming");
      });

      connection.on("call_rejected", () => cleanupCallState(true));
      connection.on("call_cancelled", () => cleanupCallState(true));
      connection.on("call_ended", () => cleanupCallState(true));

      await connection.start();
      signalRRef.current = connection;
      setIsSignaledConnected(true);
      setStatus("Connected to Both Services ✅");
    } catch (err) {
      console.error("SignalR Connection Failed:", err);
      setStatus("Video Connection Failed ❌");
    }
  };

  // ==========================================
  // 2. ACS MEDIA SETUP HELPERS
  // ==========================================

  const startLocalVideo = async (deviceManager) => {
    const cameras = await deviceManager.getCameras();
    if (cameras.length === 0) throw new Error("No cameras found");

    const localVideoStream = new LocalVideoStream(cameras[0]);
    localVideoStreamRef.current = localVideoStream;

    const renderer = new VideoStreamRenderer(localVideoStream);
    localRendererRef.current = renderer;

    const view = await renderer.createView();
    if (localVideoContainerRef.current) {
      localVideoContainerRef.current.innerHTML = "";
      localVideoContainerRef.current.appendChild(view.target);
    }
    return localVideoStream;
  };

  // FIX 2: Check for existing streams before listening for new ones
  const subscribeToRemoteVideo = (remoteParticipant) => {
    const renderStream = async (stream) => {
      if (stream.isAvailable) {
        const renderer = new VideoStreamRenderer(stream);
        remoteRendererRef.current = renderer;
        const view = await renderer.createView();
        if (remoteVideoContainerRef.current) {
          remoteVideoContainerRef.current.innerHTML = "";
          remoteVideoContainerRef.current.appendChild(view.target);
        }
      }
    };

    // 1. Render streams that already exist when we join
    remoteParticipant.videoStreams.forEach((stream) => {
      renderStream(stream);
    });

    // 2. Listen for streams added or removed during the call
    remoteParticipant.on("videoStreamsUpdated", (e) => {
      e.added.forEach((stream) => {
        renderStream(stream);
      });
      e.removed.forEach((stream) => {
        if (remoteRendererRef.current) {
          remoteRendererRef.current.dispose();
          remoteRendererRef.current = null;
        }
        if (remoteVideoContainerRef.current) {
          remoteVideoContainerRef.current.innerHTML = "";
        }
      });
    });
  };

  // Setup listeners for the Call object itself
  const setupCallListeners = (call) => {
    call.on("stateChanged", () => {
      if (call.state === "Connected") {
        setCallState("inCall");
        setStatus("In Call 🟢");
      } else if (call.state === "Disconnected") {
        cleanupCallState(true);
      }
    });

    // Handle participants who are already in the call
    call.remoteParticipants.forEach((participant) => {
      subscribeToRemoteVideo(participant);
    });

    // Handle participants who join after us
    call.on("remoteParticipantsUpdated", (e) => {
      e.added.forEach((participant) => {
        subscribeToRemoteVideo(participant);
      });
    });
  };

  // ==========================================
  // 3. CORE CALL ACTIONS
  // ==========================================

  const handleCall = async () => {
    if (!myUserId || !targetUserId || !myLanguage || !jwtToken) {
      return alert("Please fill all details including JWT Token.");
    }

    setCallState("initiating");
    setStatus(`Initiating dual-call to ${targetUserId}...`);
    setSubtitles([]);

    try {
      const [audioRes, videoRes] = await Promise.all([
        axios.post(
          `${AUDIO_BACKEND_URL}/call/initiate`,
          { calleeUserId: targetUserId, callerLanguage: myLanguage },
          { headers: { Authorization: `Bearer ${jwtToken}` } },
        ),
        axios.post(`${VIDEO_BACKEND_URL}/calls/initiate`, {
          callerId: myUserId,
          receiverId: targetUserId,
          callType: "video",
        }),
      ]);

      const audioData = audioRes.data;
      const videoData = videoRes.data;

      setAudioCallInfo(audioData);
      setVideoCallInfo(videoData);

      // Setup Audio Call (MIC ON, VIDEO OFF)
      const audioClient = new CallClient();
      const audioAgent = await audioClient.createCallAgent(
        new AzureCommunicationTokenCredential(audioData.acsUser.token),
      );
      const audioCall = audioAgent.join(
        { groupId: audioData.groupId },
        { audioOptions: { muted: false } },
      );
      audioCallRef.current = audioCall;

      // Setup Video Call (MIC OFF, VIDEO ON)
      const videoClient = new CallClient();
      const videoAgent = await videoClient.createCallAgent(
        new AzureCommunicationTokenCredential(videoData.acsToken),
      );
      const videoDm = await videoClient.getDeviceManager();
      await videoDm.askDevicePermission({ video: true, audio: true });

      const localStream = await startLocalVideo(videoDm);

      const videoCall = videoAgent.join(
        { groupId: videoData.acsGroupCallId },
        {
          videoOptions: { localVideoStreams: [localStream] },
          audioOptions: { muted: true },
        },
      );

      setupCallListeners(videoCall);
      videoCallRef.current = videoCall;

      setCallState("ringing");
      setStatus("Ringing...");
    } catch (err) {
      console.error("Call initiation failed:", err);
      cleanupCallState(true);
    }
  };

  const handleAccept = async () => {
    if (!incomingAudioData || !incomingVideoData || !myLanguage) {
      return alert(
        "Waiting for both audio and video signals to sync, or language missing.",
      );
    }

    setCallState("inCall");
    setStatus("Accepting dual-call...");

    try {
      const [audioRes, videoRes] = await Promise.all([
        axios.post(
          `${AUDIO_BACKEND_URL}/call/accept`,
          { bridgeId: incomingAudioData.bridgeId, calleeLanguage: myLanguage },
          { headers: { Authorization: `Bearer ${jwtToken}` } },
        ),
        axios.post(`${VIDEO_BACKEND_URL}/calls/accept`, {
          callId: incomingVideoData.callId,
          receiverId: myUserId,
        }),
      ]);

      const audioData = audioRes.data;
      const videoData = videoRes.data;

      setAudioCallInfo(audioData);
      setVideoCallInfo(videoData);

      // Join Audio Call
      const audioClient = new CallClient();
      const audioAgent = await audioClient.createCallAgent(
        new AzureCommunicationTokenCredential(audioData.acsUser.token),
      );
      const audioCall = audioAgent.join(
        { groupId: audioData.groupId },
        { audioOptions: { muted: false } },
      );
      audioCallRef.current = audioCall;

      // Join Video Call
      const videoClient = new CallClient();
      const videoAgent = await videoClient.createCallAgent(
        new AzureCommunicationTokenCredential(videoData.acsToken),
      );
      const videoDm = await videoClient.getDeviceManager();

      const localStream = await startLocalVideo(videoDm);

      const videoCall = videoAgent.join(
        { groupId: videoData.acsGroupCallId },
        {
          videoOptions: { localVideoStreams: [localStream] },
          audioOptions: { muted: true },
        },
      );

      setupCallListeners(videoCall);
      videoCallRef.current = videoCall;
    } catch (err) {
      console.error("Accept failed:", err);
      cleanupCallState(true);
    }
  };

  const handleHangUp = async () => {
    if (audioCallRef.current)
      await audioCallRef.current.hangUp().catch(console.error);
    if (videoCallRef.current)
      await videoCallRef.current.hangUp().catch(console.error);

    if (audioCallInfo) {
      axios
        .post(
          `${AUDIO_BACKEND_URL}/call/end`,
          { userId: myUserId, bridgeId: audioCallInfo.bridgeId },
          { headers: { Authorization: `Bearer ${jwtToken}` } },
        )
        .catch(console.error);
    }
    if (videoCallInfo) {
      axios
        .post(`${VIDEO_BACKEND_URL}/calls/end`, {
          callId: videoCallInfo.callId,
          userId: myUserId,
        })
        .catch(console.error);
    }

    cleanupCallState(false);
  };

  const cleanupCallState = (resetStatus = true) => {
    if (localRendererRef.current) localRendererRef.current.dispose();
    if (remoteRendererRef.current) remoteRendererRef.current.dispose();

    if (localVideoContainerRef.current)
      localVideoContainerRef.current.innerHTML = "";
    if (remoteVideoContainerRef.current)
      remoteVideoContainerRef.current.innerHTML = "";

    audioCallRef.current = null;
    videoCallRef.current = null;
    localVideoStreamRef.current = null;

    setCallState("idle");
    setIncomingAudioData(null);
    setIncomingVideoData(null);
    setAudioCallInfo(null);
    setVideoCallInfo(null);
    if (resetStatus) setStatus("Connected to Both Services ✅");
  };

  // ==========================================
  // 4. UI RENDERING
  // ==========================================

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-4">
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-purple-400">
              🌐 Duplex Translated Video Call
            </h1>
            <p className="text-sm text-gray-400">Status: {status}</p>
          </div>
          {!isSignaledConnected && (
            <div className="flex gap-2 items-center">
              <input
                className="bg-gray-700 p-2 rounded text-sm"
                placeholder="My User ID"
                value={myUserId}
                onChange={(e) => setMyUserId(e.target.value)}
              />
              <input
                className="bg-gray-700 p-2 rounded text-sm"
                placeholder="JWT Token"
                value={jwtToken}
                onChange={(e) => setJwtToken(e.target.value)}
              />
              <button
                onClick={connectUser}
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
              >
                Connect
              </button>
            </div>
          )}
        </div>

        {isSignaledConnected && callState === "idle" && (
          <div className="bg-gray-800 p-6 rounded-lg grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                My Language
              </label>
              <select
                className="w-full bg-gray-700 p-2 rounded"
                value={myLanguage}
                onChange={(e) => setMyLanguage(e.target.value)}
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Target User ID
              </label>
              <div className="flex gap-2">
                <input
                  className="w-full bg-gray-700 p-2 rounded"
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                />
                <button
                  onClick={handleCall}
                  className="bg-green-600 px-6 py-2 rounded font-bold hover:bg-green-700"
                >
                  Call
                </button>
              </div>
            </div>
          </div>
        )}

        {callState === "incoming" && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-lg text-center shadow-2xl">
            <h2 className="text-2xl font-bold mb-2">
              📹 Incoming Translated Call
            </h2>
            <p className="mb-4 text-gray-200">
              Waiting for both audio and video signals to sync...
            </p>

            <div className="mb-4">
              <select
                className="bg-gray-800 p-2 rounded text-white"
                value={myLanguage}
                onChange={(e) => setMyLanguage(e.target.value)}
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={handleAccept}
                disabled={!incomingAudioData || !incomingVideoData}
                className="bg-green-500 px-8 py-3 rounded-lg font-bold hover:bg-green-600 disabled:opacity-50"
              >
                ✅ Accept Both
              </button>
              <button
                onClick={cleanupCallState}
                className="bg-red-500 px-8 py-3 rounded-lg font-bold hover:bg-red-600"
              >
                ❌ Reject
              </button>
            </div>
          </div>
        )}

        {(callState === "inCall" ||
          callState === "ringing" ||
          callState === "initiating") && (
          <div className="grid grid-cols-3 gap-4 h-[600px]">
            <div className="col-span-2 bg-black rounded-lg relative overflow-hidden shadow-lg border border-gray-700">
              {/* Remote Video Container */}
              <div
                ref={remoteVideoContainerRef}
                className="w-full h-full flex items-center justify-center bg-gray-900"
              >
                <span className="text-gray-600 text-xl">
                  {callState === "inCall"
                    ? "Waiting for remote video..."
                    : "Calling..."}
                </span>
              </div>

              {/* Local Video Container */}
              <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded border-2 border-gray-600 overflow-hidden z-10">
                <div
                  ref={localVideoContainerRef}
                  className="w-full h-full bg-gray-700 flex items-center justify-center"
                >
                  <span className="text-gray-500 text-xs">Local Video</span>
                </div>
              </div>

              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                <button
                  onClick={handleHangUp}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-xl"
                >
                  <span className="text-2xl">📞</span>
                </button>
              </div>
            </div>

            <div className="col-span-1 bg-gray-800 rounded-lg flex flex-col border border-gray-700 overflow-hidden">
              <div className="bg-gray-700 p-3 text-center font-bold text-sm">
                💬 Live Subtitles
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {subtitles.length === 0 ? (
                  <p className="text-gray-500 text-center text-sm italic mt-10">
                    Translations will appear here...
                  </p>
                ) : (
                  subtitles.map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-gray-900 p-3 rounded-lg border-l-4 border-purple-500"
                    >
                      <p className="text-white font-medium text-sm">
                        {sub.translated}
                      </p>
                      <p className="text-gray-400 text-xs italic mt-1">
                        {sub.original}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
