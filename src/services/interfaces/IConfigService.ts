/**
 * Configuration service interface for environment-based settings
 */
export interface IConfigService {
  /**
   * Get a configuration value by key
   */
  get<T = string>(key: string, defaultValue?: T): T;

  /**
   * Check if we're in development mode
   */
  isDevelopment(): boolean;

  /**
   * Check if we're in production mode
   */
  isProduction(): boolean;

  /**
   * Get the application environment
   */
  getEnvironment(): 'development' | 'production' | 'test';

  /**
   * Get database configuration
   */
  getDatabaseConfig(): {
    name: string;
    version: number;
  };

  /**
   * Get application metadata
   */
  getAppInfo(): {
    name: string;
    version: string;
    buildDate?: string;
  };
}