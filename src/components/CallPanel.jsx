// components/CallPanel.jsx
import { useState, useEffect, useRef } from 'react';
import { CallClient } from '@azure/communication-calling';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import CallHistory from './CallHistory'; // ADD: Import CallHistory

export default function CallPanel({ jwt, userId, onCallStateChange }) {
  const [callAgent, setCallAgent] = useState(null);
  const [call, setCall] = useState(null);
  const [callState, setCallState] = useState('None'); // None, Connecting, Connected, Ringing, Disconnected
  const [acsToken, setAcsToken] = useState(null);
  const [acsUserId, setAcsUserId] = useState(null);
  const [targetUserId, setTargetUserId] = useState('');
  const [targetAcsUserId, setTargetAcsUserId] = useState('');
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Initialize ACS and get token
  useEffect(() => {
    if (jwt && userId) {
      initializeACS();
    }
  }, [jwt, userId]);

  const initializeACS = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🚀 Initializing ACS...');
      
      // Get ACS token from our backend
      const tokenResponse = await fetch('http://localhost:4005/acs/token', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      });

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.success) {
        throw new Error(tokenData.error || 'Failed to get ACS token');
      }

      console.log('✅ ACS Token received:', tokenData.data);
      setAcsToken(tokenData.data.token);
      setAcsUserId(tokenData.data.acsUserId);

      // Initialize Call Client
      const callClient = new CallClient();
      const tokenCredential = new AzureCommunicationTokenCredential(tokenData.data.token);
      const agent = await callClient.createCallAgent(tokenCredential);

      console.log('✅ Call Agent created');
      setCallAgent(agent);

      // Listen for incoming calls
      agent.on('incomingCall', async (args) => {
        console.log('📞 Incoming call received:', args);
        setIncomingCall(args.incomingCall);
        setIsIncomingCall(true);
        setCallState('Ringing');
      });

    } catch (err) {
      console.error('❌ ACS initialization error:', err);
      setError(`Failed to initialize calling: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get target user's ACS ID
  const getTargetAcsUserId = async (targetUserId) => {
    try {
      const response = await fetch(`http://localhost:4005/acs/user/${targetUserId}`, {
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'User not found');
      }

      return data.data.acsUserId;
    } catch (err) {
      console.error('❌ Error getting target ACS user:', err);
      throw err;
    }
  };

  // Start outgoing call
  const startCall = async () => {
    try {
      if (!callAgent || !targetUserId) {
        setError('Please enter target user ID');
        return;
      }

      setLoading(true);
      setError('');
      console.log('📞 Starting call to:', targetUserId);

      // Get target user's ACS ID
      const targetAcs = await getTargetAcsUserId(targetUserId);
      setTargetAcsUserId(targetAcs);

      console.log('🎯 Target ACS User ID:', targetAcs);

      // Start the call
      const callOptions = {
        videoOptions: isVideo ? {
          localVideoStreams: []
        } : undefined,
        audioOptions: {
          muted: false
        }
      };

      const newCall = callAgent.startCall([{ communicationUserId: targetAcs }], callOptions);
      setCall(newCall);
      setCallState('Connecting');

      // Listen to call state changes
      newCall.on('stateChanged', () => {
        console.log('📞 Call state changed:', newCall.state);
        setCallState(newCall.state);
        onCallStateChange?.(newCall.state);

        if (newCall.state === 'Connected') {
          handleCallConnected(newCall);
        } else if (newCall.state === 'Disconnected') {
          handleCallEnded();
        }
      });

    } catch (err) {
      console.error('❌ Start call error:', err);
      setError(`Failed to start call: ${err.message}`);
      setLoading(false);
    }
  };

  // Answer incoming call
  const answerCall = async () => {
    try {
      if (!incomingCall) return;

      console.log('✅ Answering call...');
      
      const callOptions = {
        videoOptions: isVideo ? {
          localVideoStreams: []
        } : undefined
      };

      const answeredCall = await incomingCall.accept(callOptions);
      setCall(answeredCall);
      setIsIncomingCall(false);
      setIncomingCall(null);
      setCallState('Connected');

      // Listen to call state changes
      answeredCall.on('stateChanged', () => {
        console.log('📞 Call state changed:', answeredCall.state);
        setCallState(answeredCall.state);
        onCallStateChange?.(answeredCall.state);

        if (answeredCall.state === 'Connected') {
          handleCallConnected(answeredCall);
        } else if (answeredCall.state === 'Disconnected') {
          handleCallEnded();
        }
      });

    } catch (err) {
      console.error('❌ Answer call error:', err);
      setError(`Failed to answer call: ${err.message}`);
    }
  };

  // Reject incoming call
  const rejectCall = async () => {
    try {
      if (incomingCall) {
        await incomingCall.reject();
        setIncomingCall(null);
        setIsIncomingCall(false);
        setCallState('None');
        console.log('❌ Call rejected');
      }
    } catch (err) {
      console.error('❌ Reject call error:', err);
    }
  };

  // End active call
  const endCall = async () => {
    try {
      if (call) {
        await call.hangUp();
        console.log('📞 Call ended');
      }
    } catch (err) {
      console.error('❌ End call error:', err);
    }
  };

  // Handle call connected
  const handleCallConnected = (connectedCall) => {
    console.log('✅ Call connected successfully');
    setLoading(false);
    
    // Handle remote video streams
    connectedCall.on('remoteParticipantsUpdated', (e) => {
      e.added.forEach((participant) => {
        participant.on('videoStreamsUpdated', (e) => {
          e.added.forEach((stream) => {
            if (stream.mediaStreamType === 'Video') {
              console.log('📹 Remote video stream added');
              // Handle remote video stream
              const renderer = new VideoStreamRenderer(stream);
              const view = renderer.createView();
              if (remoteVideoRef.current) {
                remoteVideoRef.current.appendChild(view.target);
              }
            }
          });
        });
      });
    });
  };

  // Handle call ended
  const handleCallEnded = () => {
    console.log('📞 Call ended');
    setCall(null);
    setCallState('None');
    setIsIncomingCall(false);
    setIncomingCall(null);
    setLoading(false);
    
    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.innerHTML = '';
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.innerHTML = '';
    }
  };

  // Toggle mute
  const toggleMute = async () => {
    try {
      if (call) {
        if (isMuted) {
          await call.unmute();
        } else {
          await call.mute();
        }
        setIsMuted(!isMuted);
      }
    } catch (err) {
      console.error('❌ Toggle mute error:', err);
    }
  };

  // Toggle video
  const toggleVideo = async () => {
    try {
      if (call) {
        if (isVideoOn) {
          await call.stopVideo();
        } else {
          // Start video logic would go here
          console.log('📹 Starting video...');
        }
        setIsVideoOn(!isVideoOn);
      }
    } catch (err) {
      console.error('❌ Toggle video error:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded">
        <h3 className="text-lg font-semibold">📞 Voice & Video Calling</h3>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mt-4">
            {error}
          </div>
        )}

        {/* ACS Status */}
        <div className="flex items-center space-x-2 mt-4">
          <div className={`w-3 h-3 rounded-full ${callAgent ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm">
            {callAgent ? `Ready to call (${acsUserId?.slice(-8)}...)` : 'Initializing...'}
          </span>
        </div>

        {/* Call State */}
        <div className="text-sm text-gray-600 mt-2">
          Status: <span className="font-semibold">{callState}</span>
        </div>

        {/* Incoming Call UI */}
        {isIncomingCall && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded mt-4">
            <h4 className="font-semibold text-blue-800 mb-2">📞 Incoming Call</h4>
            <div className="flex space-x-2">
              <button
                onClick={answerCall}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                ✅ Answer
              </button>
              <button
                onClick={rejectCall}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                ❌ Reject
              </button>
            </div>
          </div>
        )}

        {/* Outgoing Call UI */}
        {callState === 'None' && !isIncomingCall && (
          <div className="space-y-3 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">🎯 Call User ID</label>
              <input
                type="text"
                placeholder="Enter user ID to call"
                className="w-full border rounded px-3 py-2"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isVideo}
                  onChange={(e) => setIsVideo(e.target.checked)}
                  disabled={loading}
                />
                <span className="text-sm">📹 Video Call</span>
              </label>
            </div>

            <button
              onClick={startCall}
              disabled={!callAgent || loading || !targetUserId}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Calling...' : '📞 Start Call'}
            </button>
          </div>
        )}

        {/* Active Call Controls */}
        {call && callState === 'Connected' && (
          <div className="bg-green-50 border border-green-200 p-4 rounded mt-4">
            <h4 className="font-semibold text-green-800 mb-3">📞 Call Active</h4>
            
            <div className="flex space-x-2 mb-4">
              <button
                onClick={toggleMute}
                className={`flex-1 px-4 py-2 rounded ${
                  isMuted 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                {isMuted ? '🔇 Muted' : '🎤 Mute'}
              </button>
              
              {isVideo && (
                <button
                  onClick={toggleVideo}
                  className={`flex-1 px-4 py-2 rounded ${
                    isVideoOn 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  {isVideoOn ? '📹 Video On' : '📷 Video Off'}
                </button>
              )}
            </div>

            <button
              onClick={endCall}
              className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              📞 End Call
            </button>
          </div>
        )}

        {/* Video Elements */}
        {isVideo && (
          <div className="space-y-2 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">📹 Local Video</label>
              <div ref={localVideoRef} className="w-full h-32 bg-gray-200 rounded"></div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">📹 Remote Video</label>
              <div ref={remoteVideoRef} className="w-full h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        )}

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded mt-4">
            <div>User ID: {userId}</div>
            <div>ACS User ID: {acsUserId}</div>
            <div>Target User ID: {targetUserId}</div>
            <div>Target ACS ID: {targetAcsUserId}</div>
            <div>Call State: {callState}</div>
          </div>
        )}
      </div>

      {/* ADD: Call History Component */}
      <CallHistory jwt={jwt} userId={userId} />
    </div>
  );
}