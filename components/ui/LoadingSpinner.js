'use client';

import React from 'react';

export function LoadingSpinner({ message = 'Loading...', size = 'md' }) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 w-full min-h-[200px]">
      <div className={`animate-spin rounded-full border-t-blue-600 border-gray-200 ${sizeClasses[size] || sizeClasses.md}`}></div>
      {message && <p className="mt-3 text-sm text-gray-500 font-medium">{message}</p>}
    </div>
  );
}
