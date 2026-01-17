import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Mail } from "lucide-react";
import { ButtonLoading } from "./Loading";
import CheckingMail from "./chekingMail";
import EnterOtp from "./enterOtp";
import Success from "./success";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromSignup = location.state?.email || "";

  const [step, setStep] = useState(emailFromSignup ? "checking" : "email"); // email, checking, otp, success
  const [email] = useState(emailFromSignup);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleEnterManually = () => {
    setStep("otp");
  };

  const handleBackToEmail = () => {
    navigate("/signup");
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

  // Default view
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div
        className="absolute top-0 inset-0 z-0 opacity-10"
        style={{
          ...bgStyles,
        }}
      />
      <div className="w-full max-w-md z-10">
        <div className="flex justify-center mb-8">
          <div className="flex justify-center items-center w-10 h-10 bg-white rounded-lg">
            <Mail color="#4f38f7" strokeWidth={2} size={24} />
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl text-white font-semibold mb-3">
            Verify Your Email
          </h2>
          <p className="text-gray-400">
            We've sent a verification code to your email
          </p>
        </div>

        <div className="text-center text-gray-300 py-8">
          <p>Redirecting...</p>
        </div>
      </div>
    </div>
  );
}
