// components/CallHistory.jsx
import { useState, useEffect } from 'react';

export default function CallHistory({ jwt, userId }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (jwt && userId) {
      fetchCallHistory();
    }
  }, [jwt, userId]);

  const fetchCallHistory = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`http://localhost:4005/calls/history?page=1&limit=20`, {
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setCalls(data.calls || []);
      } else {
        throw new Error(data.error || 'Failed to fetch call history');
      }
    } catch (err) {
      console.error('❌ Fetch call history error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return 'No answer';
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallIcon = (call) => {
    const isOutgoing = call.fromUserId === userId;
    
    if (call.status === 'missed') return '📞❌';
    if (call.status === 'declined') return '📞🚫'; 
    if (isOutgoing) return '📞📤';
    return '📞📥';
  };

  const getCallStatusColor = (status) => {
    switch (status) {
      case 'ended': return 'text-green-600';
      case 'missed': return 'text-red-600';
      case 'declined': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  if (loading && calls.length === 0) {
    return (
      <div className="space-y-4 p-4 bg-gray-50 rounded">
        <h3 className="text-lg font-semibold">📋 Call History</h3>
        <div className="text-center text-gray-600">Loading call history...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">📋 Call History</h3>
        <button
          onClick={fetchCallHistory}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
        >
          {loading ? '⟳' : '🔄'} Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {calls.length === 0 ? (
        <div className="text-center text-gray-500 py-4">
          No call history yet
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {calls.map((call) => {
            const isOutgoing = call.fromUserId === userId;
            const otherUserId = isOutgoing ? call.toUserId : call.fromUserId;
            
            return (
              <div key={call.callId} className="bg-white p-3 rounded border hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getCallIcon(call)}</span>
                    <div>
                      <div className="text-sm font-medium">
                        {isOutgoing ? 'To' : 'From'}: {otherUserId?.slice(0, 8)}...
                      </div>
                      <div className="text-xs text-gray-500">
                        {call.callType === 'video' ? '📹' : '🔊'} {call.callType}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-sm font-medium ${getCallStatusColor(call.status)}`}>
                      {call.status}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDuration(call.duration)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(call.startedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}