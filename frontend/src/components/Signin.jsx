import React, { useEffect, useState } from 'react';
import { FaRegEye, FaRegEyeSlash } from 'react-icons/fa';

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
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden">
      <div className="p-12 flex flex-col justify-center ">
        <div className="mb-8">
          {/* Updated h2 with bolder font and refined style */}
          <h2 className="text-4xl font-semibold text-white mb-2 tracking-tight">
            Sign in
          </h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm text-white mb-2 ">Your email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@gmail.com"
              className="w-full border border-gray-400 rounded-lg px-4 py-3 text-white placeholder-gray-300 focus:outline-none focus:border-slate-600 transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm text-white">Password</label>
              <button type="button" className="text-sm text-white hover:text-slate-300 transition-colors">
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full  border border-gray-400 rounded-lg px-4 py-3 text-white placeholder-gray-300 focus:outline-none focus:border-white transition-colors pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <FaRegEyeSlash size={20} /> : <FaRegEye size={20} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-black hover:bg-[#060606] text-white font-medium py-3 rounded-lg transition-colors duration-200"
          >
            Sign in
          </button>
        </div>

        <div className="mt-8 text-center">
          <span className="text-slate-400 text-sm">Don't have an account? </span>
          <button className="text-white text-sm hover:underline">Sign up</button>
        </div>
      </div>

      {/* Right Side - Rubik's Cube Grid */}
      <div className="relative overflow-hidden min-h-96 lg:min-h-0 flex items-center justify-center">
<div className="grid grid-cols-3 gap-3">
    {[...Array(9)].map((_, i) => (
      <div
        key={i}
        className={`w-15 h-15 border rounded-lg cursor-pointer transition-colors duration-1000 ${
          i === activeBox ? 'border-white shadow-lg' : 'border-gray-500'
        }`}
        style={{ transition: 'border-color 0.2s, box-shadow 0.2s' }}
      ></div>
    ))}
  </div>
      </div>

      <style jsx>{`
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