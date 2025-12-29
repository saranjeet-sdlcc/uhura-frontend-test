import React, { useRef, useState } from "react";
import axios from "axios";
import { CallClient } from "@azure/communication-calling";

const BACKEND_URL = "http://localhost:8000";

const NewCallPanel = () => {
  const callClientRef = useRef(null);
  const callAgentRef = useRef(null);
  const callRef = useRef(null);

  const [token, setToken] = useState("");
  const [groupCallId, setGroupCallId] = useState("");
  const [status, setStatus] = useState("Idle");

  /* ============================
     Create ACS User + Token
  ============================ */
  const createUser = async () => {
    const res = await axios.post(`${BACKEND_URL}/acs/user`);
    setToken(res.data.token);
    setStatus("ACS User Created");
  };

  /* ============================
     Start Call (Caller)
  ============================ */
  const startCall = async () => {
    if (!token) return alert("Create ACS user first");

    const res = await axios.post(`${BACKEND_URL}/acs/call/start`);
    const callId = res.data.groupCallId;

    setGroupCallId(callId);

    await initializeCallAgent(token);
    joinCall(callId);

    setStatus("Call Started");
  };

  /* ============================
     Join Call (Receiver)
  ============================ */
  const joinExistingCall = async () => {
    if (!token || !groupCallId)
      return alert("Token & GroupCallId required");

    await initializeCallAgent(token);
    joinCall(groupCallId);

    setStatus("Joined Call");
  };

  /* ============================
     Initialize Call Agent
  ============================ */
  const initializeCallAgent = async (acsToken) => {
    callClientRef.current = new CallClient();

    callAgentRef.current = await callClientRef.current.createCallAgent(
      { token: acsToken },
      { displayName: "Test User" }
    );

    callAgentRef.current.on("incomingCall", async (incomingCall) => {
      callRef.current = await incomingCall.accept({
        audioOptions: { muted: false },
      });
    });
  };

  /* ============================
     Join Group Call
  ============================ */
  const joinCall = async (groupId) => {
    callRef.current = callAgentRef.current.join(
      { groupId },
      {
        audioOptions: {
          muted: false,
        },
      }
    );

    callRef.current.on("stateChanged", () => {
      console.log("Call state:", callRef.current.state);
    });

    callRef.current.on("remoteParticipantsUpdated", (e) => {
      e.added.forEach((p) => {
        p.audioStreams.forEach((stream) => {
          if (stream.isAvailable) {
            const audio = document.createElement("audio");
            audio.srcObject = stream.mediaStream;
            audio.autoplay = true;
            document.body.appendChild(audio);
          }
        });
      });
    });
  };

  /* ============================
     End Call
  ============================ */
  const endCall = async () => {
    if (callRef.current) {
      await callRef.current.hangUp();
      setStatus("Call Ended");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 space-y-4">
        <h2 className="text-xl font-bold text-center">
          Azure ACS Audio Call Test
        </h2>

        <div className="text-sm text-gray-600 text-center">
          Status: <span className="font-semibold">{status}</span>
        </div>

        <button
          onClick={createUser}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create ACS User
        </button>

        <button
          onClick={startCall}
          className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Start Call (Caller)
        </button>

        <input
          value={groupCallId}
          onChange={(e) => setGroupCallId(e.target.value)}
          placeholder="Enter Group Call ID"
          className="w-full border p-2 rounded-lg"
        />

        <button
          onClick={joinExistingCall}
          className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Join Call (Receiver)
        </button>

        <button
          onClick={endCall}
          className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          End Call
        </button>
      </div>
    </div>
  );
};

export default NewCallPanel;
