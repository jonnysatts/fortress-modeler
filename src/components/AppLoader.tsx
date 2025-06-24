import { memo } from 'react';

interface AppLoaderProps {
  message?: string;
  progress?: number;
}

const AppLoader = memo(({ message = "Loading Fortress...", progress }: AppLoaderProps) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-fortress-blue via-fortress-lightBlue to-fortress-emerald flex items-center justify-center z-50">
      <div className="flex flex-col items-center space-y-8 p-8">
        {/* Fortress Logo/Icon */}
        <div className="relative">
          <div className="w-20 h-20 border-4 border-white/20 rounded-xl animate-pulse">
            <div className="w-full h-full bg-white/10 rounded-lg flex items-center justify-center">
              <svg
                className="w-10 h-10 text-white animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          </div>
          
          {/* Pulsing ring */}
          <div className="absolute -inset-2 border-2 border-white/30 rounded-xl animate-ping" />
        </div>

        {/* App Title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Fortress
          </h1>
          <p className="text-xl text-white/80 font-medium">
            Financial Modeler
          </p>
        </div>

        {/* Loading Message */}
        <div className="text-center">
          <p className="text-white/90 text-lg font-medium animate-pulse">
            {message}
          </p>
          
          {/* Progress Bar */}
          {progress !== undefined && (
            <div className="w-64 h-2 bg-white/20 rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-300 ease-out rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
        </div>

        {/* Animated dots */}
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 bg-white/60 rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>

        {/* Feature highlights */}
        <div className="text-center space-y-2 text-white/70 text-sm max-w-md">
          <div className="flex items-center justify-center space-x-2 animate-fade-in">
            <div className="w-2 h-2 bg-fortress-emerald rounded-full" />
            <span>Financial Modeling & Projections</span>
          </div>
          <div className="flex items-center justify-center space-x-2 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="w-2 h-2 bg-fortress-emerald rounded-full" />
            <span>Performance Analysis & Tracking</span>
          </div>
          <div className="flex items-center justify-center space-x-2 animate-fade-in" style={{ animationDelay: '1s' }}>
            <div className="w-2 h-2 bg-fortress-emerald rounded-full" />
            <span>Risk Assessment & Scenarios</span>
          </div>
        </div>
      </div>
    </div>
  );
});

AppLoader.displayName = 'AppLoader';

export default AppLoader;