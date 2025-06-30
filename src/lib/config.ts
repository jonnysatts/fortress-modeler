interface AppConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  enableDemoData: boolean;
  enableAnalytics: boolean;
  enableDevTools: boolean;
  version: string;
}

export const config: AppConfig = {
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',
  enableDemoData: import.meta.env.MODE === 'development' || import.meta.env.VITE_ENABLE_DEMO_DATA === 'true',
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  enableDevTools: import.meta.env.MODE === 'development',
  version: '1.0.0',
};

export default config;