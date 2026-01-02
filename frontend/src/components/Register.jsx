import React, { useState } from 'react';

export default function Register({ onRegister, switchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Replace with real API call
      await new Promise((res) => setTimeout(res, 800));
      onRegister({ name, email, token: 'mock-jwt-token' });
    } catch (err) {
        console.log(err);
      setError('Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#17171a] px-2">
      <div className="w-full max-w-4xl h-full flex glass neon-border-blue animate-fade overflow-hidden">
        {/* Left: Form */}
        <div className="flex-1 flex flex-col justify-center px-8 py-10">
          <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-gray-100">Sign up</h1>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-1 text-left">Your name</label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-neon-blue"
                placeholder="Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-1 text-left">Your email</label>
              <input
                type="email"
                className="w-full px-4 py-2 rounded  text-gray-100 focus:outline-none focus:ring-2 focus:ring-neon-blue"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-1 text-left">Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 rounded  text-gray-100 focus:outline-none focus:ring-2 focus:ring-neon-blue"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
            <button
              type="submit"
              className="w-full mt-2 px-6 py-2  text-gray-100 font-semibold rounded shadow disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Sign up'}
            </button>
            <div className="mt-8 text-sm text-gray-400 text-center">
              Already have an account?{' '}
              <button type="button" className="text-neon-blue underline" onClick={switchToLogin}>
                Sign in
              </button>
            </div>
          </form>
        </div>
        {/* Right: Animated Cubes */}
        <div className="hidden md:flex flex-col items-center justify-center flex-1 bg-[#181c24] relative">
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 tracking-widest">comet</div>
          <div className="flex flex-wrap gap-6 justify-center items-center h-full w-full">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className={`w-14 h-14  rounded-lg shadow-lg border border-gray-700 animate-fade`}
                style={{
                  animationDelay: `${i * 0.15}s`,
                  boxShadow: `0 2px 16px 0 rgba(0,0,0,0.25), 0 0 8px 2px #00eaff22`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
