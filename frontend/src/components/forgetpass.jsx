import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const REDIRECT_DELAY = 3000;

const BG_STYLES_MOBILE = {
  backgroundImage: `linear-gradient(to right, #d1d5db 1px, transparent 1px), linear-gradient(to bottom, #d1d5db 1px, transparent 1px)`,
  backgroundSize: "40px 40px",
  WebkitMaskImage: "radial-gradient(ellipse 100% 50% at 50% 10%, #000 30%, transparent 70%)",
  maskImage: "radial-gradient(ellipse 100% 50% at 50% 10%, #000 30%, transparent 70%)",
};

const BG_STYLES_DESKTOP = {
  backgroundImage: `linear-gradient(to right, #d1d5db 1px, transparent 1px), linear-gradient(to bottom, #d1d5db 1px, transparent 1px)`,
  backgroundSize: "40px 40px",
  WebkitMaskImage: "radial-gradient(ellipse 50% 50% at 50% 10%, #000 30%, transparent 70%)",
  maskImage: "radial-gradient(ellipse 50% 50% at 50% 10%, #000 30%, transparent 70%)",
};

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/user/send-reset-password-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || "Failed to send reset email";
        
        // Custom message if email not found
        if (errorMessage.includes("not found") || errorMessage.toLowerCase().includes("user")) {
          setError("You're not a registered user. Please sign up first to reset your password.");
        } else {
          setError(errorMessage);
        }
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      const timer = setTimeout(() => navigate("/signin"), REDIRECT_DELAY);
      return () => clearTimeout(timer);
    } catch (err) {
      setError(err.message || "An error occurred");
      setIsLoading(false);
    }
  }, [email, navigate]);

  const bgStyles = useMemo(() => (isMobile ? BG_STYLES_MOBILE : BG_STYLES_DESKTOP), [isMobile]);

  return (
    <div className="min-h-screen flex items-start justify-center pt-20 p-4 relative">
      <div
        className="absolute top-0 inset-0 z-0 opacity-10"
        style={{
          ...bgStyles,
        }}
      />
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12  bg-[#0b0e12] rounded-lg mb-4 border border-gray-700">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-semibold text-white mb-2">
            Forgot password?
          </h1>
          <p className="text-gray-400">
            No worries, we'll send you reset instructions.
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-600/20 border border-green-500 rounded-lg">
            <p className="text-green-400 text-sm text-center">
              Reset link sent to your email. Redirecting to login...
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-600/20 border border-red-500 rounded-lg">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="mb-6">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-start mb-1.5"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isLoading || success}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f38f7] focus:border-transparent placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || success}
            className="w-full bg-[#4f38f7] text-white py-2.5 px-4 rounded-lg font-medium hover:bg-[#6c50f9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 size={18} className="animate-spin" />}
            {isLoading ? "Sending..." : "Reset password"}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => navigate("/signin")}
            className="inline-flex items-center gap-2 text-sm text-gray-400 font-medium hover:underline hover:text-gray-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(ForgotPassword);
