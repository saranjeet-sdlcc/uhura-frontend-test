export default function ConnectionForm({ jwt, setJwt, connectToSignalR, authData }) {
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`${label} copied to clipboard!`);
    }).catch(() => {
      alert(`Failed to copy ${label}`);
    });
  };

  return (
    <>
      {/* Display Auth Data if available */}
      {authData && (
        <div className="mb-6 p-4 bg-green-50 rounded border border-green-200">
          <h3 className="text-lg font-semibold mb-3 text-green-800">
            🎉 Authentication Successful!
          </h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                User ID
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-gray-100 p-2 rounded text-sm break-all">
                  {authData.user.userId}
                </code>
                <button
                  onClick={() => copyToClipboard(authData.user.userId, "User ID")}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Username
              </label>
              <div className="bg-gray-100 p-2 rounded text-sm">
                {authData.user.username}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Phone
              </label>
              <div className="bg-gray-100 p-2 rounded text-sm">
                {authData.user.phone}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                JWT Token
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-gray-100 p-2 rounded text-sm break-all max-h-20 overflow-y-auto">
                  {authData.token}
                </code>
                <button
                  onClick={() => copyToClipboard(authData.token, "JWT Token")}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          🔐 JWT Token {authData ? "(Auto-filled from authentication)" : ""}
        </label>
        <textarea
          rows={3}
          className="w-full border rounded px-3 py-2"
          value={jwt}
          onChange={(e) => setJwt(e.target.value)}
          placeholder={authData ? "Token auto-filled from authentication above" : "Paste your JWT token here"}
        />
      </div>
      <button
        onClick={connectToSignalR}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Connect to SignalR
      </button>
    </>
  );
}