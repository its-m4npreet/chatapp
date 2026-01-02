import React, { useEffect, useState } from 'react';
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa';
import { Link} from 'react-router-dom';

export default function SignUp() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeBox, setActiveBox] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBox((prev) => (prev + 1) % 9);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Basic validation (already required in inputs, but double check)
    if (!username || !email || !password || password.length < 8) return;
    setLoading(true);
    // Simulate async signup
    await new Promise((res) => setTimeout(res, 1800));
    setLoading(false);
    console.log('Sign up attempted with:', { username, email, password });
  };

  return (
    <div className="w-250 grid grid-cols-1 lg:grid-cols-2 overflow-hidden h-screen ">
      {/* <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-5 left-0 w-64 h-64 bg-purple-900 rounded-full filter blur-3xl opacity-20 animate-float" />
        </div> */}
      {/* Left Side - Form */}
      <div className="flex items-center justify-center px-8 lg:px-16">
        
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-5xl font-bold text-white mb-3 tracking-tight">
              Create Account
            </h2>
            {/* <p className="text-slate-300 text-lg">
              Join us and get started today.
            </p> */}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                required
                className="w-full px-4 py-3.5 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-white transition-all duration-300"
              />
              <p className="mt-2 text-xs text-slate-400">
                Your unique username (letters, numbers, and underscores only)
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
                className="w-full px-4 py-3.5 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-white transition-all duration-300 pr-12"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  minLength={8}
                  className="w-full px-4 py-3.5 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-white transition-all duration-300 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FaRegEyeSlash size={22} /> : <FaRegEye size={22} />}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                At least 8 characters long
              </p>
            </div>

            <button
              type="submit"
              className={`w-full border border-white text-white font-semibold py-4 rounded-xl cursor-pointer transition-all duration-300 flex items-center justify-center gap-2 ${loading ? ' animate-pulse border-white' : 'focus:border-white'}`}
              disabled={loading}
            >
              {loading && (
                <span className="inline-block animate-spin rounded-full border-2 border-t-transparent border-white h-5 w-5"></span>
              )}
              {loading ? 'Creating...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <span className="text-slate-400 text-sm">
              Already have an account?{' '}
            </span>
            <Link to="" className="text-purple-300 font-medium hover:text-purple-200 underline-offset-4 hover:underline transition-all">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side - Animated 3D Cube Grid */}
      <div className="hidden lg:flex items-center justify-center relative overflow-hidden h-full min-h-100">
        <div className="relative">
          <div className="grid grid-cols-1 gap-6 scale-110 perspective-1000">
            <div className="rotate-45 animate-spin-slow">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className={`w-16 h-16 rounded-xl border-2 transition-all duration-700 transform-gpu ${
                    i === activeBox
                      ? 'border-purple-400 shadow-2xl shadow-purple-500/50 scale-110 translate-z-10 bg-purple-500/10'
                      : 'border-slate-600 bg-slate-800/20'
                  }`}
                  style={{
                    transform: i === activeBox ? 'translateZ(40px) scale(1.15)' : 'translateZ(0)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Floating accent orbs */}
          {/* <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-20 w-64 h-64 bg-purple-600 rounded-full filter blur-3xl opacity-20 animate-float" />
            <div className="absolute bottom-32 right-32 w-80 h-80 bg-pink-600 rounded-full filter blur-3xl opacity-10 animate-float-delayed" />
          </div> */}
        </div>
      </div>

      {/* Global Styles */}
      <style jsx global>{`
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
          0%, 100% {
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