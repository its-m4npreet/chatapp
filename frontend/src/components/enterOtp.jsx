import React, { useState, useRef, useEffect } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import axios from "../lib/axios";
import { ButtonLoading } from "./Loading";

export default function EnterOtp({ email, onBack, onSuccess }) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [isExpired, setIsExpired] = useState(false);
  const inputRefs = useRef([]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleChange = (index, value) => {
    if (value.length > 1) {
      value = value[0];
    }

    if (!/^\d*$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");
    const newCode = [...code];

    for (let i = 0; i < Math.min(pastedData.length, 6); i++) {
      newCode[i] = pastedData[i];
    }

    setCode(newCode);

    const nextEmptyIndex = newCode.findIndex((val) => !val);
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const fullCode = code.join("");
    
    if (fullCode.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post("/verify-otp", { 
        email, 
        otp: fullCode 
      });

      if (res.data && res.data.message) {
        onSuccess(res.data.user);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid OTP. Please try again."
      );
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError("");

    try {
      await axios.post("/send-otp", { email });
      setTimeLeft(600);
      setIsExpired(false);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      alert("OTP sent to your email");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to resend OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen flex justify-center pt-20 p-4 relative">
      <div
        className="absolute top-0 inset-0 z-0 opacity-10"
        style={{
          ...bgStyles,
        }}
      />
      <div className="w-full max-w-md z-10">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#4f38f7] hover:text-[#6c50f9] mb-6 transition"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-full mb-4">
            <Mail className="w-6 h-6 text-[#4f38f7]" />
          </div>
          <h1 className="text-3xl font-semibold text-white mb-2">
            Check your email
          </h1>
          <p className="text-gray-400">
            We sent a verification code to{" "}
            <span className="font-medium text-gray-300">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerify} className="mb-6">
          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isExpired || loading}
                className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f38f7] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            ))}
          </div>

          {/* Timer */}
          <div className="text-center mb-4 text-sm">
            {isExpired ? (
              <span className="text-red-400 font-semibold">OTP Expired</span>
            ) : (
              <span className="text-gray-400">
                Code expires in {formatTime(timeLeft)}
              </span>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm mb-4">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isExpired || code.join("").length !== 6}
            className="w-full bg-[#4f38f7] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#6c50f9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4f38f7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <ButtonLoading color="#ffffff" /> : "Verify email"}
          </button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-400 mb-4">
            Didn't receive the email?{" "}
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading || !isExpired}
              className="text-[#4f38f7] font-medium hover:text-[#6c50f9] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Click to resend
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
