import { memo } from 'react';

interface SkeletonLoaderProps {
  variant?: 'card' | 'table' | 'chart' | 'text' | 'avatar' | 'dashboard';
  count?: number;
  className?: string;
}

const SkeletonLoader = memo(({ variant = 'card', count = 1, className = '' }: SkeletonLoaderProps) => {
  const baseSkeletonClass = "animate-pulse bg-muted rounded";

  const renderSkeleton = () => {
    switch (variant) {
      case 'dashboard':
        return (
          <div className="space-y-6 p-6">
            {/* Header */}
            <div className="space-y-2">
              <div className={`${baseSkeletonClass} h-8 w-64`} />
              <div className={`${baseSkeletonClass} h-4 w-96`} />
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`${baseSkeletonClass} h-32 p-4`}>
                  <div className="space-y-3">
                    <div className={`${baseSkeletonClass} h-4 w-20`} />
                    <div className={`${baseSkeletonClass} h-8 w-16`} />
                    <div className={`${baseSkeletonClass} h-3 w-24`} />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Chart Area */}
            <div className={`${baseSkeletonClass} h-64 w-full`} />
          </div>
        );

      case 'table':
        return (
          <div className="space-y-3">
            {/* Header */}
            <div className={`${baseSkeletonClass} h-10 w-full`} />
            {/* Rows */}
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex space-x-4">
                <div className={`${baseSkeletonClass} h-6 w-16`} />
                <div className={`${baseSkeletonClass} h-6 flex-1`} />
                <div className={`${baseSkeletonClass} h-6 w-20`} />
                <div className={`${baseSkeletonClass} h-6 w-24`} />
              </div>
            ))}
          </div>
        );

      case 'chart':
        return (
          <div className="space-y-4">
            <div className={`${baseSkeletonClass} h-6 w-32`} />
            <div className={`${baseSkeletonClass} h-64 w-full`} />
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className={`${baseSkeletonClass} h-4 w-full`} style={{ width: `${90 - i * 10}%` }} />
            ))}
          </div>
        );

      case 'avatar':
        return <div className={`${baseSkeletonClass} h-10 w-10 rounded-full`} />;

      default: // 'card'
        return (
          <div className={`${baseSkeletonClass} p-6 space-y-4`}>
            <div className="space-y-2">
              <div className={`${baseSkeletonClass} h-6 w-3/4`} />
              <div className={`${baseSkeletonClass} h-4 w-1/2`} />
            </div>
            <div className="space-y-2">
              <div className={`${baseSkeletonClass} h-4 w-full`} />
              <div className={`${baseSkeletonClass} h-4 w-5/6`} />
              <div className={`${baseSkeletonClass} h-4 w-4/6`} />
            </div>
          </div>
        );
    }
  };

  return (
    <div className={className}>
      {Array.from({ length: variant === 'dashboard' ? 1 : count }).map((_, i) => (
        <div key={i} className={variant !== 'dashboard' ? 'mb-4' : ''}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
});

SkeletonLoader.displayName = 'SkeletonLoader';

export default SkeletonLoader;