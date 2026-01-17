import React, { useState, useEffect } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function CheckingMail({ email, onEnterCodeManually, onBackToSignin }) {
  const [isMobile, setIsMobile] = useState(false);

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
          "radial-gradient(ellipse 40% 50% at 50% 10%, #000 30%, transparent 70%)",
        maskImage:
          "radial-gradient(ellipse 40% 50% at 50% 10%, #000 30%, transparent 70%)",
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
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="flex justify-center items-center w-12 h-12 bg-[#0b0e12] rounded-lg border">
            <Mail strokeWidth={2} className="text-white" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-semibold text-white text-center mb-3">
          Check your email
        </h1>

        {/* Description */}
        <p className="text-base text-gray-400 text-center mb-8">
          We sent a verification code to{" "}
          <span className="font-medium text-gray-300">{email}</span>
        </p>

        {/* Enter Code Manually Button */}
        <button
          onClick={onEnterCodeManually}
          className="w-full bg-[#4f38f7] text-white py-2.5 px-4 rounded-lg font-medium hover:bg-[#6c50f9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4f38f7] transition-colors mb-8"
        >
          Enter code manually
        </button>

        {/* Back to Login */}
        <div className="flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4 text-gray-200" />
          <button
            onClick={onBackToSignin}
            className="text-sm font-semibold text-gray-400 hover:text-gray-200 hover:underline"
          >
            Back to log in
          </button>
        </div>
      </div>
    </div>
  );
}
