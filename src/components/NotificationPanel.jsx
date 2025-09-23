import { useState } from 'react';

export default function NotificationPanel({ jwt, userId, receivedNotifications, onClearReceived }) {
  const [notifications, setNotifications] = useState([]);
  const [testForm, setTestForm] = useState({
    recipientId: '',
    title: '',
    body: ''
  });
  const [isSending, setIsSending] = useState(false);

  const sendTestNotification = async () => {
    if (!testForm.recipientId) {
      alert('❌ Recipient ID is required');
      return;
    }

    setIsSending(true);
    
    try {
      const response = await fetch('http://localhost:4004/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          recipientId: testForm.recipientId,
          title: testForm.title || 'Test Notification',
          body: testForm.body || 'This is a test notification from Uhura'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Test notification sent successfully!');
        // Add to local notifications list for display
        setNotifications(prev => [{
          id: Date.now(),
          type: 'SENT',
          title: testForm.title || 'Test Notification',
          body: testForm.body || 'This is a test notification from Uhura',
          recipientId: testForm.recipientId,
          timestamp: new Date().toISOString(),
          status: 'sent'
        }, ...prev]);
        
        // Reset form
        setTestForm({ recipientId: '', title: '', body: '' });
      } else {
        throw new Error(result.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('❌ Send notification error:', error);
      alert(`❌ Failed to send notification: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (field, value) => {
    setTestForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <div className="space-y-6">
      {/* Test Notification Form */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-4 flex items-center">
          🧪 Test Notification
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient ID *
            </label>
            <input
              type="text"
              value={testForm.recipientId}
              onChange={(e) => handleInputChange('recipientId', e.target.value)}
              placeholder="Enter user ID to send notification to"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title (optional)
            </label>
            <input
              type="text"
              value={testForm.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Test Notification"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Body (optional)
            </label>
            <textarea
              value={testForm.body}
              onChange={(e) => handleInputChange('body', e.target.value)}
              placeholder="This is a test notification from Uhura"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={sendTestNotification}
            disabled={isSending}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              '📤 Send Test Notification'
            )}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 border rounded-lg p-4">
        <h3 className="font-semibold mb-3">⚡ Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleInputChange('recipientId', userId)}
            className="px-3 py-2 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200"
          >
            📱 Test to Self
          </button>
          <button
            onClick={() => setTestForm({
              recipientId: testForm.recipientId,
              title: 'Urgent Message',
              body: 'This is an urgent notification that requires immediate attention!'
            })}
            className="px-3 py-2 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
          >
            🚨 Urgent Template
          </button>
        </div>
      </div>

      {/* Notification History */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">📋 Notification History</h3>
          {notifications.length > 0 && (
            <button
              onClick={clearNotifications}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Clear All
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No notifications sent yet. Send a test notification to see it here.
          </p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="border border-gray-200 rounded-lg p-3 bg-gray-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </span>
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                        {notification.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      {notification.body}
                    </p>
                    <div className="text-xs text-gray-500">
                      To: {notification.recipientId} • {new Date(notification.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}