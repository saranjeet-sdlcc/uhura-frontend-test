import { CallClient } from "@azure/communication-calling";
import axios from "axios";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

const BACKEND_URL = "http://localhost:4005"; // your backend URL

const CallPanel = () => {
  const [callClient, setCallClient] = useState(null);
  const [callAgent, setCallAgent] = useState(null);
  const [deviceManager, setDeviceManager] = useState(null);
  const [call, setCall] = useState(null);
  const [groupId, setGroupId] = useState("");
  const [acsUserId, setAcsUserId] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("Not connected");

  // 1️⃣ Create ACS user & token from backend
  const createAcsUser = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/create-acs-user`);
      setAcsUserId(res.data.acsUserId);
      setToken(res.data.token);
      setStatus("✅ ACS User Created");
    } catch (err) {
      console.error("Error creating ACS user:", err);
      setStatus("❌ Failed to create user");
    }
  };

  // 2️⃣ Initialize ACS call client
  const initCallAgent = async () => {
    try {
      if (!token) {
        alert("Create ACS user first");
        return;
      }

      const client = new CallClient();
      const tokenCredential = new AzureCommunicationTokenCredential(token);

      const agent = await client.createCallAgent(tokenCredential, {
        displayName: "User",
      });

      const dm = await client.getDeviceManager();
      await dm.askDevicePermission({ audio: true });

      setCallClient(client);
      setCallAgent(agent);
      setDeviceManager(dm);
      setStatus("✅ CallAgent Initialized");
    } catch (err) {
      console.error("Error initializing CallAgent:", err);
      setStatus("❌ Failed to init CallAgent");
    }
  };

  // 3️⃣ Join group call
  const joinCall = async () => {
    try {
      if (!callAgent) {
        alert("Initialize CallAgent first");
        return;
      }
      if (!groupId) {
        alert("Enter a groupId");
        return;
      }

      const callOptions = {
        audioOptions: { muted: false },
      };

      const newCall = callAgent.join({ groupId }, callOptions);

      // when call ends, reset state
      newCall.on("stateChanged", () => {
        console.log("Call state:", newCall.state);
        if (newCall.state === "Disconnected") {
          setStatus("📴 Call ended");
          setCall(null);
        }
      });

      setCall(newCall);
      setStatus("📞 Joined call successfully");
    } catch (err) {
      console.error("Error joining call:", err);
      setStatus("❌ Failed to join call");
    }
  };

  // 4️⃣ Add bot to the same call
  const addBot = async () => {
    try {
      if (!groupId) {
        alert("Enter groupId first");
        return;
      }
      await axios.post(`${BACKEND_URL}/join-bot`, { groupId });
      setStatus("🤖 Bot joined the call");
    } catch (err) {
      console.error("Error adding bot:", err);
      setStatus("❌ Failed to add bot");
    }
  };

  // 5️⃣ Hang up call
  const hangUpCall = async () => {
    try {
      if (call) {
        await call.hangUp();
        setCall(null);
        setStatus("📴 Call ended by user");
      } else {
        setStatus("⚠️ No active call");
      }
    } catch (err) {
      console.error("Error hanging up call:", err);
      setStatus("❌ Failed to hang up");
    }
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center space-y-4">
      <h1 className="text-xl font-semibold">Azure ACS Audio Call Test</h1>
      <div className="space-y-2 w-full max-w-sm">
        <button
          onClick={createAcsUser}
          className="w-full bg-blue-500 text-white rounded-lg py-2"
        >
          1️⃣ Create ACS User
        </button>

        <button
          onClick={initCallAgent}
          className="w-full bg-green-500 text-white rounded-lg py-2"
        >
          2️⃣ Initialize Call Agent
        </button>

        <input
          type="text"
          placeholder="Enter groupId (same for both users)"
          className="border w-full rounded-lg p-2"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
        />

        <button
          onClick={joinCall}
          className="w-full bg-purple-500 text-white rounded-lg py-2"
        >
          3️⃣ Join Call
        </button>

        <button
          onClick={addBot}
          className="w-full bg-orange-500 text-white rounded-lg py-2"
        >
          4️⃣ Add Bot
        </button>

        <button
          onClick={() => setGroupId(uuidv4())}
          className="p-2 bg-gray-700 text-white rounded w-full"
        >
          🔁 Generate Group ID
        </button>

        {call && (
          <button
            onClick={hangUpCall}
            className="w-full bg-red-600 text-white rounded-lg py-2 mt-2"
          >
            🔚 Hang Up Call
          </button>
        )}

        <p className="text-gray-700 text-sm text-center mt-2">
          Status: {status}
        </p>
      </div>
    </div>
  );
};

export default CallPanel;
