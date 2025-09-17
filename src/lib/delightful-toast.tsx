import { toast } from "sonner";
import { CheckCircle2, TrendingUp, Target, DollarSign, BarChart3, Users, Shield, Zap } from "lucide-react";

// Delightful toast messages with personality for financial modeling
export const delightfulToast = {
  // Success messages with financial personality
  success: {
    projectCreated: () => toast.success("Project launched!", {
      description: "Ready to turn your vision into financial reality",
      icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      duration: 4000,
    }),

    modelSaved: () => toast.success("Model locked and loaded!", {
      description: "Your financial projections are looking sharp",
      icon: <BarChart3 className="h-4 w-4 text-fortress-emerald" />,
      duration: 4000,
    }),

    actualsAdded: () => toast.success("Reality check complete!", {
      description: "Your actual data is making the models even smarter",
      icon: <Target className="h-4 w-4 text-green-600" />,
      duration: 4000,
    }),

    riskAssessed: () => toast.success("Risk radar activated!", {
      description: "Your project's defense systems are now stronger",
      icon: <Shield className="h-4 w-4 text-blue-600" />,
      duration: 4000,
    }),

    exportGenerated: () => toast.success("Export delivered!", {
      description: "Board-ready insights, hot off the press",
      icon: <Zap className="h-4 w-4 text-yellow-600" />,
      duration: 4000,
    }),

    forecastAccuracy: (accuracy: number) => {
      const isHighAccuracy = accuracy > 90;
      return toast.success(isHighAccuracy ? "Forecast wizard detected!" : "Solid forecast skills!", {
        description: isHighAccuracy 
          ? `${accuracy}% accuracy - You're practically predicting the future!`
          : `${accuracy}% accuracy - Your crystal ball is getting clearer`,
        icon: <TrendingUp className="h-4 w-4 text-fortress-emerald" />,
        duration: 5000,
      });
    },

    collaboration: (memberName: string) => toast.success("Team power activated!", {
      description: `${memberName} joined the financial modeling adventure`,
      icon: <Users className="h-4 w-4 text-purple-600" />,
      duration: 4000,
    }),

    profitMilestone: (amount: number) => toast.success("Profit milestone unlocked!", {
      description: `${amount.toLocaleString()} in projected profits - Ka-ching!`,
      icon: <DollarSign className="h-4 w-4 text-green-600" />,
      duration: 5000,
    }),
  },

  // Loading states with encouragement
  loading: {
    calculatingModel: () => toast.loading("Crunching the numbers...", {
      description: "Our financial algorithms are working their magic",
    }),

    generatingReport: () => toast.loading("Crafting your masterpiece...", {
      description: "Turning data into insights worth sharing",
    }),

    syncingData: () => toast.loading("Syncing with reality...", {
      description: "Making sure everything adds up perfectly",
    }),

    assessingRisk: () => toast.loading("Scanning the horizon...", {
      description: "Identifying opportunities and obstacles ahead",
    }),
  },

  // Error states that feel helpful, not harsh
  error: {
    validationError: (field: string) => toast.error("Oops, need a quick fix!", {
      description: `The ${field} field needs some attention`,
      icon: <CheckCircle2 className="h-4 w-4 text-red-600" />,
      duration: 5000,
    }),

    networkError: () => toast.error("Connection hiccup!", {
      description: "Our servers are having a coffee break. Try again in a moment",
      duration: 5000,
    }),

    calculationError: () => toast.error("Math machine malfunction!", {
      description: "Our calculators need a moment to recalibrate",
      duration: 5000,
    }),

    permissionError: () => toast.error("Access denied, but we're on it!", {
      description: "Looks like you need special clearance for this operation",
      duration: 5000,
    }),
  },

  // Special achievement toasts
  achievements: {
    firstProject: () => toast.success("Welcome to the modeling elite!", {
      description: "You've created your first project - the journey begins!",
      icon: <CheckCircle2 className="h-4 w-4 text-fortress-emerald" />,
      duration: 6000,
    }),

    perfectVariance: () => toast.success("Forecasting ninja level unlocked!", {
      description: "Your projections matched reality perfectly. Teach us your ways!",
      icon: <Target className="h-4 w-4 text-gold-500" />,
      duration: 6000,
    }),

    powerUser: () => toast.success("Fortress power user detected!", {
      description: "You've mastered advanced features. The models bow to your expertise!",
      icon: <Zap className="h-4 w-4 text-purple-600" />,
      duration: 6000,
    }),
  },
};

// Enhanced loading messages that rotate to keep things interesting
export const loadingMessages = [
  "Calculating financial futures...",
  "Optimizing your profit potential...", 
  "Balancing the books with precision...",
  "Forecasting tomorrow's success today...",
  "Turning assumptions into insights...",
  "Making spreadsheets jealous...",
  "Consulting our crystal ball...",
  "Teaching algorithms about business...",
  "Transforming data into wisdom...",
  "Building your financial fortress...",
];

export const getRandomLoadingMessage = () => 
  loadingMessages[Math.floor(Math.random() * loadingMessages.length)];