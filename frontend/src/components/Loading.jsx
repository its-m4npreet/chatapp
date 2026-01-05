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

export default Loading;
