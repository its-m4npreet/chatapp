import React, { useEffect, useState } from 'react';
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa';
import { Link } from 'react-router-dom';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeBox, setActiveBox] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBox((prev) => (prev + 1) % 9);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = () => {
    console.log('Sign in attempted with:', email);
  };

  return (
    <div className="w-250 grid grid-cols-1 lg:grid-cols-2 overflow-hidden   ">
      {/* left side  */}
      <div className="lg:max-w-3/4 lg:min-w-1/2 p-12 flex flex-col justify-center ">
        <div className="mb-8">
          {/* Updated h2 with bolder font and refined style */}
          <h2 className="text-5xl font-bold text-white mb-2 tracking-tight">
            Sign in
          </h2>
        </div>

        <form className="space-y-6">
          {/* <div>
            <label className="block text-sm text-white mb-2 ">Your email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@gmail.com"
              className="w-full border border-gray-400 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-slate-600 transition-colors"
            />
          </div> */}
          <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Your Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                className="w-full px-4 py-3.5 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-white transition-all duration-300"
              />
            </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm text-white">Password</label>
              <button type="button" className="text-sm text-white hover:text-slate-300 transition-colors cursor-pointer">
                Forgot password?
              </button>
            </div>
            {/* <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full  border border-gray-400 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-white transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <FaRegEyeSlash size={20} /> : <FaRegEye size={20} />}
              </button> */}
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

          </div>

          <button
            onClick={handleSubmit}
            className="w-full border border-slate-600 hover:border-white text-white font-medium py-3 rounded-lg transition-colors duration-200 cursor-pointer"
          >
            Sign in
          </button>
        </form>

        <div className="mt-8 text-center">
          <span className="text-slate-400 text-sm">Don't have an account? </span>
          <Link to="/signup" className="text-white text-sm hover:underline cursor-pointer">Sign up</Link>
        </div>
      </div>

      {/* Right Side - Rubik's Cube Grid */}
      <div className="relative overflow-hidden min-h-96 lg:min-h-0 flex items-center justify-center ">
<div className="grid grid-cols-3 gap-3 rotate-45 animate-spin-slow delay-1500">
    {[...Array(9)].map((_, i) => (
      <div
        key={i}
        className={`w-17 h-17 border rounded-lg cursor-pointer transition-colors duration-1000 ${
          i === activeBox ? 'border-white shadow-lg' : 'border-gray-500'
        }`}
        style={{ transition: 'border-color 0.2s, box-shadow 0.2s' }}
      ></div>
    ))}
  </div>
      </div>

      <style jsx>{`
          .animate-spin-slow { animation: spin 2s linear infinite; }
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-20px) translateX(10px); }
          66% { transform: translateY(10px) translateX(-10px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(15px) translateX(-15px); }
          66% { transform: translateY(-10px) translateX(10px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-15px) translateX(8px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 8s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 10s ease-in-out infinite; }
      `}</style>
    </div>
  );
}