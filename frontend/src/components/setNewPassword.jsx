import React, { useState, useEffect } from "react";
import { ArrowLeft, LockKeyhole, Check } from "lucide-react";
import { FaDiceFive } from "react-icons/fa";

export default function SetNewPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasNumber = /\d/.test(password);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (
      password === confirmPassword &&
      hasMinLength &&
      hasSpecialChar &&
      hasNumber
    ) {
      console.log("Password reset successful");
    }
  };

  const isMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const bgStyles = isMobile
    ? {
        backgroundImage: `
        linear-gradient(to right, #d1d5db 1px, transparent 1px),
        linear-gradient(to bottom, #d1d5db 1px, transparent 1px)
      `,
        backgroundSize: "40px 40px",
        WebkitMaskImage:
          "radial-gradient(ellipse 100% 50% at 50% 10%, #000 30%, transparent 70%)",
        maskImage:
          "radial-gradient(ellipse 100% 50% at 50% 10%, #000 30%, transparent 70%)",
      }
    : {
        backgroundImage: `
        linear-gradient(to right, #d1d5db 1px, transparent 1px),
        linear-gradient(to bottom, #d1d5db 1px, transparent 1px)
      `,
        backgroundSize: "40px 40px",
        WebkitMaskImage:
          "radial-gradient(ellipse 50% 50% at 50% 10%, #000 30%, transparent 70%)",
        maskImage:
          "radial-gradient(ellipse 50% 50% at 50% 10%, #000 30%, transparent 70%)",
      };

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
            className="w-full bg-[#4f38f7] text-white py-2.5 px-4 rounded-lg font-medium hover:bg-[#3b2d9c] transition-colors"
          >
            Save
          </button>
        </form>

        <div className="text-center">
          <button className="inline-flex items-center gap-2 text-sm text-gray-400 font-medium hover:text-gray-200 hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Back to log in
          </button>
        </div>
      </div>
    </div>
  );
}
