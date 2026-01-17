import React, { useState, useEffect } from "react";
import { ArrowLeft, KeyRound } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Reset password for:", email);
  };

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
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-semibold text-white mb-2">
            Forgot password?
          </h1>
          <p className="text-gray-400">
            No worries, we'll send you reset instructions.
          </p>
        </div>

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
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f38f7] focus:border-transparent placeholder-gray-400"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#4f38f7] text-white py-2.5 px-4 rounded-lg font-medium hover:bg-[#6c50f9] transition-colors"
          >
            Reset password
          </button>
        </form>

        <div className="text-center">
          <button className="inline-flex items-center gap-2 text-sm text-gray-400 font-medium hover:underline hover:text-gray-200">
            <ArrowLeft className="w-4 h-4" />
            Back to Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
