// VideoCall.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  CallClient,
  LocalVideoStream,
  VideoStreamRenderer,
} from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

const BACKEND_URL = "http://localhost:4006";

export default function VideoCall() {
  const [token, setToken] = useState("");
  const [acsUserId, setAcsUserId] = useState("");

  const [callClient, setCallClient] = useState(null);
  const [callAgent, setCallAgent] = useState(null);
  const [deviceManager, setDeviceManager] = useState(null);

  const [call, setCall] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);

  const [groupId, setGroupId] = useState("");
  const [bridgeId, setBridgeId] = useState("");
  const [leg, setLeg] = useState("A");

  const [status, setStatus] = useState("Not connected");
  const [botJoined, setBotJoined] = useState(false);

  const localContainerRef = useRef(null);
  const remoteContainerRef = useRef(null);

  // keep renderer refs for proper disposal
  const localRendererRef = useRef(null);
  const remoteRendererRef = useRef(null);
  const localVideoStreamRef = useRef(null);

  // Create ACS user & token
  const createAcsUser = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/create-acs-user`);
      setAcsUserId(res.data.acsUserId);
      setToken(res.data.token);
      setStatus("✅ ACS user created");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to create ACS user");
    }
  };

  // Init call agent
  const initCallAgent = async () => { 
    try {
      if (!token) return alert("Create ACS user first");
      const client = new CallClient();
      const credential = new AzureCommunicationTokenCredential(token);
      const agent = await client.createCallAgent(credential, {
        displayName: `User-${leg}`,
      });
      const dm = await client.getDeviceManager();
      await dm.askDevicePermission({ audio: true, video: true });

      setCallClient(client);
      setCallAgent(agent);
      setDeviceManager(dm);
      setStatus("✅ Call agent ready");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to init call agent");
    }
  };

  // helper: dispose local renderer
  const disposeLocalRenderer = async () => {
    try {
      if (localRendererRef.current) {
        await localRendererRef.current.dispose();
        localRendererRef.current = null;
      }
    } catch (err) {
      console.warn("Error disposing local renderer:", err);
    }
    if (localContainerRef.current) localContainerRef.current.innerHTML = "";
    if (localVideoStreamRef.current) {
      // don't stop device, just clear ref — the SDK manages it
      localVideoStreamRef.current = null;
    }
  };

  // helper: dispose remote renderer
  const disposeRemoteRenderer = async () => {
    try {
      if (remoteRendererRef.current) {
        await remoteRendererRef.current.dispose();
        remoteRendererRef.current = null;
      }
    } catch (err) {
      console.warn("Error disposing remote renderer:", err);
    }
    if (remoteContainerRef.current) remoteContainerRef.current.innerHTML = "";
  };

  // Join video call (renders local + remote)
  const joinCall = async () => {
    if (!callAgent || !groupId || !deviceManager) return alert("Missing call agent or groupId");

    setStatus("Joining video call...");

    try {
      const cameras = await deviceManager.getCameras();
      if (!cameras || cameras.length === 0) {
        alert("No camera found");
        setStatus("No camera found");
        return;
      }

      // create local video stream from first camera
      const localVideoStream = new LocalVideoStream(cameras[0]);
      localVideoStreamRef.current = localVideoStream;

      // join group call with video options
      const newCall = callAgent.join(
        { groupId },
        {
          audioOptions: { muted: !micOn },
          videoOptions: { localVideoStreams: [localVideoStream] },
        }
      );

      setCall(newCall);

      // render local via VideoStreamRenderer
      await disposeLocalRenderer();
      const localRenderer = new VideoStreamRenderer(localVideoStream);
      localRendererRef.current = localRenderer;
      const localView = await localRenderer.createView();
      if (localContainerRef.current) {
        localContainerRef.current.appendChild(localView.target);
      }
      setCameraOn(true);

      // handle remote participants
      newCall.on("remoteParticipantsUpdated", (e) => {
        // Process added participants
        e.added.forEach((participant) => {
          // When their video streams update
          participant.on("videoStreamsUpdated", async (vs) => {
            try {
              // Look for available streams and render the first available
              for (const stream of participant.videoStreams) {
                if (stream.isAvailable) {
                  // dispose previous remote renderer and create new
                  await disposeRemoteRenderer();
                  const remoteRenderer = new VideoStreamRenderer(stream);
                  remoteRendererRef.current = remoteRenderer;
                  const remoteView = await remoteRenderer.createView();
                  if (remoteContainerRef.current) {
                    remoteContainerRef.current.innerHTML = "";
                    remoteContainerRef.current.appendChild(remoteView.target);
                  }
                  break;
                }
              }
            } catch (err) {
              console.warn("Error rendering remote stream:", err);
            }
          });

          // If participant already has available streams, try to render immediately
          participant.videoStreams.forEach(async (stream) => {
            try {
              if (stream.isAvailable) {
                await disposeRemoteRenderer();
                const remoteRenderer = new VideoStreamRenderer(stream);
                remoteRendererRef.current = remoteRenderer;
                const remoteView = await remoteRenderer.createView();
                if (remoteContainerRef.current) {
                  remoteContainerRef.current.innerHTML = "";
                  remoteContainerRef.current.appendChild(remoteView.target);
                }
              }
            } catch (err) {
              console.warn("Error rendering initial remote stream:", err);
            }
          });
        });

        // Process removed participants: clear remote if no participants left
        e.removed.forEach(async () => {
          const rp = newCall.remoteParticipants;
          if (!rp || rp.length === 0) {
            await disposeRemoteRenderer();
          }
        });
      });

      // state change handling
      newCall.on("stateChanged", () => {
        if (newCall.state === "Disconnected") {
          setStatus("📴 Call ended");
          setCall(null);
          setBotJoined(false);
          // cleanup
          disposeLocalRenderer();
          disposeRemoteRenderer();
          setCameraOn(false);
        }
      });

      setStatus("📞 Joined video call");
    } catch (err) {
      console.error("joinCall error:", err);
      setStatus("❌ Failed joining video call");
    }
  };

  // Ask backend to add bot to this leg
  const joinBot = async () => {
    if (!groupId || !bridgeId) return alert("Enter both bridgeId and groupId");
    try {
      await axios.post(`${BACKEND_URL}/join-bridge-leg`, {
        groupId,
        bridgeId,
        leg,
      });
      setBotJoined(true);
      setStatus(`🤖 Bot joined leg ${leg}`);
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to add bot");
    }
  };

  // Hang up and cleanup
  const hangUp = async () => {
    if (!call) return;
    try {
      await call.hangUp();
    } catch (e) {
      console.warn("hangUp error:", e);
    }
    setCall(null);
    setBotJoined(false);
    setStatus("📴 Hung up");
    await disposeLocalRenderer();
    await disposeRemoteRenderer();
    setCameraOn(false);
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      (async () => {
        try {
          if (call) {
            try {
              await call.hangUp();
            } catch (e) {}
          }
          await disposeLocalRenderer();
          await disposeRemoteRenderer();
        } catch (e) {
          // swallow
        }
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center items-center p-6">
      <div className="bg-white shadow-xl rounded-2xl p-6 w-full max-w-md space-y-5">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          🌐 Live Translated Video Call
        </h1>

        {/* Video Panels */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-black rounded-xl h-48 flex flex-col overflow-hidden">
            <p className="text-center p-1 text-gray-300">You</p>
            <div ref={localContainerRef} className="flex-1" />
          </div>

          <div className="bg-black rounded-xl h-48 flex flex-col overflow-hidden">
            <p className="text-center p-1 text-gray-300">Remote</p>
            <div ref={remoteContainerRef} className="flex-1" />
          </div>
        </div>

        {/* IDs & controls */}
        <section className="space-y-2">
          <div>
            <label className="text-sm font-medium">Bridge ID (same on both tabs)</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                className="border rounded-lg p-2 flex-1"
                placeholder="Enter or generate Bridge ID"
                value={bridgeId}
                onChange={(e) => setBridgeId(e.target.value)}
              />
              <button
                onClick={() => setBridgeId(uuidv4())}
                className="bg-gray-800 text-white px-3 rounded-lg"
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Group ID</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                className="border rounded-lg p-2 flex-1"
                placeholder="Enter or generate Group ID"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
              />
              <button
                onClick={() => setGroupId(uuidv4())}
                className="bg-gray-800 text-white px-3 rounded-lg"
              >
                Generate
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Leg:</label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={leg === "A"} onChange={() => setLeg("A")} />
              <span>A</span>
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={leg === "B"} onChange={() => setLeg("B")} />
              <span>B</span>
            </label>
          </div>
        </section>

        <hr />

        {/* Buttons */}
        <div className="space-y-2">
          <button
            onClick={createAcsUser}
            className="w-full py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            1️⃣ Create ACS User
          </button>

          <button
            onClick={initCallAgent}
            disabled={!token}
            className="w-full py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
          >
            2️⃣ Initialize Call Agent
          </button>

          <button
            onClick={joinCall}
            disabled={!callAgent || !groupId}
            className="w-full py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
          >
            3️⃣ Join Video Call
          </button>

          <button
            onClick={joinBot}
            disabled={!groupId || !bridgeId}
            className="w-full py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60"
          >
            4️⃣ Add Bot (this leg)
          </button>

          {call && (
            <button
              onClick={hangUp}
              className="w-full py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              🔚 Hang Up
            </button>
          )}
        </div>

        <p className="text-center text-gray-700 text-sm mt-3">
          <b>Status:</b> {status}
        </p>

        <div className="text-xs text-gray-500 mt-4 space-y-1">
          <p>🧩 Use same <b>Bridge ID</b> on both tabs.</p>
          <p>🎚 Each user has a different <b>Group ID</b>.</p>
          <p>🅰️ One tab = Leg A, 🅱️ Other tab = Leg B. Click “Add Bot” on both sides.</p>
        </div>
      </div>
    </div>
  );
}
