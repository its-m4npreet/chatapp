import React, { useState, useEffect } from "react";
import { BadgeCheckIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Success({ onContinue }) {
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

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

  const handleContinue = async () => {
    // User is already logged in after OTP verification, just navigate home
    if (onContinue) {
      onContinue();
    } else {
      navigate("/");
    }
  };

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
    <div className="min-h-screen flex justify-center pt-20 p-4 relative">
      <div
        className="absolute top-0 inset-0 z-0 opacity-10"
        style={{
          ...bgStyles,
        }}
      />
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#0b0e12] rounded-lg mb-4 border border-gray-700">
            <BadgeCheckIcon className="w-6 h-6 text-[#06ea06]" />
          </div>
          <h1 className="text-3xl font-semibold text-white mb-2">
            Email verified
          </h1>
          <p className="text-gray-400">
            Your email has been successfully verified. Click below to log in magically.
          </p>
        </div>

        <div className="mb-6">
          <button
            onClick={handleContinue}
            className="flex justify-center items-center w-full bg-[#4f38f7] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#6c50f9] transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
