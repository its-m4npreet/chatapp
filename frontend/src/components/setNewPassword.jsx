import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, LockKeyhole, Check, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const PASSWORD_REGEX = {
  special: /[!@#$%^&*(),.?":{}|<>]/,
  number: /\d/,
};

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

function SetNewPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const hasMinLength = useMemo(() => password.length >= 8, [password]);
  const hasSpecialChar = useMemo(() => PASSWORD_REGEX.special.test(password), [password]);
  const hasNumber = useMemo(() => PASSWORD_REGEX.number.test(password), [password]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (!hasMinLength || !hasSpecialChar || !hasNumber) {
      setError("Password does not meet requirements");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/user/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to reset password");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      const timer = setTimeout(() => navigate("/signin"), 3000);
      return () => clearTimeout(timer);
    } catch (err) {
      setError(err.message || "An error occurred");
      setIsLoading(false);
    }
  }, [password, confirmPassword, token, navigate, hasMinLength, hasSpecialChar, hasNumber]);

  const isMatch = useMemo(
    () => password.length > 0 && confirmPassword.length > 0 && password === confirmPassword,
    [password, confirmPassword]
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const bgStyles = useMemo(() => (isMobile ? BG_STYLES_MOBILE : BG_STYLES_DESKTOP), [isMobile]);

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <div
          className="absolute top-0 inset-0 z-0 opacity-10"
          style={{
            ...bgStyles,
          }}
        />
        <div className="w-full max-w-md z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600/20 rounded-full mb-6 border border-green-500">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-3xl font-semibold text-white mb-3">Password Reset Successful</h1>
          <p className="text-gray-400 mb-6">
            Your password has been successfully updated. Redirecting to login...
          </p>
          <div className="flex justify-center">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

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
            <LockKeyhole className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-semibold text-white mb-2">
            Set new password
          </h1>
          <p className="text-gray-400">
            Your new password must be different to previously used passwords.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-600/20 border border-red-500 rounded-lg">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-200 mb-1.5 text-start"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f38f7] focus:border-transparent placeholder-gray-400"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-200 mb-1.5 text-start"
            >
              Confirm password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f38f7] focus:border-transparent placeholder-gray-400"
            />
          </div>
          <div className="w-full flex justify-start mb-4">
            {password &&
              confirmPassword &&
              (isMatch ? (
                <span className="flex h-3 text-green-600 text-sm text-start">
                  Password Matched
                </span>
              ) : (
                <span className="flex h-3 text-red-500 text-sm text-start">
                  Password Not Matched
                </span>
              ))}
          </div>
          <div className="mb-6 space-y-2">
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-5 h-5 rounded-full ${hasMinLength ? "bg-green-500" : "bg-gray-200"}`}
              >
                {hasMinLength && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-sm text-gray-300`}>
                Must be at least 8 characters
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-5 h-5 rounded-full ${hasSpecialChar ? "bg-green-500" : "bg-gray-200"}`}
              >
                {hasSpecialChar && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-sm text-gray-300`}>
                Must contain one special character
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-5 h-5 rounded-full ${hasNumber ? "bg-green-500" : "bg-gray-200"}`}
              >
                {hasNumber && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-sm text-gray-300`}>
                Must contain one number
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isMatch || !hasMinLength || !hasSpecialChar || !hasNumber}
            className="w-full bg-[#4f38f7] text-white py-2.5 px-4 rounded-lg font-medium hover:bg-[#3b2d9c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 size={18} className="animate-spin" />}
            {isLoading ? "Saving..." : "Save"}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => navigate("/signin")}
            className="inline-flex items-center gap-2 text-sm text-gray-400 font-medium hover:text-gray-200 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to log in
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(SetNewPassword);
