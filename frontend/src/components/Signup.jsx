import React, { useState, useEffect } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import axios from "../lib/axios";
import { ButtonLoading } from './Loading';

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeBox, setActiveBox] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBox((prev) => (prev + 1) % 9);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name || !email || !password || password.length < 8) return;
    setLoading(true);
    try {
      await axios.post("/signup", {
        name,
        email,
        password,
      });
      setLoading(false);
      navigate("/signin");
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || "Sign up failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 place-items-center lg:grid-cols-2 lg:place-items-stretch overflow-hidden">
      {/* Left Side - Form */}
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-16 lg:ml-35 py-8 sm:py-12">
        <div className="w-full">
          <div className="mb-6">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight">
              Create Account
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                className="w-full px-3 py-3 sm:px-4 sm:py-3.5 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-white transition-all duration-300"
              />
              <p className="mt-2 text-xs text-slate-400">
                Your display name
              </p>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                className="w-full px-3 py-3 sm:px-4 sm:py-3.5 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-white transition-all duration-300"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  minLength={8}
                  className="w-full px-3 py-3 sm:px-4 sm:py-3.5 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-white transition-all duration-300 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <FaRegEyeSlash size={20} />
                  ) : (
                    <FaRegEye size={20} />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                At least 8 characters long
              </p>
            </div>

            <button
              type="submit"
              className={`w-full border border-white text-white font-semibold py-3 sm:py-4 rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 ${
                loading ? "animate-pulse" : "focus:border-white"
              }`}
              disabled={loading}
            >
              {loading && <ButtonLoading color="#ffffff" />}
              {loading ? "Creating..." : "Sign Up"}
            </button>
            {error && (
              <div className="text-red-400 text-sm mt-2 wrap-break-words">{error}</div>
            )}
          </form>

          <div className="mt-6 sm:mt-8 text-center">
            <span className="text-slate-400 text-sm">
              Already have an account?{" "}
            </span>
            <Link
              to="/signin"
              className=" font-medium underline-offset-4 hover:underline transition-all"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Animated 3D Cube Grid (hidden on mobile) */}
      <div className="hidden lg:flex items-center justify-center relative overflow-hidden h-full min-h-100">
        <div className="relative flex">
          <div className="grid grid-cols-3 gap-6 items-center">
            <div className="rotate-45 animate-spin-slow">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl border-2 transition-all duration-700 transform-gpu ${
                    i === activeBox
                      ? "border-purple-400 shadow-2xl shadow-purple-500/50 scale-110 translate-z-10 bg-purple-500/10"
                      : "border-slate-600 bg-slate-800/20"
                  }`}
                  style={{
                    transform:
                      i === activeBox
                        ? "translateZ(40px) scale(1.15)"
                        : "translateZ(0)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Global Styles */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin 30s linear infinite;
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-30px) translateX(20px);
          }
        }
        .animate-float {
          animation: float 12s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 16s ease-in-out infinite reverse;
        }
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </div>
  );
}
