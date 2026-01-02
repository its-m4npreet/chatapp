import React, { useEffect, useState } from 'react';

export default function BackgroundSquares({ size = 3, spin = true, duration = 3 }) {
  const [activeBox, setActiveBox] = useState(0);
  const total = size * size;

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBox((prev) => (prev + 1) % total);
    }, 250);
    return () => clearInterval(interval);
  }, [total]);

  return (
    <div className={`grid grid-cols-${size} gap-3 rotate-45 ${spin ? 'animate-spin-slow' : ''}`}
      style={{ animationDuration: `${duration}s` }}>
      {[...Array(total)].map((_, i) => (
        <div
          key={i}
          className={`w-17 h-17 border rounded-lg cursor-pointer transition-colors duration-1000 ${i === activeBox ? 'border-white shadow-lg' : 'border-gray-500'}`}
          style={{ transition: 'border-color 0.2s, box-shadow 0.2s' }}
        ></div>
      ))}
      <style jsx>{`
        .animate-spin-slow { animation: spin ${duration}s linear infinite; }
      `}</style>
    </div>
  );
}
