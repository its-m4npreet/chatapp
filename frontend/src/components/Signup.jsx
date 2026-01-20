import React, { useState, useEffect } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import { ButtonLoading } from './Loading';
import { MessageCircleCode } from "lucide-react";
import GoogleAuthButton from "./GoogleAuthButton";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [isMobile , setIsMobile] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
    }, 300);
    return () => clearInterval(interval);
  }, []);

   useEffect(() => {
      const handleResize = () => {
        setIsMobile(window.innerWidth <= 768);
      };
  
      window.addEventListener('resize', handleResize);
      handleResize(); // Initial check
  
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password || password.length < 8) { setError("Please fill all fields correctly."); return; };
    setLoading(true);
    try {
      await axios.post("/signup", {
        name,
        email,
        password,
      });
      setLoading(false);
      // Redirect to OTP verification page with email
      navigate("/");
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || "Sign up failed. Please try again.");
    }
  };
  
   const bgStyles = isMobile ? {
          backgroundImage: `
        linear-gradient(to right, #d1d5db 1px, transparent 1px),
        linear-gradient(to bottom, #d1d5db 1px, transparent 1px)
      `,
          backgroundSize: "40px 40px",
          WebkitMaskImage:
            "radial-gradient(ellipse 100% 50% at 50% 10%, #000 30%, transparent 70%)",
          maskImage:
            "radial-gradient(ellipse 100% 50% at 50% 10%, #000 30%, transparent 70%)",
        } : {backgroundImage: `
        linear-gradient(to right, #d1d5db 1px, transparent 1px),
        linear-gradient(to bottom, #d1d5db 1px, transparent 1px)
      `,
          backgroundSize: "40px 40px",
          WebkitMaskImage:
            "radial-gradient(ellipse 50% 50% at 50% 10%, #000 30%, transparent 70%)",
          maskImage:
            "radial-gradient(ellipse 50% 50% at 50% 10%, #000 30%, transparent 70%)",};

  return (
    <>
    <div className="min-h-screen bg-[#0b0e12] flex items-center justify-center p-6 relative scrollbar-hide overflow-hidden">
      <div
        className="absolute top-0 inset-0 z-0 opacity-10"
        style={{
          ...bgStyles
        }}
      />
      <div className="w-full max-w-md z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex justify-center items-center w-10 h-10 bg-white rounded-lg">
            <MessageCircleCode color="#4f38f7" strokeWidth={2} />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl text-white font-semibold  mb-3">
            Join the conversation
          </h2>
          <p className="text-gray-400">
            Welcome! Create an account to start chatting.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium  mb-1.5 text-start"
            >
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4f38f7] focus:border-transparent"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium  mb-1.5 text-start"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4f38f7] focus:border-transparent"
            />
          </div>

          <div className="relative">
            <label
              htmlFor="password"
              className="block text-sm font-medium  mb-1.5 text-start"
            >
              Password
            </label>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className=" w-full px-3.5 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4f38f7] focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 bottom-0.5 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <FaRegEyeSlash size={22} />
              ) : (
                <FaRegEye size={22} />
              )}
            </button>
          </div>

          <buttonh
            onClick={handleSubmit}
            disabled={loading}
            className="flex justify-center items-center w-full bg-[#4f38f7] text-white py-2.5 px-4 rounded-lg font-medium hover:bg-[#6c50f9] focus:outline-none focus:ring-2 focus:ring-offset-2  transition-colors"
          >
            {" "}
            {loading && <ButtonLoading color="#ffffff" />}
            {loading ? "Creating..." : "Sign Up"}
          </buttonh>
          {error && <div className="text-red-400 text-sm mt-2">{error}</div>}

          {/* Divider */}
          <div>
            <div className="flex items-center my-6">
              <div className="grow border-t border-gray-600"></div>
              <span className="mx-4 text-gray-400">or</span>
              <div className="grow border-t border-gray-600"></div>
            </div>
          </div>

          <GoogleAuthButton 
            className="w-full"
            onSuccess={() => navigate("/")}
            onError={(err) => setError(err)}
          />
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-300 mt-8">
          Already have an account?{" "}
          <Link
            to="/signin"
            className="font-medium text-[#4f38f7] hover:text-[#6c50f9] transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
    </>
  );
}
