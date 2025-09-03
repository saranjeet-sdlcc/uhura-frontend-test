import { useState, useEffect, useRef } from 'react';

const WebSocketChat = () => {
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [logs, setLogs] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addLog = (log) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`]);
  };

  const connect = () => {
    if (!userId.trim()) {
      alert('Please enter a User ID');
      return;
    }

    const websocket = new WebSocket('ws://165.227.209.124:4002/ws');
    
    websocket.onopen = () => {
      addLog('🟢 WebSocket connected');
      setWs(websocket);
      
      // Send connect message
      websocket.send(JSON.stringify({
        type: 'connect',
        userId: userId.trim()
      }));
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        addLog(`📨 Received: ${data.type}`);
        
        switch (data.type) {
          case 'connected':
            setConnected(true);
            addLog(`✅ Connected as ${data.userId}`);
            break;
            
          case 'messageReceived':
            setMessages(prev => [...prev, {
              ...data.message,
              direction: 'received'
            }]);
            addLog(`💬 Message from ${data.message.senderId}`);
            break;
            
          case 'messageSent':
            setMessages(prev => [...prev, {
              ...data.message,
              direction: 'sent'
            }]);
            addLog(`📤 Message sent successfully`);
            break;
            
          case 'error':
            addLog(`❌ Error: ${data.message}`);
            break;
            
          case 'pong':
            addLog('🏓 Pong received');
            break;
            
          default:
            addLog(`📋 ${data.type}: ${JSON.stringify(data)}`);
        }
      } catch (err) {
        addLog(`⚠️ Parse error: ${err.message}`);
      }
    };

    websocket.onclose = () => {
      addLog('🔴 WebSocket disconnected');
      setConnected(false);
      setWs(null);
    };

    websocket.onerror = (error) => {
      addLog(`💥 WebSocket error: ${error.message}`);
    };
  };

  const disconnect = () => {
    if (ws) {
      ws.close();
      setWs(null);
      setConnected(false);
    }
  };

  const sendMessage = () => {
    if (!connected || !ws) {
      alert('Not connected to WebSocket');
      return;
    }
    
    if (!recipientId.trim() || !message.trim()) {
      alert('Please enter recipient ID and message');
      return;
    }

    // payload need to send in 1 to 1
    const messageData = {
      type: 'sendMessage', // 1 to 1 chat ka route 
      senderId: userId.trim(), // khud ki
      recipientId: recipientId.trim(), // jise bejhna h message
      content: message.trim(),
      attachments: []
    };

    ws.send(JSON.stringify(messageData));
    setMessage('');
    addLog(`📤 Sending message to ${recipientId}`);
  };

  const sendPing = () => {
    if (ws && connected) {
      ws.send(JSON.stringify({ type: 'ping' }));
      addLog('🏓 Ping sent');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg mt-12">
      <h1 className="text-3xl font-bold text-center mb-6 text-blue-600">
        WebSocket Chat Client
      </h1>

      {/* Connection Section */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="flex items-center gap-4 mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
          {connected && <span className="text-gray-600">User: {userId}</span>}
        </div>
        
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter your user ID (e.g., user1)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={connected}
            />
          </div>
          <button
            onClick={connected ? disconnect : connect}
            className={`px-6 py-2 rounded-md font-medium ${
              connected 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {connected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      </div>

      {/* Send Message Section */}
      {connected && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-lg mb-3">Send Message</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recipient User ID
              </label>
              <input
                type="text"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                placeholder="Enter recipient ID (e.g., user2)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium"
            >
              Send
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={sendPing}
              className="px-4 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
            >
              Send Ping
            </button>
          </div>
        </div>
      )}

      {/* Messages Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Messages */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">Chat Messages</h3>
            <button
              onClick={clearMessages}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
            >
              Clear
            </button>
          </div>
          <div className="h-64 overflow-y-auto bg-white p-3 rounded border">
            {messages.length === 0 ? (
              <p className="text-gray-500 text-center">No messages yet...</p>
            ) : (
              messages.map((msg, index) => (
                <div
                  key={index}
                  className={`mb-3 p-3 rounded-lg max-w-xs ${
                    msg.direction === 'sent'
                      ? 'ml-auto bg-blue-500 text-white'
                      : 'mr-auto bg-gray-200 text-gray-800'
                  }`}
                >
                  <div className="text-xs opacity-75 mb-1">
                    {msg.direction === 'sent' ? 'You' : `From: ${msg.senderId}`}
                  </div>
                  <div className="break-words">{msg.content}</div>
                  <div className="text-xs opacity-75 mt-1">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Logs */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">Connection Logs</h3>
            <button
              onClick={clearLogs}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
            >
              Clear
            </button>
          </div>
          <div className="h-64 overflow-y-auto bg-black text-green-400 p-3 rounded text-sm font-mono">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <h4 className="font-semibold text-yellow-800 mb-2">Instructions:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>1. Enter your User ID and click Connect</li>
          <li>2. Open another browser tab/window with a different User ID</li>
          <li>3. Send messages between the users</li>
          <li>4. Messages are also sent via SignalR to your Azure SignalR clients</li>
        </ul>
      </div>
    </div>
  );
};

export default WebSocketChat;