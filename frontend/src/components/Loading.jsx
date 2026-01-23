import React from 'react';

// Theme detection utility
const isDarkMode = () => {
  return localStorage.getItem('chatAppSettings') ? JSON.parse(localStorage.getItem('chatAppSettings')).darkMode : true;
};

// Custom CSS-based loading spinner (React 19 compatible)
const Spinner = ({ color = '#3b82f6', width = 40, height = 40 }) => (
  <div 
    className="animate-spin rounded-full border-2 border-t-transparent"
    style={{ 
      width: `${width}px`, 
      height: `${height}px`,
      borderColor: `${color}33`,
      borderTopColor: color
    }}
  />
);

const Loading = ({ 
  color = '#3b82f6', 
  size = 'medium',
  text = '',
  fullScreen = false,
  className = ''
}) => {
  const sizes = {
    small: { width: 24, height: 24 },
    medium: { width: 40, height: 40 },
    large: { width: 64, height: 64 },
  };

  const { width, height } = sizes[size] || sizes.medium;

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
        <Spinner color={color} width={width} height={height} />
        {text && <p className="text-gray-300 mt-4 text-sm">{text}</p>}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Spinner color={color} width={width} height={height} />
      {text && <p className="text-gray-400 mt-3 text-sm">{text}</p>}
    </div>
  );
};

// Preset loading components for common use cases
export const PageLoading = ({ text = 'Loading...' }) => (
  <div className={`h-full w-full flex items-center justify-center ${isDarkMode() ? 'bg-zinc-900' : 'bg-gray-100'}`}>
    <Loading size="large" text={text} />
  </div>
);

export const ContentLoading = ({ text = '' }) => (
  <div className={`py-8 flex items-center justify-center ${isDarkMode() ? '' : 'bg-white'}`}>
    <Loading size="medium" text={text} />
  </div>
);

export const ButtonLoading = ({ color = '#ffffff' }) => (
  <Spinner color={color} width={20} height={20} />
);

export const InlineLoading = ({ color = '#3b82f6' }) => (
  <Spinner color={color} width={16} height={16} />
);

// Skeleton loader for older messages (pagination)
export const MessageSkeletonLoader = ({ count = 3 }) => {
  const dark = isDarkMode();
  return (
    <div className="py-4 space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className={`flex ${idx % 2 === 0 ? 'justify-start' : 'justify-end'} mb-3`}>
          <div className={`max-w-[88vw] sm:max-w-md md:max-w-lg ${idx % 2 === 0 ? dark ? 'bg-gray-800' : 'bg-gray-300' : dark ? 'bg-blue-600' : 'bg-blue-400'} rounded-2xl p-3 animate-pulse`}>
            <div className={`h-4 ${idx % 2 === 0 ? dark ? 'bg-gray-700' : 'bg-gray-400' : dark ? 'bg-blue-700' : 'bg-blue-500'} rounded w-32`}></div>
            {idx % 3 === 0 && (
              <div className={`h-3 ${idx % 2 === 0 ? dark ? 'bg-gray-700' : 'bg-gray-400' : dark ? 'bg-blue-700' : 'bg-blue-500'} rounded w-24 mt-2`}></div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// Skeleton loader for friends list
export const FriendsSkeletonLoader = ({ count = 5 }) => {
  const dark = isDarkMode();
  return (
    <div className="py-2 space-y-2">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer animate-pulse transition-all duration-200 ${dark ? 'hover:bg-gray-700/80 bg-gray-800/50 hover:shadow-md' : 'hover:bg-gray-200 bg-gray-100 hover:shadow-md'}`}>
          {/* Avatar placeholder */}
          <div className={`w-10 h-10 rounded-full shrink-0 ${dark ? 'bg-gray-700' : 'bg-gray-400'}`}></div>
          {/* Chat info placeholder */}
          <div className="flex-1 min-w-0">
            {/* Name placeholder */}
            <div className={`h-4 rounded w-32 mb-2 ${dark ? 'bg-gray-700' : 'bg-gray-400'}`}></div>
            {/* Message preview placeholder */}
            <div className={`h-3 rounded w-24 ${dark ? 'bg-gray-700' : 'bg-gray-400'}`}></div>
          </div>
        </div>
      ))}
    </div>
  );
};


// Skeleton loader for groups list
export const GroupsSkeletonLoader = ({ count = 3 }) => {
  const dark = isDarkMode();
  return (
    <div className="py-2 space-y-2">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer animate-pulse transition-all duration-200 ${dark ? 'hover:bg-gray-700/80 bg-gray-800/50 hover:shadow-md' : 'hover:bg-gray-200 bg-gray-100 hover:shadow-md'}`}>
          {/* Group avatar placeholder */}
          <div className={`w-10 h-10 rounded-full shrink-0 ${dark ? 'bg-gray-700' : 'bg-gray-400'}`}></div>
          {/* Group info placeholder */}
          <div className="flex-1 min-w-0">
            {/* Group name placeholder */}
            <div className={`h-4 rounded w-40 mb-2 ${dark ? 'bg-gray-700' : 'bg-gray-400'}`}></div>
            {/* Members count placeholder */}
            <div className={`h-3 rounded w-20 ${dark ? 'bg-gray-700' : 'bg-gray-400'}`}></div>
          </div>
        </div>
      ))}
    </div>
  );
};


export default Loading;
