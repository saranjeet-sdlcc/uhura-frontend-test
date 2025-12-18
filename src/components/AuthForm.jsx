import { useState } from "react";
import CallPanel from "./CallPanel";
import VideoCall from "./VideoCall";
import BothCall from "./BothCall";

export default function AuthForm({ onAuthSuccess }) {
  const [countryCode, setCountryCode] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!countryCode || !phone || !code) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://localhost:4000/api/auth/verify-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            countryCode,
            phone,
            code,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "OTP verification failed");
      }

      // To:
      if (data.success && data.user && data.token) {
        onAuthSuccess(data);
      } else {
        throw new Error(data.message || "Invalid response structure");
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setError(err.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    // <div className="max-w-md mx-auto">
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Authenticate with OTP</h2>
        <p className="text-sm text-gray-600">
          Enter your country code, phone number, and OTP code to get JWT token
        </p>
      </div>

      <form onSubmit  ={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Country Code</label>
          <input
            type="text"
            placeholder="e.g., +91"
            className="w-full border rounded px-3 py-2"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <input
            type="text"
            placeholder="e.g., 5000000001"
            className="w-full border rounded px-3 py-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">OTP Code</label>
          <input
            type="text"
            placeholder="Enter OTP code"
            className="w-full border rounded px-3 py-2"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={loading}
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? "Verifying..." : "Verify OTP & Get Token"}
        </button>
      </form>
      <hr className="mt-12" />

      {/* <CallPanel /> */}
      {/* <VideoCall /> */}
      <BothCall />
    </div>
  );
}
