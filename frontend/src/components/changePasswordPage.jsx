import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LockKeyholeOpen, ArrowLeft, Loader2, Mail } from "lucide-react";
import axios from "../lib/axios";

function ChangePasswordPage() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const [canResend, setCanResend] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Get current user email and send reset email on mount
    useEffect(() => {
        const sendResetEmail = async () => {
            try {
                const user = JSON.parse(localStorage.getItem("user") || "{}");
                
                if (!user?.email) {
                    setError("User email not found. Please log in again.");
                    setIsLoading(false);
                    return;
                }

                setUserEmail(user.email);

                // Auto-send reset email
                await axios.post("/user/send-reset-password-email", { email: user.email });

                setSuccess(true);
                setCanResend(false);
                setResendCooldown(60);
                setIsLoading(false);
            } catch (err) {
                const errorMessage = err.response?.data?.message || err.message || "An error occurred";
                
                // Custom message if email not found
                if (errorMessage.includes("not found") || errorMessage.toLowerCase().includes("user")) {
                    setError("You're not a registered user. Please sign up first to reset your password.");
                } else {
                    setError(errorMessage);
                }
                setIsLoading(false);
            }
        };

        sendResetEmail();
    }, []);

    // Cooldown timer for resend button
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => {
                setResendCooldown(resendCooldown - 1);
                if (resendCooldown === 1) {
                    setCanResend(true);
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleResend = useCallback(async () => {
        setIsLoading(true);
        setError("");

        try {
            await axios.post("/user/send-reset-password-email", { email: userEmail });

            setSuccess(true);
            setCanResend(false);
            setResendCooldown(60);
            setIsLoading(false);
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || "An error occurred";
            
            // Custom message if email not found
            if (errorMessage.includes("not found") || errorMessage.toLowerCase().includes("user")) {
                setError("You're not a registered user. Please sign up first to reset your password.");
            } else {
                setError(errorMessage);
            }
            setIsLoading(false);
        }
    }, [userEmail]);

    const handleBack = useCallback(() => {
        navigate(-1);
    }, [navigate]);

  return (
    <div className="min-h-screen flex items-start justify-center pt-20 p-4 relative">
      <div className="absolute top-0 inset-0 z-0 opacity-10" style={{
        backgroundImage: `linear-gradient(to right, #d1d5db 1px, transparent 1px), linear-gradient(to bottom, #d1d5db 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        WebkitMaskImage: "radial-gradient(ellipse 40% 50% at 50% 10%, #000 30%, transparent 70%)",
        maskImage: "radial-gradient(ellipse 40% 50% at 50% 10%, #000 30%, transparent 70%)",
      }} />
      
      <div className="w-full max-w-md z-10">
        {/* Loading State */}
        {isLoading && (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Loader2 size={48} className="animate-spin text-indigo-600" />
            </div>
            <h1 className="text-3xl font-semibold text-white mb-3">Sending Reset Link...</h1>
            <p className="text-gray-400">Preparing your password reset email</p>
          </div>
        )}

        {/* Success State */}
        {success && !isLoading && (
          <>
            <div className="flex justify-center mb-6">
              <div className="flex justify-center items-center w-16 h-16 bg-indigo-600/20 rounded-lg border border-indigo-500">
                <Mail className="w-8 h-8 text-indigo-400" />
              </div>
            </div>

            <h1 className="text-3xl font-semibold text-white text-center mb-3">
              Reset Link Sent!
            </h1>

            <p className="text-base text-gray-400 text-center mb-6">
              We've sent a password reset link to:
            </p>

            <div className="bg-indigo-600/20 border border-indigo-500 rounded-lg p-4 mb-8 text-center">
              <p className="text-indigo-300 font-medium break-all">{userEmail}</p>
            </div>

            <div className="bg-blue-600/20 border border-blue-500 rounded-lg p-4 mb-8">
              <p className="text-blue-300 text-sm">
                <strong>Next steps:</strong>
                <br/>
                1. Check your email inbox
                <br/>
                2. Click the "Reset Password" link
                <br/>
                3. Enter your new password
                <br/>
                4. Return to login with your new password
              </p>
            </div>

            <div className="space-y-3">
              {!canResend ? (
                <button
                  disabled
                  className="w-full bg-gray-600 text-white py-2.5 px-4 rounded-lg font-medium cursor-not-allowed opacity-50 flex items-center justify-center gap-2"
                >
                  Resend in {resendCooldown}s
                </button>
              ) : (
                <button
                  onClick={handleResend}
                  className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Resend Reset Link
                </button>
              )}

              <button
                onClick={handleBack}
                className="w-full  text-white py-2.5 px-4 rounded-lg font-medium hover:underline flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Settings
              </button>
            </div>
          </>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <>
            <div className="flex justify-center mb-6">
              <div className="flex justify-center items-center w-16 h-16 bg-red-600/20 rounded-lg border border-red-500">
                <LockKeyholeOpen className="w-8 h-8 text-red-400" />
              </div>
            </div>

            <h1 className="text-3xl font-semibold text-white text-center mb-3">
              Oops! Something went wrong
            </h1>

            <div className="bg-red-600/20 border border-red-500 rounded-lg p-4 mb-8">
              <p className="text-red-300 text-center">{error}</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Try Again
              </button>

              <button
                onClick={handleBack}
                className="w-full text-white py-2.5 px-4 rounded-lg font-medium hover:underline flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Settings
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default React.memo(ChangePasswordPage);
