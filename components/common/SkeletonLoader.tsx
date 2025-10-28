import React from 'react';

export const SkeletonLoader: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`relative overflow-hidden bg-surface-light rounded-lg ${className}`}>
      <div className="absolute inset-0 transform -translate-x-full bg-gradient-to-r from-transparent via-surface to-transparent animate-shimmer"></div>
    </div>
  );
};