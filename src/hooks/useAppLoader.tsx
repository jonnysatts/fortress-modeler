import { useState, useEffect } from 'react';

interface LoadingStep {
  message: string;
  duration: number;
}

const loadingSteps: LoadingStep[] = [
  { message: "Initializing Fortress...", duration: 300 },
  { message: "Loading database...", duration: 400 },
  { message: "Setting up components...", duration: 300 },
  { message: "Preparing models...", duration: 200 },
  { message: "Almost ready...", duration: 300 }
];

export const useAppLoader = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) return;

    const runLoadingSequence = async () => {
      // Skip loading sequence in development mode (for faster dev experience)
      if (import.meta.env.MODE === 'development') {
        await new Promise(resolve => setTimeout(resolve, 800));
        setProgress(100);
        setIsLoading(false);
        return;
      }

      let totalTime = 0;
      const maxTime = loadingSteps.reduce((sum, step) => sum + step.duration, 0);

      for (let i = 0; i < loadingSteps.length; i++) {
        setCurrentStep(i);
        
        const step = loadingSteps[i];
        const stepProgress = (totalTime / maxTime) * 100;
        setProgress(stepProgress);

        // Simulate loading time
        await new Promise(resolve => setTimeout(resolve, step.duration));
        totalTime += step.duration;
      }

      // Final progress
      setProgress(100);
      
      // Small delay before finishing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setIsLoading(false);
    };

    runLoadingSequence();
  }, [isLoading]);

  const currentMessage = loadingSteps[currentStep]?.message || "Loading...";

  return {
    isLoading,
    currentMessage,
    progress,
    setIsLoading
  };
};