import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import { Mail } from "lucide-react";
import { ButtonLoading } from "./Loading";
import CheckingMail from "./chekingMail";
import EnterOtp from "./enterOtp";
import Success from "./success";

export default function OtpAuthFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState("email"); // email, checking, otp, success
  const [email, setEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (!emailInput.trim()) {
      setError("Email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      await axios.post("/send-otp", { email: emailInput });
      setEmail(emailInput);
      setStep("checking");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleEnterManually = () => {
    setStep("otp");
  };

  const handleBackToEmail = () => {
    setStep("email");
    setEmailInput("");
    setError("");
  };

  const handleOtpSuccess = () => {
    setStep("success");
  };

  const handleBackFromOtp = () => {
    setStep("checking");
  };

  const handleLoginContinue = () => {
    navigate("/");
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

  // Render different screens based on step
  if (step === "checking") {
    return (
      <CheckingMail
        email={email}
        onEnterCodeManually={handleEnterManually}
        onBackToSignin={handleBackToEmail}
      />
    );
  }

  if (step === "otp") {
    return (
      <EnterOtp email={email} onBack={handleBackFromOtp} onSuccess={handleOtpSuccess} />
    );
  }

  if (step === "success") {
    return <Success email={email} onContinue={handleLoginContinue} />;
  }

  // Email input step
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div
        className="absolute top-0 inset-0 z-0 opacity-10"
        style={{
          ...bgStyles,
        }}
      />
      <div className="w-full max-w-md z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex justify-center items-center w-10 h-10 bg-white rounded-lg">
            <Mail color="#4f38f7" strokeWidth={2} size={24} />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl text-white font-semibold mb-3">
            Login with OTP
          </h2>
          <p className="text-gray-400">
            Enter your email to receive a one-time password
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSendOtp} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5 text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setError("");
              }}
              placeholder="Enter your email"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4f38f7] focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !emailInput.trim()}
            className="flex justify-center items-center w-full bg-[#4f38f7] text-white py-2.5 px-4 rounded-lg font-medium hover:bg-[#6c50f9] focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <ButtonLoading color="#ffffff" /> : "Send OTP"}
          </button>
        </form>

        {/* Back to regular login */}
        <div className="text-center mt-8">
          <button
            type="button"
            onClick={() => navigate("/signin")}
            className="text-sm font-medium text-[#4f38f7] hover:text-[#6c50f9] transition-colors"
          >
            Back to password login
          </button>
        </div>
      </div>
    </div>
  );
}
