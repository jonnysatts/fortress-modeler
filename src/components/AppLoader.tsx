import { memo, useEffect, useState } from 'react';
import { getRandomLoadingMessage } from '@/lib/delightful-toast';

interface AppLoaderProps {
  message?: string;
  progress?: number;
}

const AppLoader = memo(({ message = "Loading Fortress...", progress }: AppLoaderProps) => {
  const [currentMessage, setCurrentMessage] = useState(message);
  const [showConfetti, setShowConfetti] = useState(false);

  // Cycle through encouraging messages
  useEffect(() => {
    if (!progress || progress < 100) {
      const interval = setInterval(() => {
        setCurrentMessage(getRandomLoadingMessage());
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [progress]);

  // Show celebration when complete
  useEffect(() => {
    if (progress === 100) {
      setCurrentMessage("Welcome to your financial fortress!");
      setShowConfetti(true);
    }
  }, [progress]);
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-fortress-blue via-fortress-lightBlue to-fortress-emerald flex items-center justify-center z-50">
      <div className="flex flex-col items-center space-y-8 p-8">
        {/* Fortress Logo/Icon */}
        <div className="relative">
          <div className={`w-20 h-20 border-4 border-white/20 rounded-xl transition-all duration-500 ${
            progress === 100 ? 'animate-bounce scale-110' : 'animate-pulse'
          }`}>
            <div className="w-full h-full bg-white/10 rounded-lg flex items-center justify-center">
              {progress === 100 ? (
                <div className="text-2xl animate-bounce">🏰</div>
              ) : (
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
              )}
            </div>
          </div>
          
          {/* Pulsing ring with celebration effect */}
          <div className={`absolute -inset-2 border-2 rounded-xl ${
            progress === 100 
              ? 'border-white animate-ping' 
              : 'border-white/30 animate-ping'
          }`} />
          
          {/* Confetti effect */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-white rounded-full animate-bounce"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotate(${i * 60}deg) translateY(-40px)`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '2s'
                  }}
                />
              ))}
            </div>
          )}
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
          <p className={`text-white/90 text-lg font-medium transition-all duration-500 ${
            progress === 100 ? 'animate-bounce' : 'animate-pulse'
          }`}>
            {currentMessage}
          </p>
          
          {/* Progress Bar with celebration */}
          {progress !== undefined && (
            <div className="w-64 h-2 bg-white/20 rounded-full mt-4 overflow-hidden relative">
              <div 
                className={`h-full transition-all duration-300 ease-out rounded-full ${
                  progress === 100 
                    ? 'bg-gradient-to-r from-white via-fortress-emerald to-white animate-pulse' 
                    : 'bg-white'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
              {progress === 100 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse rounded-full" />
              )}
            </div>
          )}
        </div>

        {/* Animated dots with celebration */}
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                progress === 100 
                  ? 'bg-fortress-emerald animate-bounce scale-125' 
                  : 'bg-white/60 animate-bounce'
              }`}
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: progress === 100 ? '0.6s' : '1s'
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