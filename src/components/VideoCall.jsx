import React, { useEffect, useState, useRef } from 'react';
import { CallClient, LocalVideoStream, VideoStreamRenderer } from '@azure/communication-calling';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
// VideoStreamRenderer
const VideoCall = () => {
  // State
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [callAgent, setCallAgent] = useState(null);
  const [call, setCall] = useState(null);
  const [isCallConnected, setIsCallConnected] = useState(false);

  // Refs for UI rendering
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // 1. Fetch Token on Component Mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        // Fetch from your express backend
        const response = await fetch('http://localhost:4006/get-token');
        const data = await response.json();
        setToken(data.token);
        setUserId(data.userId);
        console.log("Token fetched for user:", data.userId);
      } catch (error) {
        console.error("Error fetching token:", error);
      }
    };
    fetchToken();
  }, []);

  // 2. Initialize Azure Call Agent when token is ready
  useEffect(() => {
    if (token) {
      const initCallAgent = async () => {
        try {
          const callClient = new CallClient();
          const tokenCredential = new AzureCommunicationTokenCredential(token);
          const agent = await callClient.createCallAgent(tokenCredential);
          setCallAgent(agent);
          console.log("Call Agent Initialized");
        } catch (error) {
          console.error("Failed to init call agent:", error);
        }
      };
      initCallAgent();
    }
  }, [token]);

  // 3. Function to Start Call (Echo Bot)
  const startCall = async () => {
    if (!callAgent) return;

    try {
      // Get local camera access
      const deviceManager = await new CallClient().getDeviceManager();
      await deviceManager.askDevicePermission({ video: true, audio: true });
      const cameras = await deviceManager.getCameras();
      
      // Create local video stream
      const localVideoStream = new LocalVideoStream(cameras[0]);
      
      // CALL THE ECHO BOT (Standard Test ID: 8:echo123)
      const callOptions = { videoOptions: { localVideoStreams: [localVideoStream] } };
      const currentCall = callAgent.startCall([{ id: '8:echo123' }], callOptions);
      
      setCall(currentCall);
      setIsCallConnected(true);

      // --- RENDER LOCAL VIDEO ---
      // We need a renderer to display the video stream in the DOM
      const localRenderer = new VideoStreamRenderer(localVideoStream);
      const localView = await localRenderer.createView({ scalingMode: 'Crop' });
      if (localVideoRef.current) {
        localVideoRef.current.appendChild(localView.target);
      }

      // --- HANDLE REMOTE PARTICIPANTS (The Echo Bot) ---
      currentCall.on('stateChanged', () => {
        console.log("Call state:", currentCall.state);
        if (currentCall.state === 'Disconnected') {
          setIsCallConnected(false);
          setCall(null);
          // Cleanup renderers here in production code
        }
      });

      currentCall.remoteParticipants.forEach(participant => {
        subscribeToRemoteParticipant(participant);
      });

      currentCall.on('remoteParticipantsUpdated', e => {
        e.added.forEach(participant => subscribeToRemoteParticipant(participant));
      });

    } catch (error) {
      console.error("Failed to start call:", error);
    }
  };

  // 4. Helper to Render Remote Video
  const subscribeToRemoteParticipant = (participant) => {
    // Subscribe to the video streams of the participant
    participant.videoStreams.forEach(stream => {
      renderRemoteStream(stream);
    });

    participant.on('videoStreamsUpdated', e => {
      e.added.forEach(stream => renderRemoteStream(stream));
    });
  };

  const renderRemoteStream = async (stream) => {
    if (stream.isAvailable) {
      const renderer = new VideoStreamRenderer(stream);
      const view = await renderer.createView({ scalingMode: 'Crop' });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.appendChild(view.target);
      }
    }
    
    // Listen if stream becomes available later (common in ACS)
    stream.on('availabilityChanged', async () => {
      if (stream.isAvailable) {
        const renderer = new VideoStreamRenderer(stream);
        const view = await renderer.createView({ scalingMode: 'Crop' });
        if (remoteVideoRef.current) {
          remoteVideoRef.current.innerHTML = ''; // Clear previous
          remoteVideoRef.current.appendChild(view.target);
        }
      }
    });
  };

  // 5. Function to End Call
  const endCall = () => {
    if (call) {
      call.hangUp({ forEveryone: true });
      setIsCallConnected(false);
      setCall(null);
      // Clean DOM
      if (localVideoRef.current) localVideoRef.current.innerHTML = '';
      if (remoteVideoRef.current) remoteVideoRef.current.innerHTML = '';
    }
  };

  // Needed for renderer class instantiation inside component
  // (In a real app, import { VideoStreamRenderer } from SDK, 
  // but sometimes it must be imported dynamically or used from the package)
  // const { VideoStreamRenderer } = require('@azure/communication-calling');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Azure Video Call Test</h1>
      
      {/* Video Container */}
      <div className="flex flex-row gap-4 mb-6 h-64 w-full max-w-4xl justify-center">
        
        {/* Local Video (You) */}
        <div 
          ref={localVideoRef} 
          className="w-1/2 bg-black rounded-lg overflow-hidden border-2 border-gray-300 relative"
        >
          <span className="absolute top-2 left-2 text-white bg-black/50 px-2 rounded text-xs z-10">You</span>
        </div>

        {/* Remote Video (Echo Bot) */}
        <div 
          ref={remoteVideoRef} 
          className="w-1/2 bg-black rounded-lg overflow-hidden border-2 border-blue-500 relative"
        >
           <span className="absolute top-2 left-2 text-white bg-black/50 px-2 rounded text-xs z-10">Echo Bot</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        {!isCallConnected ? (
          <button 
            onClick={startCall}
            disabled={!callAgent}
            className={`px-6 py-2 rounded text-white font-semibold ${callAgent ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            {callAgent ? "Start Test Call (Echo Bot)" : "Initializing..."}
          </button>
        ) : (
          <button 
            onClick={endCall}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold"
          >
            End Call
          </button>
        )}
      </div>
      
      <p className="mt-4 text-sm text-gray-500">
        Status: {callAgent ? "Agent Ready" : "Fetching Token..."} | UserID: {userId ? "Fetched" : "..."}
      </p>
    </div>
  );
}

export default VideoCall