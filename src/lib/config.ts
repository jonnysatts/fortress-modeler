interface AppConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  enableDemoData: boolean;
  enableAnalytics: boolean;
  enableDevTools: boolean;
  apiUrl: string;
  googleClientId: string;
  version: string;
  useCloudSync: boolean;
}

export const config: AppConfig = {
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',
  enableDemoData: import.meta.env.MODE === 'development' || import.meta.env.VITE_ENABLE_DEMO_DATA === 'true',
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  enableDevTools: import.meta.env.MODE === 'development',
  apiUrl: import.meta.env.VITE_API_URL || 'https://fortress-modeler-backend-928130924917.australia-southeast2.run.app',
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '928130924917-fcu6m854ua2ajutk3eu191okl4f29uqv.apps.googleusercontent.com',
  version: '1.0.0',
  useCloudSync: true // Re-enabled with proper UUID handling
};

export default config;