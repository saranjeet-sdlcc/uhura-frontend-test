import { useState, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import './App.css';
import WebSocketChat from './Websocket';

function App() {
  const [connection, setConnection] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState('');
  const [logs, setLogs] = useState([]);
  const connectionRef = useRef(null);

  // Add log function
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  // Connect with userId from input
  const connectToSignalR = async () => {
    if (!userId.trim()) {
      addLog('Please enter a User ID before connecting', 'error');
      return;
    }

    try {
      addLog(`Getting negotiate info for userId=${userId}...`, 'info');

      const negotiateResponse = await fetch('http://165.227.209.124:4002/signalr/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!negotiateResponse.ok) {
        throw new Error(`Negotiate failed: ${negotiateResponse.status} ${negotiateResponse.statusText}`);
      }

      const negotiateData = await negotiateResponse.json();
      addLog(`Negotiate success: ${JSON.stringify(negotiateData)}`, 'success');

      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(negotiateData.url, {
          accessTokenFactory: () => negotiateData.accessToken,
          transport: signalR.HttpTransportType.WebSockets
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Listen for messages
      newConnection.on('NewMessage', (message) => {
        addLog(`Received NewMessage: ${JSON.stringify(message)}`, 'success');
        setMessages(prev => [...prev, message]);
      });

      newConnection.onclose((error) => {
        addLog(`Connection closed: ${error?.message || 'no error'}`, 'error');
        setConnected(false);
        setConnection(null);
      });

      addLog('Starting SignalR connection...', 'info');
      await newConnection.start();

      addLog(`Connected! Connection ID: ${newConnection.connectionId}`, 'success');
      setConnection(newConnection);
      setConnected(true);
      connectionRef.current = newConnection;

    } catch (error) {
      addLog(`Connection failed: ${error.message}`, 'error');
      console.error('SignalR Connection Error:', error);
    }
  };

  // Disconnect
  const disconnect = async () => {
    if (connection) {
      try {
        await connection.stop();
        addLog('Disconnected successfully', 'info');
      } catch (error) {
        addLog(`Disconnect error: ${error.message}`, 'error');
      }
      setConnection(null);
      setConnected(false);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, []);

  return (
     <div className="min-h-screen bg-gray-100 text-gray-900 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-center text-blue-600">Azure SignalR Test Client</h1>

        {/* Connection Controls */}
        <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
          <h3 className="text-xl font-semibold">
            Status: 
            <span className={`ml-2 font-bold ${connected ? 'text-green-600' : 'text-red-600'}`}>
              {connected ? '✅ Connected' : '❌ Disconnected'}
            </span>
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="font-medium">User ID:</label>
            <input 
              type="text"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter your userId"
              disabled={connected}
            />
          </div>

          <div className="flex gap-4">
            <button 
              onClick={connectToSignalR}
              disabled={connected}
              className={`px-4 py-2 rounded font-semibold ${
                connected ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              Connect
            </button>

            <button 
              onClick={disconnect}
              disabled={!connected}
              className={`px-4 py-2 rounded font-semibold ${
                !connected ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Received Messages */}
        <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
          <h3 className="text-xl font-semibold">Received Messages ({messages.length})</h3>
          <div className="max-h-64 overflow-y-auto space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className="border border-gray-200 rounded-md p-4 bg-gray-50">
                <p><strong>From:</strong> {msg.senderId}</p>
                <p><strong>Content:</strong> {msg.content}</p>
                <p><strong>Time:</strong> {new Date(msg.createdAt).toLocaleString()}</p>
                <p><strong>Conversation:</strong> {msg.conversationId}</p>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-gray-500 italic">No messages received yet.</p>
            )}
          </div>
        </div>

        {/* Debug Logs */}
        <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Logs</h3>
            <button
              onClick={() => setLogs([])}
              className="text-sm text-red-600 hover:underline"
            >
              Clear Logs
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2 font-mono text-sm">
            {logs.map((log, i) => (
              <div 
                key={i} 
                className={`p-2 rounded border ${
                  log.type === 'error' 
                    ? 'bg-red-100 border-red-300 text-red-800'
                    : log.type === 'warn'
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
                    : 'bg-green-100 border-green-300 text-green-800'
                }`}
              >
                <span className="font-bold">[{log.timestamp}]</span> {log.message}
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-gray-500 italic">No logs yet.</p>
            )}
          </div>
        </div>
      </div>
<WebSocketChat />
    </div>
  );
}

export default App;
