import React from 'react';

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
  <div className="h-full w-full flex items-center justify-center bg-zinc-900">
    <Loading size="large" text={text} />
  </div>
);

export const ContentLoading = ({ text = '' }) => (
  <div className="py-8 flex items-center justify-center">
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
export const MessageSkeletonLoader = ({ count = 3 }) => (
  <div className="py-4 space-y-3">
    {Array.from({ length: count }).map((_, idx) => (
      <div key={idx} className={`flex ${idx % 2 === 0 ? 'justify-start' : 'justify-end'} mb-3`}>
        <div className={`max-w-[88vw] sm:max-w-md md:max-w-lg ${idx % 2 === 0 ? 'bg-gray-800' : 'bg-blue-600'} rounded-2xl p-3 animate-pulse`}>
          <div className={`h-4 ${idx % 2 === 0 ? 'bg-gray-700' : 'bg-blue-700'} rounded w-32`}></div>
          {idx % 3 === 0 && (
            <div className={`h-3 ${idx % 2 === 0 ? 'bg-gray-700' : 'bg-blue-700'} rounded w-24 mt-2`}></div>
          )}
        </div>
      </div>
    ))}
  </div>
);

// Skeleton loader for friends list
export const FriendsSkeletonLoader = ({ count = 5 }) => (
  <div className="py-2 space-y-2">
    {Array.from({ length: count }).map((_, idx) => (
      <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 cursor-pointer animate-pulse bg-gray-800/50 transition-colors">
        {/* Avatar placeholder */}
        <div className="w-10 h-10 rounded-full bg-gray-700 shrink-0"></div>
        {/* Chat info placeholder */}
        <div className="flex-1 min-w-0">
          {/* Name placeholder */}
          <div className="h-4 bg-gray-700 rounded w-32 mb-2"></div>
          {/* Message preview placeholder */}
          <div className="h-3 bg-gray-700 rounded w-24"></div>
        </div>
      </div>
    ))}
  </div>
);

// Skeleton loader for groups list
export const GroupsSkeletonLoader = ({ count = 3 }) => (
  <div className="py-2 space-y-2">
    {Array.from({ length: count }).map((_, idx) => (
      <div key={idx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700 cursor-pointer animate-pulse bg-gray-800/50 transition-colors">
        {/* Group avatar placeholder */}
        <div className="w-10 h-10 rounded-full bg-gray-700 shrink-0"></div>
        {/* Group info placeholder */}
        <div className="flex-1 min-w-0">
          {/* Group name placeholder */}
          <div className="h-4 bg-gray-700 rounded w-40 mb-2"></div>
          {/* Members count placeholder */}
          <div className="h-3 bg-gray-700 rounded w-20"></div>
        </div>
      </div>
    ))}
  </div>
);

export default Loading;
